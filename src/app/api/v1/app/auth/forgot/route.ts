import { type NextRequest } from "next/server";
import { z } from "zod";
import { appError, appFieldErrors, appJson } from "@/lib/api/app-request";
import { checkRateLimit, clientIpFrom } from "@/lib/rate-limit";
import { requestPasswordReset } from "@/lib/services/membership-service";
import { requestAlumniPasswordReset } from "@/lib/services/alumni-service";
import { requestPatronPasswordReset } from "@/lib/services/patron-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "I've forgotten my password", from the app.
 *
 * The app signs everybody in through one screen, so this does too: the
 * email goes to each of the three portals' own reset services, and any
 * account with that address gets the same email the website sends, with a
 * link to set a new password on the website. The answer is the same
 * whether or not an account exists, so it can't be used to find out who
 * is registered.
 *
 * The rate limits share their keys with the website's forms, so asking
 * from the app can't be used to get round them.
 */

const schema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : ""),
    z.string().min(1, "Enter your email address").email("Enter a valid email address"),
  ),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return appFieldErrors(parsed.error.flatten().fieldErrors);
  const { email } = parsed.data;

  const ip = clientIpFrom(request.headers);
  const [ipLimit, member, alumni, patron] = await Promise.all([
    checkRateLimit(`app-forgot-password:ip:${ip}`, { max: 10, windowSeconds: 600 }),
    checkRateLimit(`forgot-password:email:${email}`, { max: 3, windowSeconds: 600 }),
    checkRateLimit(`alumni-forgot-password:email:${email}`, { max: 3, windowSeconds: 600 }),
    checkRateLimit(`patron-reset:email:${email}`, { max: 3, windowSeconds: 3600 }),
  ]);
  if (!ipLimit.allowed) return appError("Too many attempts. Please wait a few minutes and try again.", 429, "rate_limited");

  const site = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const results = await Promise.allSettled([
    member.allowed ? requestPasswordReset(email, `${site}/membership/reset-password`) : Promise.resolve(),
    alumni.allowed ? requestAlumniPasswordReset(email, `${site}/alumni/reset-password`) : Promise.resolve(),
    patron.allowed ? requestPatronPasswordReset(email) : Promise.resolve(),
  ]);
  for (const result of results) {
    if (result.status === "rejected") console.error("[app-forgot-password]", result.reason);
  }

  return appJson({
    message:
      "If that address belongs to an account, a link to set a new password is on its way. It opens on the website; come back and sign in once it's set.",
  });
}
