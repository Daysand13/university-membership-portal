// The enums entry point, not the full client: this file is imported by the
// permission grid in the browser, and the client itself is server-only.
import { AdminRole } from "@/generated/prisma/enums";

/**
 * What an administrator is allowed to do, one capability at a time.
 *
 * The six base roles are a starting point, not the whole answer: a large
 * executive team has two people with the same title and different jobs,
 * and a secretary who should log dues but not approve payouts. So a role
 * only sets the defaults, and each account can then have individual
 * capabilities granted or taken away — the mask on AdminUser.
 *
 * Plain data with no server imports, so the admin screen that edits the
 * mask and the guards that enforce it work from the same list.
 */

export interface Capability {
  key: string;
  label: string;
  /** Shown under the toggle where the wording alone wouldn't be enough. */
  hint?: string;
}

export interface CapabilityModule {
  key: string;
  title: string;
  capabilities: Capability[];
}

export const CAPABILITY_MODULES: CapabilityModule[] = [
  {
    key: "content",
    title: "Website content",
    capabilities: [
      { key: "content.hero", label: "Manage hero slides" },
      { key: "content.news", label: "Write and edit news" },
      { key: "content.news.publish", label: "Publish, archive or delete news", hint: "Puts an article on the public site." },
      { key: "content.events", label: "Write and edit events" },
      { key: "content.events.publish", label: "Publish, archive or delete events" },
      { key: "content.about", label: "Edit the About Us page" },
      { key: "content.donate", label: "Edit the Donate page" },
      { key: "content.team", label: "Manage leadership listings" },
      { key: "content.media", label: "Use the media library" },
      { key: "content.social", label: "Manage social links" },
    ],
  },
  {
    key: "members",
    title: "Membership and records",
    capabilities: [
      { key: "members.applications", label: "Review membership applications" },
      {
        key: "members.applications.decide",
        label: "Approve or reject applications",
        hint: "Creates the member account and emails their sign-in details.",
      },
      { key: "members.records", label: "Manage member records" },
      { key: "members.academic", label: "Manage departments, programmes and support categories" },
      { key: "members.alumni", label: "Manage alumni records and features" },
      { key: "members.patrons", label: "Manage patrons" },
      { key: "members.accounts", label: "Grant or withdraw account standing", hint: "The User Status Matrix." },
    ],
  },
  {
    key: "finance",
    title: "Finance",
    capabilities: [
      { key: "finance.dues", label: "View the dues register" },
      { key: "finance.dues.record", label: "Record or remove cash dues" },
      { key: "finance.ledger", label: "View donations and expenses" },
      { key: "finance.ledger.record", label: "Log donations and expenses" },
      { key: "finance.export", label: "Export financial records" },
    ],
  },
  {
    key: "support",
    title: "Student support",
    capabilities: [
      { key: "support.barriers", label: "Run the escalation desk" },
      { key: "support.requests", label: "See support requests" },
      { key: "support.requests.decide", label: "Approve, decline and pay out support" },
      { key: "support.opportunities", label: "See the opportunity board" },
      { key: "support.opportunities.decide", label: "Approve or decline postings" },
    ],
  },
  {
    key: "outreach",
    title: "Outreach",
    capabilities: [
      { key: "outreach.allies", label: "Manage allies and champions" },
      { key: "outreach.software", label: "Manage tech & tutorials" },
      { key: "outreach.software.requests", label: "Handle software and tutorial requests" },
    ],
  },
  {
    key: "messages",
    title: "Messages",
    capabilities: [
      { key: "messages.contact", label: "Read contact messages" },
      { key: "messages.broadcasts", label: "Write broadcasts" },
      { key: "messages.broadcasts.send", label: "Send broadcasts and approve patrons'", hint: "Emails every member in the audience." },
    ],
  },
  {
    key: "elections",
    title: "Elections",
    capabilities: [
      { key: "elections.manage", label: "Manage elections and candidates" },
      { key: "elections.publish", label: "Publish or close an election" },
      {
        key: "elections.commission",
        label: "Run the ballot on the day",
        hint: "Open it, postpone it, add time, close it, and show or hide the results.",
      },
      { key: "elections.nominations", label: "Approve or turn down nominations" },
      {
        key: "elections.stations",
        label: "Register polling terminals",
        hint: "Issues the key a terminal needs to take votes.",
      },
    ],
  },
  {
    key: "library",
    title: "Library",
    capabilities: [{ key: "library.documents", label: "Manage library documents" }],
  },
  {
    key: "site",
    title: "Site administration",
    capabilities: [
      { key: "site.settings", label: "Change site settings" },
      { key: "site.audit", label: "Read the audit log" },
      { key: "site.emails", label: "Read the email log" },
      { key: "site.permissions", label: "Manage what other administrators can do" },
    ],
  },
];

