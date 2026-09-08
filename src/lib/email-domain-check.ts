import "server-only";
import { resolveMx } from "node:dns/promises";

/**
 * Confirms an email address's DOMAIN can receive mail at all, by looking up
 * its MX records.
 *
 * This is deliberately a narrower guarantee than "this email address is
 * real" — verifying that a SPECIFIC mailbox exists needs either an SMTP
 * handshake (RCPT TO), which most cloud platforms including Vercel block
 * outbound on port 25 and which many real mail servers deliberately answer
 * ambiguously to resist exactly this kind of probing, or a paid third-party
 * verification API, which this project has no key configured for. Neither
 * is available here.
 *
 * What an MX lookup DOES catch, reliably and for free: a typo'd domain
 * (gmail.cim instead of gmail.com — the exact mistake that got a real
 * member locked out of email-only login elsewhere in this system), a
 * domain that doesn't exist, or one that exists but was never configured to
 * receive mail. That covers the overwhelming majority of real mistakes
 * people make typing an email address, which is what this check is for.
 *
 * Fails OPEN on anything other than a confirmed "no mail server" answer —
 * a DNS hiccup on our side must never block a legitimate application.
 */
export async function domainCanReceiveMail(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) return false;

  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("MX lookup timed out")), 4000)),
    ]);
    return records.length > 0;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    // ENOTFOUND / ENODATA: the DNS server answered — this domain has no mail
    // exchanger, or doesn't exist at all. That's a real, actionable signal.
    if (code === "ENOTFOUND" || code === "ENODATA") return false;

    // Anything else (timeout, our own resolver being flaky, a transient
    // network error) is inconclusive, not a rejection — don't turn a DNS
    // hiccup into a blocked application.
    console.error("[email-domain-check] inconclusive MX lookup, allowing through:", domain, err);
    return true;
  }
}
