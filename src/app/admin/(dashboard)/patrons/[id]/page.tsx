import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, ChevronLeft, HandHeart, Phone, UserPlus } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PatronReviewPanel } from "@/components/admin/PatronReviewPanel";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { ALLOWED_PATRON_DECISIONS, canDeletePatron, getPatronById } from "@/lib/services/patron-service";
import { PatronDeleteButton } from "@/components/admin/PatronDeleteButton";

export const metadata = { title: "Patron Application" };
export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-slate-light uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-ink mt-0.5 break-words">{value || "—"}</dd>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-lg border border-line p-6">
      <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-4">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

const STATUS_HELP: Record<string, string> = {
  PENDING: "Waiting for a decision. Approving lets them sign in to the Patrons' Portal.",
  APPROVED: "Approved — they can sign in to the Patrons' Portal. Suspend the account to stop that.",
  REJECTED: "Rejected — they can't sign in. You can still approve it, or they may apply again.",
  SUSPENDED: "Suspended — they can't sign in until the account is reinstated.",
};

export default async function AdminPatronPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const { id } = await params;
  const patron = await getPatronById(id);
  if (!patron) notFound();

  return (
    <div>
      <Link href="/admin/patrons" className="inline-flex items-center gap-1 text-sm text-primary-800 font-medium hover:text-accent-600 mb-5">
        <ChevronLeft size={15} /> Back to Patrons
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary-950">
            {[patron.title, patron.fullName].filter(Boolean).join(" ")}
          </h1>
          <p className="text-sm text-slate mt-1">Applied {formatDate(patron.submittedAt)}</p>
        </div>
        <StatusBadge status={patron.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section icon={<Phone size={16} className="text-accent-500" />} title="Contact">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-slate-light uppercase tracking-wide">Email</dt>
                <dd className="text-sm mt-0.5 break-words">
                  <a href={`mailto:${patron.email}`} className="text-primary-800 hover:text-accent-600">
                    {patron.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-light uppercase tracking-wide">Telephone</dt>
                <dd className="text-sm mt-0.5">
                  <a href={`tel:${patron.phone}`} className="text-primary-800 hover:text-accent-600">
                    {patron.phone}
                  </a>
                </dd>
              </div>
              <Field label="Town / Address" value={patron.address} />
              <Field label="Region" value={patron.region} />
            </dl>
          </Section>

          <Section icon={<Briefcase size={16} className="text-accent-500" />} title="Work">
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Occupation" value={patron.occupation} />
              <Field label="Organisation" value={patron.organization} />
              <Field label="Position" value={patron.jobTitle} />
            </dl>
          </Section>

          <Section icon={<HandHeart size={16} className="text-accent-500" />} title="Their Support">
            <dl className="space-y-4">
              <div>
                <dt className="text-xs text-slate-light uppercase tracking-wide">How they&apos;d like to support the association</dt>
                <dd className="text-sm text-ink mt-1 whitespace-pre-line">{patron.supportInterest || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-light uppercase tracking-wide">Why they want to become a patron</dt>
                <dd className="text-sm text-ink mt-1 whitespace-pre-line">{patron.motivation || "—"}</dd>
              </div>
            </dl>
          </Section>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="font-display font-bold text-base text-primary-950 mb-2">Decision</h2>
            <p className="text-sm text-slate mb-4">{STATUS_HELP[patron.status]}</p>
            {patron.reviewedAt && (
              <dl className="mb-4 space-y-2 text-sm">
                <Field
                  label="Last decision"
                  value={`${formatDate(patron.reviewedAt)}${patron.reviewedBy ? ` by ${patron.reviewedBy.name}` : ""}`}
                />
                {patron.adminNote && <Field label="Note sent" value={patron.adminNote} />}
              </dl>
            )}
            <PatronReviewPanel
              patronId={patron.id}
              status={patron.status}
              decisions={ALLOWED_PATRON_DECISIONS[patron.status]}
            />
          </section>

          {patron.status === "APPROVED" && (
            <section className="bg-white rounded-lg border border-line p-6">
              <h2 className="font-display font-bold text-base text-primary-950 mb-2">Public Profile</h2>
              <p className="text-sm text-slate mb-4">
                Show this patron on the public Patrons page, with a photo and a short bio. Their name and work are
                filled in from this application.
              </p>
              <Link
                href={`/admin/patrons/profiles/new?from=${patron.id}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary-800 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-900"
              >
                <UserPlus size={15} aria-hidden="true" /> Add to the Patrons Page
              </Link>
            </section>
          )}

          <section className="bg-white rounded-lg border border-danger/30 p-6">
            <h2 className="font-display font-bold text-base text-primary-950 mb-2">Delete</h2>
            {canDeletePatron(admin.role, patron.status) ? (
              <>
                <p className="text-sm text-slate mb-4">
                  Removes this {patron.status === "APPROVED" || patron.status === "SUSPENDED" ? "account" : "application"}{" "}
                  permanently. The audit log keeps a record of who it was.
                </p>
                <PatronDeleteButton
                  patronId={patron.id}
                  name={[patron.title, patron.fullName].filter(Boolean).join(" ")}
                  isAccount={patron.status === "APPROVED" || patron.status === "SUSPENDED"}
                />
              </>
            ) : (
              <p className="text-sm text-slate">
                Only a super admin can delete an approved or suspended patron account. To stop them signing in now,
                suspend the account instead.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
