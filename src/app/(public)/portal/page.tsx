import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, BookOpen, ShieldCheck, LogOut } from "lucide-react";
import { requireUser, landingPathFor } from "@/lib/auth/user";
import { unifiedLogoutAction } from "@/lib/actions/auth-actions";
import { formatFullName } from "@/lib/format";

export const metadata = { title: "Choose Portal" };
export const dynamic = "force-dynamic";

function PortalCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 bg-white rounded-lg border border-line p-6 hover:border-primary-600 hover:shadow-sm transition-all"
    >
      <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-800 flex items-center justify-center shrink-0">
        <Icon size={22} />
      </div>
      <div>
        <p className="font-display font-bold text-base text-primary-950">{title}</p>
        <p className="text-sm text-slate mt-1 leading-relaxed">{description}</p>
      </div>
    </Link>
  );
}

export default async function PortalHubPage() {
  const session = await requireUser();

  // Only reachable when someone genuinely holds more than one standing —
  // anyone with a single role has nothing to choose, so send them straight
  // through rather than making them click past this.
  const choices = session.roles.filter((r) => r === "MEMBER" || r === "ALUMNI");
  if (choices.length < 2) {
    redirect(landingPathFor(session.roles));
  }

  const firstName = session.user.firstName;

  return (
    <div className="bg-surface-muted min-h-[70vh] flex items-center">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-14">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-2xl text-primary-950">Welcome back, {firstName}!</h1>
          <p className="text-sm text-slate mt-2 leading-relaxed">
            You&apos;re both a current student and an alumnus of the association. Choose where you&apos;d like to
            go — you can switch back at any time.
          </p>
        </div>

        <div className="grid gap-4">
          <PortalCard
            href="/membership/dashboard"
            icon={BookOpen}
            title="Student Portal"
            description="Your current studies, membership details and support needs."
          />
          <PortalCard
            href="/alumni/dashboard"
            icon={GraduationCap}
            title="Alumni Portal"
            description="The alumni directory, mentorship board and reunions."
          />
          {session.roles.includes("ADMIN") && (
            <PortalCard
              href="/admin"
              icon={ShieldCheck}
              title="Admin Dashboard"
              description="Manage members, applications and association content."
            />
          )}
        </div>

        <p className="text-center text-sm text-slate mt-6">
          Signed in as {formatFullName(session.user.firstName, session.user.middleName, session.user.lastName)} ·{" "}
          {session.user.email}
        </p>

        <form action={unifiedLogoutAction} className="mt-4 text-center">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-danger hover:text-red-800"
          >
            <LogOut size={15} /> Log Out
          </button>
        </form>
      </div>
    </div>
  );
}