export const ALL_CAPABILITIES: string[] = CAPABILITY_MODULES.flatMap((m) => m.capabilities.map((c) => c.key));

export function capabilityLabel(key: string): string {
  for (const group of CAPABILITY_MODULES) {
    const found = group.capabilities.find((c) => c.key === key);
    if (found) return found.label;
  }
  return key;
}

/**
 * What each base role gets before anyone changes anything. These reproduce
 * what the roles could already do, so an account with no overrides behaves
 * exactly as it did before there were capabilities at all.
 */
const CONTENT_ALL = CAPABILITY_MODULES[0].capabilities.map((c) => c.key);
const MEMBERS_ALL = CAPABILITY_MODULES[1].capabilities.map((c) => c.key);
const FINANCE_ALL = CAPABILITY_MODULES[2].capabilities.map((c) => c.key);
const SUPPORT_ALL = CAPABILITY_MODULES[3].capabilities.map((c) => c.key);
const OUTREACH_ALL = CAPABILITY_MODULES[4].capabilities.map((c) => c.key);

export const ROLE_DEFAULTS: Record<AdminRole, string[]> = {
  // Super admins hold every capability and can't be pared back — somebody
  // has to be able to put the permissions right again afterwards.
  [AdminRole.SUPER_ADMIN]: ALL_CAPABILITIES,
  [AdminRole.ADMIN]: ["content.media", "content.social", "messages.contact"],
  [AdminRole.EDITOR]: [...CONTENT_ALL, "outreach.allies", "outreach.software", "messages.contact"],
  [AdminRole.MEMBERSHIP_OFFICER]: [
    ...MEMBERS_ALL,
    ...FINANCE_ALL,
    ...SUPPORT_ALL,
    ...OUTREACH_ALL,
    "messages.contact",
    "messages.broadcasts",
    "messages.broadcasts.send",
    "content.media",
  ],
  [AdminRole.LIBRARIAN]: ["library.documents", "content.media", "messages.contact"],
  // The Electoral Commission: everything about an election, including the
  // day itself, and nothing else.
  [AdminRole.ELECTION_OFFICER]: [
    "elections.manage",
    "elections.publish",
    "elections.commission",
    "elections.nominations",
    "elections.stations",
    "content.media",
    "messages.contact",
  ],
};

/** The overrides stored on an account: a capability key set to true (granted) or false (withheld). */
export type PermissionMask = Record<string, boolean>;

/** Reads a mask off the database column, ignoring anything that isn't a known capability. */
export function parsePermissionMask(value: unknown): PermissionMask {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const mask: PermissionMask = {};
  for (const [key, on] of Object.entries(value as Record<string, unknown>)) {
    if (typeof on === "boolean" && ALL_CAPABILITIES.includes(key)) mask[key] = on;
  }
  return mask;
}

/** Everything this account may actually do: its role's defaults, with its own overrides applied. */
export function effectiveCapabilities(role: AdminRole, mask: unknown): Set<string> {
  if (role === AdminRole.SUPER_ADMIN) return new Set(ALL_CAPABILITIES);
  const effective = new Set(ROLE_DEFAULTS[role] ?? []);
  for (const [key, on] of Object.entries(parsePermissionMask(mask))) {
    if (on) effective.add(key);
    else effective.delete(key);
  }
  return effective;
}

/** True when the account holds every capability asked for. */
export function hasCapability(capabilities: Set<string>, ...required: string[]): boolean {
  return required.every((key) => capabilities.has(key));
}

/** The message someone sees when they try anyway — the same words in the UI and from the server. */
export const NO_PERMISSION_MESSAGE = "You do not have permission to execute this action.";
