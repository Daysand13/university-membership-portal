import { Award, ShieldCheck } from "lucide-react";
import type { TeamRoleBadge } from "@/lib/services/team-role-service";

/**
 * "Executive · President" / "Patron · Patron" pills for the dashboard welcome
 * banner. Colours are set directly rather than through theme tokens: the
 * banner is dark in both themes, and a token that inverts in dark mode would
 * leave the text unreadable on the badge.
 */
export function TeamRoleBadges({ roles }: { roles: TeamRoleBadge[] }) {
  if (roles.length === 0) return null;

  return (
    <ul aria-label="Your roles in the association" className="mt-3 flex flex-wrap gap-2">
      {roles.map((role) => {
        const Icon = role.type === "LEADERSHIP" ? ShieldCheck : Award;
        const label = role.type === "LEADERSHIP" ? "Executive" : "Patron";
        return (
          <li
            key={`${role.type}:${role.position}`}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold shadow-sm"
            style={{ backgroundColor: "#f7b267", color: "#1b1440" }}
          >
            <Icon size={15} aria-hidden="true" />
            <span>
              {label}
              <span aria-hidden="true"> · </span>
              <span className="sr-only">: </span>
              {role.position}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
