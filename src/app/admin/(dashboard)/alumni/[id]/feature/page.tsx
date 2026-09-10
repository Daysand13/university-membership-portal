import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe, EyeOff } from "lucide-react";
import { getAlumniForSpotlightEditor } from "@/lib/services/alumni-spotlight-admin-service";
import { setAlumniPublicProfileAction, removeAlumniSpotlightAction } from "@/lib/actions/alumni-showcase-actions";
import { AlumniSpotlightForm } from "@/components/admin/AlumniSpotlightForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export const metadata = { title: "Feature Alumnus" };
export const dynamic = "force-dynamic";

export default async function FeatureAlumnusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alumni = await getAlumniForSpotlightEditor(id);
  if (!alumni) notFound();

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/alumni"
        className="inline-flex items-center gap-1.5 text-sm text-slate hover:text-primary-800 mb-4"
      >
        <ArrowLeft size={15} /> Alumni
      </Link>

      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Feature {alumni.fullName}</h1>
        <p className="text-sm text-slate mt-1">
          {alumni.programme} · Class of {alumni.graduationYear}
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary-950">
              {alumni.publicProfile ? "Public profile is on" : "Public profile is off"}
            </p>
            <p className="text-xs text-slate mt-0.5">
              {alumni.publicProfile ? (
                <>
                  Visible on the public site
                  {alumni.publicSlug ? (
                    <>
                      {" "}at{" "}
                      <Link href={`/alumni/${alumni.publicSlug}`} className="underline">
                        /alumni/{alumni.publicSlug}
                      </Link>
                    </>
                  ) : null}
                  .
                </>
              ) : (
                "Nothing about this person appears on the public website. Saving a published spotlight below turns this on."
              )}
            </p>
          </div>
          {alumni.publicProfile && (
            <ConfirmButton
              action={setAlumniPublicProfileAction.bind(null, alumni.id, false)}
              confirmMessage={`Remove ${alumni.fullName} from the public website? Their spotlight will also be unpublished.`}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-light"
            >
              <EyeOff size={14} /> Make private
            </ConfirmButton>
          )}
        </div>
      </div>

      <AlumniSpotlightForm alumni={alumni} />

      {alumni.spotlight && (
        <div className="mt-6 rounded-lg border border-line bg-white p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary-950">Remove this spotlight</p>
            <p className="text-xs text-slate mt-0.5">
              Deletes the spotlight content. Their account and public profile page are untouched.
            </p>
          </div>
          <ConfirmButton
            action={removeAlumniSpotlightAction.bind(null, alumni.id)}
            confirmMessage={`Remove the spotlight for ${alumni.fullName}? The written content will be lost.`}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-light"
          >
            <Globe size={14} /> Remove spotlight
          </ConfirmButton>
        </div>
      )}
    </div>
  );
}
