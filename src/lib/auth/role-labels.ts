import { AdminRole } from "@/generated/prisma/enums";

/**
 * How each base role is written wherever anyone reads it. One list, so the
 * permission grid, the account list and the invitation email can't drift
 * into calling the same role different things.
 */
export const ROLE_LABELS: Record<AdminRole, string> = {
  [AdminRole.SUPER_ADMIN]: "Super Administrator",
  [AdminRole.ADMIN]: "Administrator",
  [AdminRole.EDITOR]: "Editor",
  [AdminRole.MEMBERSHIP_OFFICER]: "Membership Officer",
  [AdminRole.LIBRARIAN]: "Librarian",
  [AdminRole.ELECTION_OFFICER]: "Election Officer",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as AdminRole] ?? role;
}
