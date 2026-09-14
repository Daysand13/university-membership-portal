"use client";

import { addAcademicOptionAction, removeAcademicOptionAction } from "@/lib/actions/academic-options-actions";
import { OptionListEditor } from "@/components/admin/OptionListEditor";

/** One editable academic list — e.g. Undergraduate › Programmes of Study. */
export function AcademicOptionList({
  track,
  kind,
  title,
  noun,
  items,
}: {
  track: "UNDERGRADUATE" | "POSTGRADUATE";
  kind: "departments" | "programmes";
  title: string;
  /** Singular, lower case — "academic department". */
  noun: string;
  items: string[];
}) {
  return (
    <OptionListEditor
      title={title}
      noun={noun}
      items={items}
      addAction={addAcademicOptionAction}
      removeAction={removeAcademicOptionAction}
      hiddenFields={{ track, kind }}
      placeholder={kind === "programmes" ? "e.g. BSc Mathematics Education" : "e.g. Special Education"}
      addedMessage="Added. It now appears on the registration form."
      removeWarning="Applicants will no longer be able to choose it. Members who already chose it keep it on their record."
    />
  );
}
