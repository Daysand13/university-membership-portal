import { AcademicOptionList } from "@/components/admin/AcademicOptionList";
import { getAcademicOptions } from "@/lib/services/academic-options-service";

export const metadata = { title: "Departments & Programmes" };
export const dynamic = "force-dynamic";

const TRACKS = [
  { track: "UNDERGRADUATE", title: "Undergraduate Registration Form" },
  { track: "POSTGRADUATE", title: "Postgraduate Registration Form" },
] as const;

export default async function AcademicOptionsPage() {
  const options = await getAcademicOptions();

  return (
    <div>
      <div className="mb-6 max-w-3xl">
        <h1 className="font-display font-bold text-2xl text-primary-950">Departments &amp; Programmes</h1>
        <p className="text-sm text-slate mt-1 leading-relaxed">
          Choose what applicants can pick as their academic department and programme of study. Changes apply
          straight away to the registration forms and the alumni &ldquo;Register for Further Studies&rdquo; form.
          Removing an option only stops it being offered — members who already chose it keep it on their record.
        </p>
      </div>

      <div className="space-y-10">
        {TRACKS.map(({ track, title }) => (
          <section key={track} aria-labelledby={`${track}-heading`}>
            <h2 id={`${track}-heading`} className="font-display font-bold text-lg text-primary-950 mb-4">
              {title}
            </h2>
            <div className="grid gap-6 xl:grid-cols-2">
              <AcademicOptionList
                track={track}
                kind="departments"
                title="Academic Departments"
                noun="academic department"
                items={options[track].departments}
              />
              <AcademicOptionList
                track={track}
                kind="programmes"
                title="Programmes of Study"
                noun="programme of study"
                items={options[track].programmes}
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
