"use client";

import { useActionState, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { uploadPatronDocumentAction } from "@/lib/actions/patron-portal-actions";
import { initialActionState, type ActionState } from "@/lib/actions/types";
import { FieldError, FormAlert, Label, inputClasses } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { PatronFileField } from "./PatronFileField";

/** Guidance notes, advisory letters or policy templates for the executive team. */
export function PatronDocumentUploadForm() {
  const [resetKey, setResetKey] = useState(0);
  const [state, formAction, isPending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await uploadPatronDocumentAction(prev, formData);
    if (result.success) setResetKey((k) => k + 1);
    return result;
  }, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" key={resetKey}>
      {state.success ? (
        <FormAlert
          variant="success"
          message="Uploaded. The team will review it and share it with all patrons once it's published."
        />
      ) : (
        <FormAlert message={state.error} />
      )}
      <PatronFileField name="file" label="Document" required errors={fe.file} />
      <div>
        <Label htmlFor="doc-title" required>
          Title
        </Label>
        <input id="doc-title" name="title" required maxLength={200} className={inputClasses} />
        <FieldError messages={fe.title} />
      </div>
      <div>
        <Label htmlFor="doc-description">What is it? (optional)</Label>
        <textarea id="doc-description" name="description" rows={3} maxLength={1000} className={inputClasses} />
        <FieldError messages={fe.description} />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Upload size={16} aria-hidden="true" />}
        {isPending ? "Uploading…" : "Upload Document"}
      </Button>
    </form>
  );
}
