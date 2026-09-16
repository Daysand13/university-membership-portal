import Link from "next/link";
import { requirePatron } from "@/lib/auth/patron";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PatronPasswordForm, PatronProfileForm } from "@/components/forms/PatronAccountForms";

export const metadata = { title: "Account Settings" };
export const dynamic = "force-dynamic";

export default async function PatronAccountPage() {
  const patron = await requirePatron();

  return (
    <>
      <PortalPageHeader title="Account Settings" description="Keep your details up to date, and change your password." />

      <div className="space-y-6">
        <section
          aria-labelledby="details-heading"
          className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6"
        >
          <h2 id="details-heading" className="font-display font-bold text-lg text-primary-950">
            Your Details
          </h2>
          <p className="mt-1 mb-5 text-sm text-slate">
            You sign in with <strong className="text-primary-950">{patron.email}</strong>. To change this email address,{" "}
            <Link href="/contact" className="font-semibold text-primary-800 underline hover:text-accent-600">
              contact the association
            </Link>
            .
          </p>
          <PatronProfileForm
            initial={{
              title: patron.title ?? "",
              fullName: patron.fullName,
              phone: patron.phone,
              occupation: patron.occupation,
              organization: patron.organization ?? "",
              jobTitle: patron.jobTitle ?? "",
              address: patron.address ?? "",
              region: patron.region ?? "",
            }}
          />
        </section>

        <section
          id="password"
          aria-labelledby="password-heading"
          className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6 max-w-2xl scroll-mt-24"
        >
          <h2 id="password-heading" className="font-display font-bold text-lg text-primary-950 mb-4">
            Change Password
          </h2>
          <PatronPasswordForm />
        </section>
      </div>
    </>
  );
}
