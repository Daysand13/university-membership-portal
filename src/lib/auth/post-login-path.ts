import type { UserRoleName } from "@/generated/prisma/client";

/**
 * Where a person lands after signing in. Someone holding both student and
 * alumni standing is asked which portal they want rather than being guessed
 * at — that choice is the whole point of dual status.
 *
 * Kept free of server-only imports so it can be tested on its own.
 */
export function landingPathFor(roles: UserRoleName[]): string {
  const isMember = roles.includes("MEMBER");
  const isAlumni = roles.includes("ALUMNI");

  if (isMember && isAlumni) return "/portal";
  if (isMember) return "/membership/dashboard";
  if (isAlumni) return "/alumni/dashboard";
  if (roles.includes("ADMIN")) return "/admin";
  return "/";
}

const PORTAL_ROLE: Record<string, UserRoleName> = {
  "/membership/dashboard": "MEMBER",
  "/alumni/dashboard": "ALUMNI",
};

/**
 * Where to go after signing in: the portal the person was heading for — the
 * portal switcher passes it as ?next= — when their roles open it, and their
 * usual landing page otherwise.
 *
 * Only those two exact paths are honoured, so the parameter can't be used to
 * send someone anywhere else after they sign in.
 */
export function postLoginPath(next: unknown, roles: UserRoleName[]): string {
  if (typeof next === "string" && Object.hasOwn(PORTAL_ROLE, next) && roles.includes(PORTAL_ROLE[next])) {
    return next;
  }
  return landingPathFor(roles);
}
