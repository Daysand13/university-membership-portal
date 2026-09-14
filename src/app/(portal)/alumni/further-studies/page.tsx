import { requireAlumni } from "@/lib/auth/alumni";
import { FurtherStudiesForm } from "@/components/forms/FurtherStudiesForm";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { getAcademicOptions } from "@/lib/services/academic-options-service";
import { getSpecialNeedsCategories } from "@/lib/services/special-needs-category-service";

export const metadata = { title: "Register for Further Studies" };
export const dynamic = "force-dynamic";

export default async function FurtherStudiesPage() {
  const [alumni, academicOptions, specialNeedsCategories] = await Promise.all([
    requireAlumni(),
    getAcademicOptions(),
    getSpecialNeedsCategories(),
  ]);

  return (
    <>
      <PortalPageHeader
        title="Register for Further Studies"
        description="Furthering your education at UEW? Submit your new academic details below to apply for current membership again. Once approved, you'll be able to use the Student Portal with your new index number, alongside your existing alumni account."
      />
      <div className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-7 max-w-4xl">
        <FurtherStudiesForm
          alumni={alumni}
          academicOptions={academicOptions}
          specialNeedsCategories={specialNeedsCategories}
        />
      </div>
    </>
  );
}
