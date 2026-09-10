import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, LogIn, UserPlus, Users, Globe2, Briefcase } from "lucide-react";
import { db } from "@/lib/db";
import { listFeaturedAlumni, getPublicAlumniStats } from "@/lib/services/alumni-showcase-service";
import { AlumniCard } from "@/components/alumni/AlumniCard";
import { EmptyState } from "@/components/ui/Common";

export const metadata: Metadata = { title: "Alumni" };
export const dynamic = "force-dynamic";

/** Admin-editable page copy, created on first read like AboutContent. */
async function getAlumniPageContent() {
  return db.alumniPageContent.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

function Stat({ icon: Icon, value, label }: { icon: typeof Users; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-white/10 text-accent-400 flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <p className="font-display font-bold text-xl text-white leading-none">{value}</p>
        <p className="text-xs text-primary-200 mt-1">{label}</p>
      </div>
    </div>
  );
}

export default async function AlumniPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordSet?: string }>;
}) {
  const [sp, content, featured, stats] = await Promise.all([
    searchParams,
    getAlumniPageContent(),
    listFeaturedAlumni(),
    getPublicAlumniStats(),
  ]);

  return (
    <div className="bg-surface-muted">
      {/* Hero */}
      <div className="relative bg-primary-950 text-white overflow-hidden">
        {content.heroImageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={content.heroImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-25"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary-950 via-primary-950/85 to-primary-950/40" />
          </>
        )}

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          {/* Account actions sit top-right on desktop and stack above the
              heading on mobile, so they stay reachable without crowding the
              header itself. */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="max-w-2xl">
              <p className="kicker text-accent-400">{content.heroKicker}</p>
              <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mt-3 text-balance">
                {content.heroTitle}
              </h1>
              <p className="text-primary-100 leading-relaxed mt-4 text-sm sm:text-base">
                {content.heroDescription}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 shrink-0">
              <Link
                href="/alumni/login"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <LogIn size={15} /> Sign In
              </Link>
              <Link
                href="/alumni/register"
                className="inline-flex items-center gap-1.5 rounded-md bg-accent-500 px-4 py-2.5 text-sm font-semibold text-primary-950 hover:bg-accent-400 transition-colors shadow-sm"
              >
                <UserPlus size={15} /> Register New Account
              </Link>
            </div>
          </div>

          {stats.total > 0 && (
            <div className="mt-10 pt-8 border-t border-white/15 grid grid-cols-2 lg:grid-cols-4 gap-6">
              <Stat icon={Users} value={stats.total} label="Alumni featured publicly" />
              {stats.graduationYears > 0 && (
                <Stat icon={GraduationCap} value={stats.graduationYears} label="Graduating years" />
              )}
              {stats.industries > 0 && (
                <Stat icon={Briefcase} value={stats.industries} label="Industries represented" />
              )}
              {stats.countries > 0 && (
                <Stat icon={Globe2} value={stats.countries} label="Countries represented" />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {sp.passwordSet === "1" && (
          <div className="mb-8 rounded-lg border border-success bg-success-light text-success px-4 py-3 text-sm font-medium">
            Your password has been set. Sign in to continue.
          </div>
        )}

        <div className="max-w-2xl">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-primary-950">
            {content.showcaseTitle}
          </h2>
          <p className="text-slate leading-relaxed mt-2">{content.showcaseDescription}</p>
          <div className="w-16 h-1 bg-accent-500 rounded mt-4" />
        </div>

        {featured.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={<GraduationCap size={28} />}
              title="Alumni spotlights are on the way"
              description="Featured graduates will appear here soon. In the meantime, sign in to reach the alumni directory."
            />
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((alumnus) => (
              <AlumniCard key={alumnus.id} alumnus={alumnus} />
            ))}
          </div>
        )}

        {/* Closing call to action — the account functions again, for anyone
            who scrolled the whole way rather than starting at the top. */}
        <div className="mt-14 rounded-lg border border-line bg-white p-8 sm:p-10 text-center">
          <h2 className="font-display font-bold text-xl sm:text-2xl text-primary-950">
            Are you a graduate of the association?
          </h2>
          <p className="text-sm text-slate mt-2 max-w-xl mx-auto leading-relaxed">
            Join the alumni community to reach the directory, mentor current students, and stay connected with
            everything happening across the association.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/alumni/register"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-900 transition-colors"
            >
              <UserPlus size={15} /> Register New Account
            </Link>
            <Link
              href="/alumni/login"
              className="inline-flex items-center gap-1.5 rounded-md border border-primary-800 px-5 py-2.5 text-sm font-semibold text-primary-800 hover:bg-primary-50 transition-colors"
            >
              <LogIn size={15} /> Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
