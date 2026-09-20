"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { CheckCircle2, ImagePlus, Loader2, X } from "lucide-react";
import { uploadAdminFile } from "@/lib/client/admin-upload";
import { loadImageDescriptionAction, saveImageDescriptionAction } from "@/lib/actions/image-description-actions";
import { MAX_IMAGE_DESCRIPTION } from "@/lib/services/image-description-constants";
import type { MediaCategory } from "@/generated/prisma/client";

function progressLabel(progress: number | null): string {
  return progress !== null && progress > 0 ? `Uploading… ${Math.round(progress * 100)}%` : "Uploading…";
}

/**
 * What the picture shows, in words, for anyone who can't see it — read out
 * by a screen reader in place of the picture.
 *
 * It saves itself against the picture rather than travelling with the form
 * around it, so one description covers the picture wherever it's used and
 * describing an older picture doesn't mean re-saving the article.
 */
function ImageDescriptionField({ url, label }: { url: string; label: string }) {
  const fieldId = useId();
  const [description, setDescription] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  // A picture that already has a description shows it, so it can be read
  // and corrected rather than silently replaced.
  useEffect(() => {
    let current = true;
    loadImageDescriptionAction(url)
      .then((existing) => {
        if (!current) return;
        setDescription(existing);
        setSaved(existing);
      })
      .catch(() => {
        /* Nothing on record to show; the box starts empty. */
      });
    return () => {
      current = false;
    };
  }, [url]);

  function save() {
    const next = description.trim();
    if (next === (saved ?? "")) return;
    startSaving(async () => {
      try {
        const outcome = await saveImageDescriptionAction({ url, description: next });
        if (outcome.ok) {
          setSaved(next);
          setError(null);
        } else {
          setError(outcome.error);
        }
      } catch {
        setError("That description couldn't be saved. Try again.");
      }
    });
  }

  return (
    <div className="mt-3">
      <label htmlFor={fieldId} className="block text-sm font-medium text-primary-950">
        Describe this picture
      </label>
      <p id={`${fieldId}-help`} className="text-xs text-slate mt-0.5 mb-1.5">
        Say what is happening in it, for people using a screen reader — for example &ldquo;The association&apos;s
        secretary in a meeting with the board&rdquo;. Leave it blank if the picture is only decoration.
      </p>
      <textarea
        id={fieldId}
        aria-describedby={`${fieldId}-help`}
        rows={2}
        maxLength={MAX_IMAGE_DESCRIPTION}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={save}
        placeholder={`What does this ${label.toLowerCase()} show?`}
        className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink placeholder:text-slate-light focus:outline-none focus:ring-2 focus:ring-primary-300"
      />
      <p role="status" className="text-xs mt-1 min-h-[1lh]">
        {isSaving ? (
          <span className="text-slate inline-flex items-center gap-1">
            <Loader2 size={12} aria-hidden="true" className="animate-spin" /> Saving the description…
          </span>
        ) : error ? (
          <span className="text-danger">{error}</span>
        ) : saved && saved === description.trim() ? (
          <span className="text-success inline-flex items-center gap-1">
            <CheckCircle2 size={12} aria-hidden="true" /> Description saved.
          </span>
        ) : null}
      </p>
    </div>
  );
}

export function ImageUploadField({
  name,
  category,
  label,
  defaultUrl,
  aspect = "aspect-video",
}: {
  name: string;
  category: MediaCategory;
  label: string;
  defaultUrl?: string | null;
  aspect?: string;
}) {
  const [url, setUrl] = useState<string | null>(defaultUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError(null);
    setProgress(0);
    startTransition(async () => {
      const outcome = await uploadAdminFile({
        file,
        kind: "image",
        category,
        onProgress: setProgress,
      });
      setProgress(null);
      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }
      setUrl(outcome.publicUrl);
    });
  }

  const percent = progress !== null ? Math.round(progress * 100) : 0;

  return (
    <div>
      <p className="block text-sm font-medium text-primary-950 mb-1.5">{label}</p>
      <input type="hidden" name={name} value={url ?? ""} />
      <div
        className={`relative ${aspect} w-full rounded-md border border-dashed border-line bg-surface-muted overflow-hidden flex items-center justify-center`}
      >
        {url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
            {!isPending && (
              <button
                type="button"
                onClick={() => setUrl(null)}
                aria-label="Remove image"
                className="absolute top-2 right-2 p-1.5 rounded-full bg-primary-950/70 text-white hover:bg-danger"
              >
                <X size={14} />
              </button>
            )}
            {isPending && (
              // Replacing an image used to show no sign of activity at all
              // over the existing picture, which read as "nothing happened".
              <div className="absolute inset-0 bg-primary-950/60 flex flex-col items-center justify-center gap-2 text-white">
                <Loader2 size={22} className="animate-spin" />
                <span className="text-xs font-semibold">{progressLabel(progress)}</span>
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-2 text-slate hover:text-primary-700 py-8"
          >
            {isPending ? <Loader2 size={22} className="animate-spin" /> : <ImagePlus size={22} />}
            <span className="text-xs font-medium">{isPending ? progressLabel(progress) : "Click to upload an image"}</span>
          </button>
        )}
        {isPending && (
          <div
            role="progressbar"
            aria-label={`Uploading ${label}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="absolute left-0 right-0 bottom-0 h-1 bg-primary-100"
          >
            <div className="h-full bg-accent-500 transition-[width] duration-200" style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {url && (
        <>
          <button
            type="button"
            disabled={isPending}
            onClick={() => inputRef.current?.click()}
            className="text-xs font-semibold text-primary-800 hover:text-accent-600 mt-2 disabled:opacity-60"
          >
            {isPending ? progressLabel(progress) : "Replace image"}
          </button>
          {/* Keyed on the URL so replacing the picture starts a fresh description. */}
          <ImageDescriptionField key={url} url={url} label={label} />
        </>
      )}
      {error && (
        <p role="alert" className="text-xs text-danger mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
}
