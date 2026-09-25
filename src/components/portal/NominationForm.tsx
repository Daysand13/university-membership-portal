"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, CreditCard, FileText, Loader2, Lock, Send, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldError, FormAlert, Label, inputClasses } from "@/components/ui/Common";
import { SuccessDialog, useResettableForm } from "@/components/ui/SuccessDialog";
import { submitNominationAction } from "@/lib/actions/ballot-actions";
import { buyNominationFormAction } from "@/lib/actions/nomination-actions";
import { initialActionState } from "@/lib/actions/types";
import { PatronFileField } from "@/components/patron-portal/PatronFileField";

/**
 * Standing for office, from a member's own dashboard.
 *
 * A post can carry a fee for its nomination form; where it does, the form
 * is bought before anything can be written, so a nomination never reaches
 * the commission unpaid. Posts the commission has left free skip that
 * step entirely.
 *
 * Something has to come with the nomination — the CV the portal prepared,
 * or a document or picture of the member's own.
 */

export interface NominatablePosition {
  id: string;
  title: string;
  feeLabel: string;
  /** Zero-fee posts need nothing bought. */
  free: boolean;
  paid: boolean;
}

export function NominationForm({
  electionId,
  positions,
  hasPortalCv,
}: {
  electionId: string;
  positions: NominatablePosition[];
  hasPortalCv: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    submitNominationAction.bind(null, electionId),
    initialActionState,
  );
  const { formKey, formRef, resetForm } = useResettableForm();
  const [buying, startBuying] = useTransition();

  const [positionId, setPositionId] = useState(positions[0]?.id ?? "");
  const [attachment, setAttachment] = useState<"portal-cv" | "upload" | "none">(hasPortalCv ? "portal-cv" : "upload");

  const chosen = positions.find((position) => position.id === positionId);
  const needsForm = chosen ? !chosen.free && !chosen.paid : false;
  const fe = state.fieldErrors ?? {};

  return (
    <>
      <form ref={formRef} key={formKey} action={formAction} className="space-y-4">
        <FormAlert message={state.error} />

        <div>
          <Label htmlFor="positionId" required>
            The post you are standing for
          </Label>
          <select
            id="positionId"
            name="positionId"
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
            className={inputClasses}
          >
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.title} — {position.free ? "no form fee" : position.feeLabel}
                {position.paid ? " (form paid)" : ""}
              </option>
            ))}
          </select>
          <FieldError messages={fe.positionId} />
        </div>

        {needsForm ? (
          <div className="rounded-lg border border-warning bg-warning-light px-4 py-3.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Lock size={16} aria-hidden="true" /> The nomination form for {chosen?.title} costs {chosen?.feeLabel}
            </p>
            <p className="text-sm text-ink mt-1">
              Buy it and this page will let you fill it in. You can also pay at the association office and ask them to
              record it.
            </p>
            <div className="mt-3">
              <Button
                type="button"
                disabled={buying}
                onClick={() => startBuying(() => buyNominationFormAction(positionId))}
              >
                {buying ? (
                  <Loader2 size={16} aria-hidden="true" className="animate-spin" />
                ) : (
                  <CreditCard size={16} aria-hidden="true" />
                )}
                {buying ? "Opening secure checkout…" : `Buy the form — ${chosen?.feeLabel}`}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <fieldset>
              <legend className="block text-sm font-medium text-primary-950 mb-1.5">
                What you are putting forward with it
                <span className="text-danger ml-0.5">*</span>
              </legend>
              <input type="hidden" name="supportingChoice" value={attachment} />

              <div className="space-y-2">
                <label
                  htmlFor="attach-portal-cv"
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${
                    attachment === "portal-cv" ? "border-primary-800 bg-primary-50" : "border-line"
                  } ${hasPortalCv ? "" : "opacity-60"}`}
                >
                  <input
                    id="attach-portal-cv"
                    type="radio"
                    name="attachmentChoice"
                    aria-label="My portal CV"
                    aria-describedby="attach-portal-cv-note"
                    checked={attachment === "portal-cv"}
                    disabled={!hasPortalCv}
                    onChange={() => setAttachment("portal-cv")}
                    className="mt-1 h-4 w-4 text-primary-800"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-semibold text-primary-950">
                      <FileText size={15} aria-hidden="true" /> My portal CV
                    </span>
                    <span id="attach-portal-cv-note" className="block text-xs text-slate mt-0.5">
                      {hasPortalCv
                        ? "The commission sees the CV as it stands when they open your nomination."
                        : "Not available — your CV hasn't been paid for yet."}
                    </span>
                  </span>
                </label>

                <label
                  htmlFor="attach-upload"
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${
                    attachment === "upload" ? "border-primary-800 bg-primary-50" : "border-line"
                  }`}
                >
                  <input
                    id="attach-upload"
                    type="radio"
                    name="attachmentChoice"
                    aria-label="A document or picture of my own"
                    aria-describedby="attach-upload-note"
                    checked={attachment === "upload"}
                    onChange={() => setAttachment("upload")}
                    className="mt-1 h-4 w-4 text-primary-800"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-semibold text-primary-950">
                      <Upload size={15} aria-hidden="true" /> A document or picture of my own
                    </span>
                    <span id="attach-upload-note" className="block text-xs text-slate mt-0.5">
                      Your own CV, a certificate, a passport picture — whatever the commission asked for.
                    </span>
                  </span>
                </label>
              </div>
              <FieldError messages={fe.supportingChoice} />
            </fieldset>

            {attachment === "upload" && (
              <div className="pl-3 border-l-2 border-line">
                <PatronFileField
                  name="supportingToken"
                  label="Your attachment"
                  hint="A CV, a certificate or a picture. Up to about 5MB."
                  ticketUrl="/api/student/upload/ticket"
                  fallbackUrl="/api/student/upload"
                  errors={fe.supportingUrl}
                />
              </div>
            )}

            <div>
              <Label htmlFor="manifesto" required>
                What you would do in the post
              </Label>
              <textarea
                id="manifesto"
                name="manifesto"
                rows={6}
                maxLength={3000}
                className={inputClasses}
                placeholder="What you want to change, and how. This is what members read beside your name on the ballot."
              />
              <FieldError messages={fe.manifesto} />
              <p className="text-xs text-slate mt-1">
                Shown to every voter at the terminal, and read aloud by a screen reader, so write it as you would say
                it.
              </p>
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 size={16} aria-hidden="true" className="animate-spin" />
              ) : (
                <Send size={16} aria-hidden="true" />
              )}
              {isPending ? "Sending…" : "Put my name forward"}
            </Button>
          </>
        )}
      </form>

      <SuccessDialog
        state={state}
        isPending={isPending}
        title="Your nomination is in"
        againLabel="Close"
        againIcon={<Check size={16} aria-hidden="true" />}
        onAgain={resetForm}
        listHref="/membership/dashboard/elections"
        listLabel="Back to the election"
      />
    </>
  );
}
