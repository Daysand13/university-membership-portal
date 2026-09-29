"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
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
export function AppReleaseForm({ nextBuildNumber }: { nextBuildNumber: number }) {
  const [state, formAction, isPending] = useActionState(createReleaseAction, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      <SavedNotice state={state} isPending={isPending}>
        Saved. It is not offered to anybody until you publish it below.
      </SavedNotice>

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
          />
          <p id="release-url-help" className="mt-1.5 text-xs text-slate">
            Must be https. Upload the APK to the association&apos;s own storage rather than linking to somebody
            else&apos;s.
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
          />
          <p id="release-sha-help" className="mt-1.5 text-xs text-slate">
            Run <code className="font-data">sha256sum assn-1.1.0.apk</code> on the file you uploaded, and paste the
            result. The app checks the download against this and discards anything that doesn&apos;t match.
          </p>
          <FieldError messages={fe.sha256} />
        </div>

        <div>
          <Label htmlFor="release-size" required>
            Size in bytes
          </Label>
          <input id="release-size" name="sizeBytes" type="number" min={1} required className={inputClasses} />
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

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
        {isPending ? "Saving…" : "Save this release"}
      </Button>
      <p className="text-xs text-slate">
        Saving does not offer it to anybody. Publishing it below is a separate step.
      </p>
    </form>
  );
}
