import Link from "next/link";
import { requireMember } from "@/lib/auth/member";
import { memberLogoutAction } from "@/lib/actions/auth-actions";
import { LogOut } from "lucide-react";

export default async function MemberDashboardLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember();

  return (
    <div className="bg-surface-muted min-h-[70vh]">
      <div className="bg-primary-950 text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-between">
          <div>
            <p className="kicker kicker-on-dark mb-1">Member Dashboard</p>
            <h1 className="font-display font-bold text-2xl">
              Welcome, {member.firstName}
            </h1>
          </div>
          <form action={memberLogoutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-sm font-medium text-primary-100 hover:text-white border border-white/20 rounded-md px-3.5 py-2 hover:bg-white/10 transition-colors"
            >
              <LogOut size={15} /> Log Out
            </button>
          </form>
        </div>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6 text-sm border-t border-white/10 -mb-px">
            <Link href="/membership/dashboard" className="py-3 border-b-2 border-accent-500 text-white font-medium">
              Overview
            </Link>
            <Link
              href="/membership/dashboard/change-password"
              className="py-3 border-b-2 border-transparent text-primary-200 hover:text-white"
            >
              Change Password
            </Link>
          </nav>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">{children}</div>
    </div>
  );
}
