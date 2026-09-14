import { OptionListEditor } from "@/components/admin/OptionListEditor";
import {
  addSpecialNeedsCategoryAction,
  removeSpecialNeedsCategoryAction,
} from "@/lib/actions/special-needs-category-actions";
import { getSpecialNeedsCategories } from "@/lib/services/special-needs-category-service";

export const metadata = { title: "Special Needs Categories" };
export const dynamic = "force-dynamic";

export default async function SpecialNeedsCategoriesPage() {
  const categories = await getSpecialNeedsCategories();

  return (
    <div>
      <div className="mb-6 max-w-3xl">
        <h1 className="font-display font-bold text-2xl text-primary-950">Categories of Special Needs</h1>
        <p className="text-sm text-slate mt-1 leading-relaxed">
          Choose what applicants can pick as their category of special needs. Changes apply straight away to the
          undergraduate and postgraduate registration forms, the alumni &ldquo;Register for Further Studies&rdquo;
          form, and member editing. Removing a category only stops it being offered — members who already chose it
          keep it on their record.
        </p>
      </div>

      <div className="max-w-2xl">
        <OptionListEditor
          title="Categories of Special Needs"
          noun="category of special needs"
          items={categories}
          addAction={addSpecialNeedsCategoryAction}
          removeAction={removeSpecialNeedsCategoryAction}
          placeholder="e.g. Albinism"
          addedMessage="Added. It now appears on the registration forms."
          removeWarning="Applicants will no longer be able to choose it. Members who already chose it keep it on their record."
        />
      </div>
    </div>
  );
}
