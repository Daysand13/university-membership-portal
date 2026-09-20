"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { withActionErrorHandling } from "./with-error-handling";
import { detectBot } from "@/lib/bot-protection";
import { logFlaggedSubmission } from "@/lib/services/flagged-submission-service";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { getCurrentMember } from "@/lib/auth/member";
import { allySignupSchema, publicDonationSchema, techRequestSchema } from "@/lib/validations/outreach";
import { cedisToPesewas } from "@/lib/validations/patron-portal";
import { confirmAllySignup, registerAlly, unsubscribeAlly } from "@/lib/services/ally-service";
import { createTechRequest } from "@/lib/services/assistive-software-service";
import { initiatePublicDonation, isPublicGivingReturn } from "@/lib/services/public-giving-service";
import type { ActionState } from "./types";

/**
 * The forms on the public Allies and Tech & Tutorials pages. Anyone can
 * use them without an account, so each one has the same invisible bot
 * checks and per-address rate limits as the contact form — and none of them
 * says whether an email address is already known.
 */

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

const blankToNull = (value: string | undefined) => (value && value.trim() ? value.trim() : null);

function appUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? ""}${path}`;
}

// ---------------------------------------------------------------------------
// Joining the ally network
// ---------------------------------------------------------------------------

async function registerAllyActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const botSignal = detectBot(formData);
  if (botSignal) {
    await logFlaggedSubmission({ form: "ally-signup", signal: botSignal, allowedThrough: false, formData });
    return { success: true };
  }

  const ip = await getClientIp();
  const limit = await checkRateLimit(`ally-signup:ip:${ip}`, { max: 5, windowSeconds: 600 });
  if (!limit.allowed) return { error: RATE_LIMIT_MESSAGE };

  const parsed = allySignupSchema.safeParse({
    fullName: text(formData, "fullName"),
    email: text(formData, "email"),
    type: text(formData, "type"),
    organization: text(formData, "organization"),
    wantsListing: formData.get("wantsListing") === "on",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  // The same answer whether the address is new or already confirmed, so
  // the form can't be used to find out who's on the list.
  await registerAlly({ ...parsed.data, organization: blankToNull(parsed.data.organization) });
  return { success: true };
}

async function confirmAllyActionImpl(token: string): Promise<ActionState> {
  const signup = await confirmAllySignup(token);
  if (!signup) return { error: "That link has expired or was already replaced by a newer one." };
  revalidatePath("/allies");
  return { success: true };
}

async function unsubscribeAllyActionImpl(token: string): Promise<ActionState> {
  const signup = await unsubscribeAlly(token);
  if (!signup) return { error: "That link isn't valid any more." };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Giving without an account
// ---------------------------------------------------------------------------

async function startPublicDonationActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const botSignal = detectBot(formData);
  if (botSignal) {
    await logFlaggedSubmission({ form: "public-donation", signal: botSignal, allowedThrough: false, formData });
    return { error: "We couldn't start the payment. Please try again in a moment." };
  }

  const ip = await getClientIp();
  const limit = await checkRateLimit(`public-donation:ip:${ip}`, { max: 15, windowSeconds: 3600 });
  if (!limit.allowed) return { error: RATE_LIMIT_MESSAGE };

  const parsed = publicDonationSchema.safeParse({
    donorName: text(formData, "donorName"),
    donorEmail: text(formData, "donorEmail"),
    amount: text(formData, "amount"),
    fund: text(formData, "fund"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const returnTo = text(formData, "returnTo");
  const page = isPublicGivingReturn(returnTo) ? returnTo : "donate";
  const result = await initiatePublicDonation({
    donorName: parsed.data.donorName,
    donorEmail: parsed.data.donorEmail,
    amountPesewas: cedisToPesewas(parsed.data.amount),
    fund: parsed.data.fund,
    callbackUrl: appUrl(`/api/donations/callback?return=${page}`),
    sourcePage: page === "allies" ? "Allies & Champions" : page === "tech-tutorials" ? "Tech & Tutorials" : "Donate",
  });
  if (!result.ok) return { error: result.error };
  redirect(result.authorizationUrl);
}

// ---------------------------------------------------------------------------
// Asking for software, or for a tutorial
// ---------------------------------------------------------------------------

async function submitTechRequestActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const botSignal = detectBot(formData);
  if (botSignal) {
    await logFlaggedSubmission({ form: "tech-request", signal: botSignal, allowedThrough: false, formData });
    return { success: true };
  }

  const ip = await getClientIp();
  const limit = await checkRateLimit(`tech-request:ip:${ip}`, { max: 5, windowSeconds: 3600 });
  if (!limit.allowed) return { error: RATE_LIMIT_MESSAGE };

  const parsed = techRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  // Linked to the student's record when they happen to be signed in, so the
  // team can see who they're helping; never required.
  const member = await getCurrentMember().catch(() => null);
  await createTechRequest({
    ...parsed.data,
    // A tutorial is watched, not installed, so the field isn't asked for.
    operatingSystem: parsed.data.kind === "SOFTWARE" ? (parsed.data.operatingSystem ?? null) : null,
    notes: blankToNull(parsed.data.notes),
    memberId: member?.id ?? null,
  });
  revalidatePath("/admin/tech-tutorials/requests");
  return { success: true };
}

export const registerAllyAction = withActionErrorHandling("registerAllyAction", registerAllyActionImpl);
export const confirmAllyAction = withActionErrorHandling("confirmAllyAction", confirmAllyActionImpl);
export const unsubscribeAllyAction = withActionErrorHandling("unsubscribeAllyAction", unsubscribeAllyActionImpl);
export const startPublicDonationAction = withActionErrorHandling(
  "startPublicDonationAction",
  startPublicDonationActionImpl,
);
export const submitTechRequestAction = withActionErrorHandling(
  "submitTechRequestAction",
  submitTechRequestActionImpl,
);
