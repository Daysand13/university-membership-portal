"use client";

import { useActionState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { submitContactMessageAction } from "@/lib/actions/contact-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactMessageAction, initialActionState);

  if (state.success) {
    return (
      <div className="rounded-lg border border-success/20 bg-success-light p-8 text-center">
        <CheckCircle2 size={32} className="mx-auto text-success mb-3" />
        <h3 className="font-display font-bold text-lg text-primary-950">Message sent</h3>
        <p className="text-sm text-slate mt-1.5">
          Thanks for reaching out — we&apos;ll get back to you as soon as we can.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="name" required>
            Full Name
          </Label>
          <input id="name" name="name" required className={inputClasses} />
          <FieldError messages={state.fieldErrors?.name} />
        </div>
        <div>
          <Label htmlFor="email" required>
            Email Address
          </Label>
          <input id="email" name="email" type="email" required className={inputClasses} />
          <FieldError messages={state.fieldErrors?.email} />
        </div>
      </div>
      <div>
        <Label htmlFor="phone">Phone (optional)</Label>
        <input id="phone" name="phone" className={inputClasses} />
      </div>
      <div>
        <Label htmlFor="subject" required>
          Subject
        </Label>
        <input id="subject" name="subject" required className={inputClasses} />
        <FieldError messages={state.fieldErrors?.subject} />
      </div>
      <div>
        <Label htmlFor="message" required>
          Message
        </Label>
        <textarea id="message" name="message" required rows={5} className={inputClasses} />
        <FieldError messages={state.fieldErrors?.message} />
      </div>
      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending && <Loader2 size={15} className="animate-spin" />}
        {isPending ? "Sending…" : "Send Message"}
      </Button>
    </form>
  );
}
