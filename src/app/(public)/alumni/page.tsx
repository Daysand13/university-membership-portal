import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AlumniAuthTabs } from "@/components/forms/AlumniAuthTabs";

export const metadata: Metadata = { title: "Alumni Network & Member Portal" };

export default async function AlumniPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; passwordSet?: string }>;
}) {
  const sp = await searchParams;
  const initialTab = sp.next === "login" ? "signin" : "signin";

  return (
    <div className="bg-surface-muted min-h-[70vh]">
      <div className="bg-primary-950 text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 text-center">
          <SectionHeading
            kicker="Alumni Network"
            title="Alumni Network & Member Portal"
            description="Welcome back to your community! Sign in to access the exclusive directory, connect with fellow graduates, and mentor current students, or register below if you are joining for the first time."
            align="center"
            onDark
          />
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12">
        {sp.passwordSet === "1" && (
          <div className="mb-5 rounded-lg border border-success bg-success-light text-success px-4 py-3 text-sm font-medium">
            Your password has been set. Sign in below to continue.
          </div>
        )}
        <AlumniAuthTabs initialTab={initialTab} />
      </div>
    </div>
  );
}
