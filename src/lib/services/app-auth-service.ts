import "server-only";
import { db } from "@/lib/db";
import type { AppAudience } from "@/generated/prisma/client";
import {
  InvalidLoginError,
  NoActiveRoleError,
  PasswordNotSetError,
  authenticateUser,
  getActiveRolesForUser,
} from "@/lib/services/user-service";
import {
  InvalidPatronCredentialsError,
  PatronNotApprovedError,
  authenticatePatron,
} from "@/lib/services/patron-service";
import { startAppSession, type AppSession, type DeviceDescription } from "@/lib/services/mobile-device-service";

/**
 * Signing in on a phone.
 *
 * It reuses the website's own authenticators rather than checking passwords
 * again here — one place decides whether a password is right, and it is the
 * same place for both. What this adds is the part a browser gets for free:
 * working out which portal the person is entitled to, and handing back a
 * pair of tokens instead of setting a cookie.
 *
 * Somebody who is both a student and a graduate is offered the choice, the
 * way the website offers it after a unified sign-in, rather than being put
 * wherever we guessed.
 */

export interface AppIdentitySummary {
  audience: AppAudience;
  /** What to call this choice on screen: "Student Portal", "Alumni Portal". */
  label: string;
  id: string;
  name: string;
}

export type AppLoginOutcome =
  | { ok: true; session: AppSession; identity: AppIdentitySummary }
  | { ok: true; chooseFrom: AppIdentitySummary[] }
  | { ok: false; error: string };

const LABELS: Record<AppAudience, string> = {
  MEMBER: "Student Portal",
  ALUMNI: "Alumni Portal",
  PATRON: "Patrons' Portal",
};

/**
 * Everything this person may sign into, in the order they most likely want
 * it. A patron account is looked up separately because patrons are not part
 * of the unified identity — they have their own record and their own
 * password, exactly as on the website.
 */
async function identitiesFor(identifier: string, password: string): Promise<AppIdentitySummary[]> {
  const found: AppIdentitySummary[] = [];

  try {
    const user = await authenticateUser(identifier, password);
    const roles = await getActiveRolesForUser(user.id);

    if (roles.includes("MEMBER")) {
      const member = await db.member.findFirst({ where: { userId: user.id, status: "ACTIVE" } });
      if (member) {
        found.push({
          audience: "MEMBER",
          label: LABELS.MEMBER,
          id: member.id,
          name: [member.firstName, member.lastName].filter(Boolean).join(" "),
        });
      }
    }
    if (roles.includes("ALUMNI")) {
      const alumni = await db.alumniProfile.findFirst({ where: { userId: user.id, status: "ACTIVE" } });
      if (alumni) {
        found.push({ audience: "ALUMNI", label: LABELS.ALUMNI, id: alumni.id, name: alumni.fullName });
      }
    }
  } catch (err) {
    // A wrong password here is not the end of it: the same details may be a
    // patron's, whose records this authenticator knows nothing about.
    if (
      !(err instanceof InvalidLoginError) &&
      !(err instanceof NoActiveRoleError) &&
      !(err instanceof PasswordNotSetError)
    ) {
      throw err;
    }
  }

  if (identifier.includes("@")) {
    try {
      const patron = await authenticatePatron(identifier.trim().toLowerCase(), password);
      found.push({
        audience: "PATRON",
        label: LABELS.PATRON,
        id: patron.id,
        name: [patron.title, patron.fullName].filter(Boolean).join(" "),
      });
    } catch (err) {
      if (!(err instanceof InvalidPatronCredentialsError) && !(err instanceof PatronNotApprovedError)) {
        throw err;
      }
    }
  }

  return found;
}

export async function signInFromApp(params: {
  identifier: string;
  password: string;
  /** Set when the person has already chosen between two portals. */
  audience?: AppAudience;
  device?: DeviceDescription;
}): Promise<AppLoginOutcome> {
  const { identifier, password, audience, device } = params;

  const identities = await identitiesFor(identifier, password);

  if (identities.length === 0) {
    // Deliberately one message for "no such account" and "wrong password":
    // telling them apart is how somebody finds out which addresses exist.
    return { ok: false, error: "Those details don't match an active account." };
  }

  if (audience) {
    const chosen = identities.find((identity) => identity.audience === audience);
    if (!chosen) return { ok: false, error: "You don't have access to that portal." };
    return { ok: true, session: await startAppSession({ audience, subjectId: chosen.id, device }), identity: chosen };
  }

  if (identities.length > 1) return { ok: true, chooseFrom: identities };

  const only = identities[0];
  return {
    ok: true,
    session: await startAppSession({ audience: only.audience, subjectId: only.id, device }),
    identity: only,
  };
}
