"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { createTeamMemberAction, updateTeamMemberAction } from "@/lib/actions/content-actions";
import { Label, inputClasses } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import type { TeamMember, TeamMemberType } from "@/generated/prisma/client";

export function TeamMemberForm({ type, member }: { type: TeamMemberType; member?: TeamMember }) {
  const [isPending, setIsPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    try {
      formData.set("type", type);
      if (member) {
        await updateTeamMemberAction(member.id, formData);
      } else {
        await createTeamMemberAction(formData);
        formRef.current?.reset();
      }
    } finally {
      setIsPending(false);
    }
  }

  const idBase = member?.id ?? `new-${type}`;

  return (
    <form ref={formRef} action={handleSubmit} className="grid sm:grid-cols-2 gap-4 items-start">
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
