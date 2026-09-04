import Link from "next/link";
import { User, Search, Users, CalendarDays, LogOut, Pencil, KeyRound } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { alumniLogoutAction } from "@/lib/actions/auth-actions";

export const metadata = { title: "Alumni Dashboard" };
export const dynamic = "force-dynamic";

function QuickNavLink({
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
      className="flex items-start gap-4 bg-white rounded-lg border border-line p-5 hover:border-primary-600 hover:shadow-sm transition-all"
    >
      <div className="w-11 h-11 rounded-full bg-primary-50 text-primary-800 flex items-center justify-center shrink-0">
        <Icon size={20} />
      </div>
      <div>
        <p className="font-display font-bold text-sm text-primary-950">{title}</p>
        <p className="text-xs text-slate mt-0.5">{description}</p>
      </div>
    </Link>
  );
}

export default async function AlumniDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordChanged?: string }>;
}) {
  const alumni = await requireAlumni();
  const sp = await searchParams;
  const firstName = alumni.fullName.split(" ")[0];

  return (
    <div className="bg-surface-muted min-h-[70vh]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        {sp.passwordChanged === "1" && (
          <div className="mb-5 rounded-lg border border-success bg-success-light text-success px-4 py-3 text-sm font-medium">
            Your password has been changed.
          </div>
        )}

        <div className="bg-white rounded-lg border border-line p-7 mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="w-16 h-16 rounded-full bg-primary-50 border border-line overflow-hidden flex items-center justify-center text-primary-300 shrink-0">
            {alumni.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={alumni.profileImageUrl} alt={alumni.fullName} className="w-full h-full object-cover" />
            ) : (
              <User size={26} />
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-display font-bold text-2xl text-primary-950">Welcome back, {firstName}!</h1>
            <p className="text-sm text-slate mt-1">
              {alumni.programme} · Class of {alumni.graduationYear}
            </p>
            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-3">
              <Link
                href="/alumni/profile"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
              >
                <Pencil size={14} /> Edit Profile
              </Link>
              <Link
                href="/alumni/profile#password"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
              >
                <KeyRound size={14} /> Change Password
              </Link>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <QuickNavLink
            href="/alumni/directory"
            icon={Search}
            title="Directory Search"
            description="Find and connect with fellow graduates."
          />
          <QuickNavLink
            href="/alumni/mentorship"
            icon={Users}
            title="Mentorship Board"
            description="Offer or find mentorship within the community."
          />
          <QuickNavLink
            href="/events"
            icon={CalendarDays}
            title="Upcoming Events & Reunions"
            description="See what's happening across the association."
          />
        </div>

        <form action={alumniLogoutAction} className="mt-8 text-center sm:text-left">
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
