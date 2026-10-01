import { Smartphone } from "lucide-react";
import { requireCapability } from "@/lib/auth/admin";
import { listReleases } from "@/lib/services/app-release-service";
import { db } from "@/lib/db";
import { AppReleaseForm } from "@/components/admin/forms/AppReleaseForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/ui/Common";
import { setReleasePublishedAction } from "@/lib/actions/app-release-actions";

export const metadata = { title: "App releases" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Accra",
});

function sizeLabel(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Builds of the Android app, and which one phones are offered.
 *
 * The app is not on Google Play, so this page is how an update reaches
 * anybody — and equally, whatever is published here is what a thousand
 * phones will download. It is nearer to a deployment than to a settings
 * page, which is why saving and publishing are two separate steps.
 */
export default async function AppReleasesPage() {
  await requireCapability("site.settings");

  const [releases, phones] = await Promise.all([
    listReleases(),
    db.mobileDevice.count({ where: { revokedAt: null } }),
  ]);

  const highest = releases[0]?.buildNumber ?? 0;

  const columns: Column<(typeof releases)[number]>[] = [
    {
      header: "Version",
      cell: (release) => (
        <>
          <p className="font-medium text-primary-950">{release.version}</p>
          <span className="block text-xs text-slate">Build {release.buildNumber}</span>
        </>
      ),
    },
    {
      header: "Offered to phones",
      cell: (release) =>
        release.published ? (
          <span className="text-xs font-semibold text-success">Yes</span>
        ) : (
          <span className="text-xs font-semibold text-slate-light">Not yet</span>
        ),
    },
    {
      header: "Required",
      cell: (release) =>
        release.minimumBuild > 0 ? `Below build ${release.minimumBuild} is stopped` : "No — people may wait",
    },
    { header: "Size", cell: (release) => sizeLabel(release.sizeBytes) },
    { header: "Added", cell: (release) => dateFormat.format(release.releasedAt) },
    {
      header: "Actions",
      actions: true,
      cell: (release) => (
        <ConfirmButton
          action={setReleasePublishedAction.bind(null, release.id, !release.published)}
          confirmMessage={
            release.published
              ? `Stop offering ${release.version}? Phones that already installed it keep it — this only stops it being offered to the rest.`
              : `Offer ${release.version} to every phone with the app? They will be prompted to download ${sizeLabel(release.sizeBytes)}.`
          }
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-semibold text-primary-950 hover:bg-surface-muted"
        >
          {release.published ? "Stop offering" : "Publish"}
          <span className="sr-only"> {release.version}</span>
        </ConfirmButton>
      ),
    },
  ];

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-1">App releases</h1>
      <p className="text-sm text-slate mb-6 max-w-3xl">
        Builds of the Android app. The app isn&apos;t on Google Play, so this is how an update reaches anybody —
        and whatever is published here is what every phone downloads and offers to install.{" "}
        {phones > 0 ? (
          <>
            <strong>{phones}</strong> phone{phones === 1 ? " has" : "s have"} the app at the moment.
          </>
        ) : (
          "No phones have the app yet."
        )}
      </p>

      <section className="bg-white rounded-lg border border-line p-4 sm:p-6 mb-8">
        <h2 className="font-display font-bold text-base text-primary-950 mb-4">Record a new build</h2>
        <AppReleaseForm nextBuildNumber={highest + 1} />
      </section>

      <h2 className="font-display font-bold text-base text-primary-950 mb-3">Builds so far</h2>
      {releases.length === 0 ? (
        <EmptyState
          icon={<Smartphone size={28} aria-hidden="true" />}
          title="No builds recorded yet"
          description="Build the app with EAS, then choose the APK in the form above — it uploads and fills itself in."
        />
      ) : (
        <DataTable caption="App releases" rows={releases} rowKey={(release) => release.id} columns={columns} />
      )}
    </div>
  );
}
