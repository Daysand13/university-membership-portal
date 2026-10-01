"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldError, FormAlert, Label, SavedNotice, inputClasses } from "@/components/ui/Common";
import { createReleaseAction } from "@/lib/actions/app-release-actions";
import { initialActionState } from "@/lib/actions/types";

/**
 * Recording a build of the Android app.
 *
 * Everything here comes off the build: EAS prints the version and build
 * number, the APK is uploaded to the association's own storage, and the
 * SHA-256 is taken from the file. The app checks that hash before it lets
 * Android near the download, so getting it wrong means every phone
 * refuses the update — which is the safe direction, but still worth
 * getting right first time.
 */
type UploadState =
  | { phase: "idle" }
  | { phase: "hashing" | "uploading"; name: string; progress: number }
  | { phase: "done"; name: string }
  | { phase: "error"; message: string };

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Sends the file straight to storage, reporting progress — fetch can't. */
function put(url: string, file: File, contentType: string, onProgress: (fraction: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("Content-Type", contentType);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`Storage refused the upload (${request.status}). Please try again.`));
    request.onerror = () => reject(new Error("The upload was interrupted. Check your connection and try again."));
    request.send(file);
  });
}

export function AppReleaseForm({ nextBuildNumber }: { nextBuildNumber: number }) {
  const [state, formAction, isPending] = useActionState(createReleaseAction, initialActionState);
  const fe = state.fieldErrors ?? {};

  // Controlled, so a refused save keeps what the upload filled in.
  const [version, setVersion] = useState("");
  const [apkUrl, setApkUrl] = useState("");
  const [sha256, setSha256] = useState("");
  const [sizeBytes, setSizeBytes] = useState("");
  const [upload, setUpload] = useState<UploadState>({ phase: "idle" });
  const busy = upload.phase === "hashing" || upload.phase === "uploading";

  /**
   * Choosing the APK does the rest: its SHA-256 is worked out here, from the
   * exact bytes about to be uploaded, and the file goes straight to the
   * association's storage. The address, hash and size then fill themselves
   * in — the three fields most worth not typing by hand, since a wrong hash
   * means every phone refuses the update.
   */
  async function chooseApk(file: File | undefined) {
    if (!file) return;
    if (!/\.apk$/i.test(file.name)) {
      setUpload({ phase: "error", message: "Choose the .apk file that EAS built." });
      return;
    }
    try {
      setUpload({ phase: "hashing", name: file.name, progress: 0 });
      const digest = hex(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()));

      const response = await fetch("/api/admin/app-releases/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filename: file.name, fileSize: file.size }),
      });
      const ticket = (await response.json().catch(() => null)) as
        | { ok: true; uploadUrl: string; apkUrl: string; contentType: string }
        | { ok: false; error: string }
        | null;
      if (!ticket || !ticket.ok) {
        setUpload({ phase: "error", message: ticket && !ticket.ok ? ticket.error : "We couldn't start the upload." });
        return;
      }

      setUpload({ phase: "uploading", name: file.name, progress: 0 });
      await put(ticket.uploadUrl, file, ticket.contentType, (progress) =>
        setUpload({ phase: "uploading", name: file.name, progress }),
      );

      setApkUrl(ticket.apkUrl);
      setSha256(digest);
      setSizeBytes(String(file.size));
      // "assn-1.1.0.apk" names its own version.
      const named = /(\d+\.\d+\.\d+)/.exec(file.name)?.[1];
      if (named && !version) setVersion(named);
      setUpload({ phase: "done", name: file.name });
    } catch (err) {
      setUpload({ phase: "error", message: err instanceof Error ? err.message : "The upload didn't finish." });
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      <SavedNotice state={state} isPending={isPending}>
        Saved. It is not offered to anybody until you publish it below.
      </SavedNotice>

      <div className="rounded-lg border-2 border-dashed border-primary-200 bg-primary-50/40 p-4">
        <Label htmlFor="release-file">Upload the APK</Label>
        <p id="release-file-help" className="mt-1 mb-3 text-xs text-slate">
          Choose the file EAS built. It goes to the association&apos;s own storage, and the address, SHA-256 and size
          below fill themselves in.
        </p>
        <input
          id="release-file"
          type="file"
          accept=".apk,application/vnd.android.package-archive"
          disabled={busy}
          aria-describedby="release-file-help release-file-status"
          onChange={(event) => void chooseApk(event.target.files?.[0])}
          className="block w-full text-sm text-slate file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary-800 file:text-white file:text-sm file:font-semibold hover:file:bg-primary-700"
        />
        <div id="release-file-status" role="status" aria-live="polite" className="mt-2 text-sm">
          {upload.phase === "hashing" && (
            <p className="flex items-center gap-1.5 text-slate">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Checking {upload.name}…
            </p>
          )}
          {upload.phase === "uploading" && (
            <>
              <p className="flex items-center gap-1.5 text-slate">
                <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Uploading {upload.name} —{" "}
                {Math.round(upload.progress * 100)}%
              </p>
              <div
                role="progressbar"
                aria-label="APK upload progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(upload.progress * 100)}
                className="mt-1.5 h-1.5 rounded-full bg-primary-100 overflow-hidden"
              >
                <div className="h-full bg-accent-500" style={{ width: `${Math.round(upload.progress * 100)}%` }} />
              </div>
            </>
          )}
          {upload.phase === "done" && (
            <p className="flex items-center gap-1.5 text-success font-semibold">
              <CheckCircle2 size={15} aria-hidden="true" /> {upload.name} uploaded. Check the version and build number,
              say what changed, and save.
            </p>
          )}
          {upload.phase === "error" && <p className="text-danger font-semibold">{upload.message}</p>}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="release-version" required>
            Version
          </Label>
          <input
            id="release-version"
            name="version"
            required
            placeholder="1.1.0"
            aria-describedby="release-version-help"
            className={inputClasses}
            value={version}
            onChange={(event) => setVersion(event.target.value)}
          />
          <p id="release-version-help" className="mt-1.5 text-xs text-slate">
            What people see. Three numbers: bigger changes on the left.
          </p>
          <FieldError messages={fe.version} />
        </div>

        <div>
          <Label htmlFor="release-build" required>
            Build number
          </Label>
          <input
            id="release-build"
            name="buildNumber"
            type="number"
            min={nextBuildNumber}
            defaultValue={nextBuildNumber}
            required
            aria-describedby="release-build-help"
            className={inputClasses}
          />
          <p id="release-build-help" className="mt-1.5 text-xs text-slate">
            Android&apos;s own counter, and it only ever goes up. It refuses to install over a newer build.
          </p>
          <FieldError messages={fe.buildNumber} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="release-url" required>
            Where the APK is
          </Label>
          <input
            id="release-url"
            name="apkUrl"
            type="url"
            required
            placeholder="https://files.example.org/assn/assn-1.1.0.apk"
            aria-describedby="release-url-help"
            className={inputClasses}
            value={apkUrl}
            onChange={(event) => setApkUrl(event.target.value)}
          />
          <p id="release-url-help" className="mt-1.5 text-xs text-slate">
            Filled in by the upload above. Must be https — and the association&apos;s own storage rather than
            somebody else&apos;s.
          </p>
          <FieldError messages={fe.apkUrl} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="release-sha" required>
            SHA-256 of the file
          </Label>
          <input
            id="release-sha"
            name="sha256"
            required
            maxLength={64}
            placeholder="64 hexadecimal characters"
            aria-describedby="release-sha-help"
            className={`${inputClasses} font-data`}
            value={sha256}
            onChange={(event) => setSha256(event.target.value.trim().toLowerCase())}
          />
          <p id="release-sha-help" className="mt-1.5 text-xs text-slate">
            Worked out from the file by the upload above. The app checks every download against this and discards
            anything that doesn&apos;t match.
          </p>
          <FieldError messages={fe.sha256} />
        </div>

        <div>
          <Label htmlFor="release-size" required>
            Size in bytes
          </Label>
          <input
            id="release-size"
            name="sizeBytes"
            type="number"
            min={1}
            required
            className={inputClasses}
            value={sizeBytes}
            onChange={(event) => setSizeBytes(event.target.value)}
          />
          <p className="mt-1.5 text-xs text-slate">So the app can say how big the download is before starting it.</p>
          <FieldError messages={fe.sizeBytes} />
        </div>

        <div>
          <Label htmlFor="release-min-sdk">Oldest Android</Label>
          <input
            id="release-min-sdk"
            name="minAndroidSdk"
            type="number"
            defaultValue={26}
            className={inputClasses}
          />
          <p className="mt-1.5 text-xs text-slate">26 is Android 8. Phones older than this are not offered it.</p>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="release-changelog" required>
            What changed
          </Label>
          <textarea
            id="release-changelog"
            name="changelog"
            rows={3}
            required
            placeholder="Faster news feed. Fixed a problem signing in with an index number."
            className={inputClasses}
          />
          <p className="mt-1.5 text-xs text-slate">
            Shown in the update prompt. Write it for a member, not a developer.
          </p>
          <FieldError messages={fe.changelog} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="release-minimum">Stop older versions working below build</Label>
          <input
            id="release-minimum"
            name="minimumBuild"
            type="number"
            min={0}
            defaultValue={0}
            aria-describedby="release-minimum-help"
            className={inputClasses}
          />
          <p id="release-minimum-help" className="mt-1.5 text-xs text-slate">
            Leave at 0 unless you mean it. Anything below this number is stopped until the person updates — which
            also stops somebody on a poor connection in the middle of what they were doing. It is for a security
            fix, or a change that breaks the old app&apos;s requests, and nothing else.
          </p>
          <FieldError messages={fe.minimumBuild} />
        </div>
      </div>

      <Button type="submit" disabled={isPending || busy}>
        {isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
        {isPending ? "Saving…" : busy ? "Waiting for the upload…" : "Save this release"}
      </Button>
      <p className="text-xs text-slate">
        Saving does not offer it to anybody. Publishing it below is a separate step.
      </p>
    </form>
  );
}
