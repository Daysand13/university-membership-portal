import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { UnifiedLoginForm } from "@/components/forms/UnifiedLoginForm";
import { getCurrentUser, landingPathFor } from "@/lib/auth/user";

export const metadata = { title: "Sign In" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Already signed in — send them where they belong rather than showing a
  // login form they don't need.
  const session = await getCurrentUser();
  if (session && session.roles.length > 0) {
    redirect(landingPathFor(session.roles));
  }

  return (
    <div className="bg-surface-muted min-h-[70vh] flex items-center">
      <div className="mx-auto w-full max-w-md px-4 sm:px-6 py-14">
        <div className="text-center mb-7">
          <div className="w-12 h-12 rounded-full bg-primary-800 text-white flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={22} />
          </div>
          <h1 className="font-display font-bold text-2xl text-primary-950">Sign In</h1>
          <p className="text-sm text-slate mt-1.5">
            One sign-in for the Member Portal and the Alumni Network.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-line p-6 sm:p-7">
          <UnifiedLoginForm />

          <div className="mt-6 pt-5 border-t border-line space-y-2 text-center text-sm">
            <p>
              <Link href="/membership/forgot-password" className="font-semibold text-primary-800 hover:text-accent-600">
                Forgot your password?
              </Link>
            </p>
            <p className="text-slate">
              Not a member yet?{" "}
              <Link href="/membership/enroll" className="font-semibold text-primary-800 hover:text-accent-600">
                Apply for membership
              </Link>
            </p>
            <p className="text-slate">
              Graduated before the portal existed?{" "}
              <Link href="/alumni" className="font-semibold text-primary-800 hover:text-accent-600">
                Register as alumni
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-light mt-5">
          Administrators sign in at{" "}
          <Link href="/admin/login" className="underline hover:text-primary-800">
            the admin portal
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
