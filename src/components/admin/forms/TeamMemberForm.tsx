"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { createTeamMemberAction, updateTeamMemberAction } from "@/lib/actions/content-actions";
import { Label, inputClasses, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { formatFullName } from "@/lib/format";
import type { TeamMember, TeamMemberType } from "@/generated/prisma/client";

interface LinkableMember {
  id: string;
  indexNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
}

export function TeamMemberForm({
  type,
  member,
  linkableMembers,
}: {
  type: TeamMemberType;
  member?: TeamMember;
  /** Only meaningful for LEADERSHIP — linking a Patron to a paying member
   *  account has no effect on dues, so the picker is Leadership-only. */
  linkableMembers?: LinkableMember[];
}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setError(null);
    try {
      formData.set("type", type);
      const result = member
        ? await updateTeamMemberAction(member.id, formData)
        : await createTeamMemberAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (!member) formRef.current?.reset();
    } finally {
      setIsPending(false);
    }
  }

  const idBase = member?.id ?? `new-${type}`;

  return (
    <form ref={formRef} action={handleSubmit} className="grid sm:grid-cols-2 gap-4 items-start">
      {error && (
        <div className="sm:col-span-2">
          <FormAlert message={error} />
        </div>
      )}
      <div className="sm:col-span-2">
        <ImageUploadField
          name="photoUrl"
          category="PROFILE"
          label="Photo"
          defaultUrl={member?.photoUrl}
          aspect="aspect-square"
        />
      </div>
      <div>
        <Label htmlFor={`name-${idBase}`} required>Name</Label>
        <input id={`name-${idBase}`} name="name" required defaultValue={member?.name} className={inputClasses} />
      </div>
      <div>
        <Label htmlFor={`position-${idBase}`} required>Position</Label>
        <input
          id={`position-${idBase}`}
          name="position"
          required
          defaultValue={member?.position}
          placeholder={type === "PATRON" ? "e.g., Patron, Vice-Chancellor" : "e.g., President"}
          className={inputClasses}
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={`bio-${idBase}`}>Brief Information</Label>
        <textarea id={`bio-${idBase}`} name="bio" rows={3} defaultValue={member?.bio ?? ""} className={inputClasses} />
      </div>
      {linkableMembers && (
        <div className="sm:col-span-2">
          <Label htmlFor={`memberId-${idBase}`}>Linked Member Account</Label>
          <select
            id={`memberId-${idBase}`}
            name="memberId"
            defaultValue={member?.memberId ?? ""}
            className={inputClasses}
          >
            <option value="">Not linked to an account</option>
            {linkableMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {formatFullName(m.firstName, m.middleName, m.lastName)} — {m.indexNumber}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-slate-light">
            Links this listing to the person&apos;s actual member account, so their yearly dues are
            charged at the Executive rate instead of their level/track rate.
          </p>
        </div>
      )}
      <div>
        <Label htmlFor={`order-${idBase}`}>Display Order</Label>
        <input
          id={`order-${idBase}`}
          name="order"
          type="number"
          defaultValue={member?.order ?? 0}
          className={inputClasses}
        />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={member?.isActive ?? true}
            className="h-4 w-4 rounded border-line text-primary-800"
          />
          Active
        </label>
        <Button type="submit" disabled={isPending} size="sm">
          {isPending && <Loader2 size={14} className="animate-spin" />}
          {isPending ? "Saving…" : member ? "Update" : "Add"}
        </Button>
      </div>
    </form>
  );
}
