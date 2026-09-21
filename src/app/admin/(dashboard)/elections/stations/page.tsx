import Link from "next/link";
import { ChevronLeft, MonitorSmartphone } from "lucide-react";
import { requireCapability } from "@/lib/auth/admin";
import { EmptyState } from "@/components/ui/Common";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { RegisterStationForm, ReissueKeyForm } from "@/components/admin/forms/BallotForms";
import { setStationActiveAction } from "@/lib/actions/ballot-actions";
import { listStations } from "@/lib/services/polling-station-service";

export const metadata = { title: "Polling Terminals" };
export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("en-GH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Accra",
});

/**
 * The machines standing in the halls on polling day.
 *
 * Each is registered here and given a key, which the commission's officer
 * types into ASSN Ballot when they set the terminal up. The key is shown
 * once and stored only as a hash — exactly like a password — so a terminal
 * whose key has been seen by the wrong people is given a new one rather
 * than having the old one looked up.
 */
export default async function PollingStationsPage() {
  await requireCapability("elections.stations");
  const stations = await listStations();

  return (
    <div className="max-w-4xl">
      <Link href="/admin/elections" className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4">
        <ChevronLeft size={16} aria-hidden="true" /> Elections
      </Link>

      <h1 className="font-display font-bold text-2xl text-primary-950">Polling terminals</h1>
      <p className="text-sm text-slate mt-1 mb-6 max-w-2xl">
        The workstations ASSN Ballot runs on. A terminal identifies itself with its code and key on every request; if
        it has neither, it cannot take a vote.
      </p>

      <section className="bg-white rounded-lg border border-line p-6 mb-6">
        <h2 className="font-display font-bold text-base text-primary-950 mb-4">Register a terminal</h2>
        <RegisterStationForm />
      </section>

      {stations.length === 0 ? (
        <EmptyState
          icon={<MonitorSmartphone size={28} aria-hidden="true" />}
          title="No terminals registered"
          description="Register one for each workstation that will be taking votes."
        />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Code</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Where it stands</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Ballots</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Last heard from</th>
                <th scope="col" className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {stations.map((station) => (
                <tr key={station.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5 font-data font-semibold text-primary-950">{station.code}</td>
                  <td className="px-5 py-3.5 text-slate">{station.name}</td>
                  <td className="px-5 py-3.5 text-slate">{station._count.ballots}</td>
                  <td className="px-5 py-3.5 text-slate">
                    {station.lastSeenAt ? dateTime.format(station.lastSeenAt) : "Never"}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-3">
                      <StatusBadge status={station.isActive ? "ACTIVE" : "INACTIVE"} />
                      <ReissueKeyForm stationId={station.id} code={station.code} />
                      <ConfirmButton
                        action={setStationActiveAction.bind(null, station.id, !station.isActive)}
                        confirmMessage={
                          station.isActive
                            ? `Stop ${station.code} taking votes? It will be refused at once, mid-session or not.`
                            : `Let ${station.code} take votes again?`
                        }
                        className="text-xs font-semibold text-slate hover:text-primary-800"
                      >
                        {station.isActive ? "Suspend" : "Allow"}
                      </ConfirmButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
