"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { setMemberStatusAction } from "@/lib/actions/membership-actions";
import { MemberStatus } from "@/generated/prisma/enums";

const OPTIONS: { value: MemberStatus; label: string }[] = [
  { value: MemberStatus.ACTIVE, label: "Active" },
  { value: MemberStatus.SUSPENDED, label: "Suspended" },
  { value: MemberStatus.INACTIVE, label: "Inactive" },
];

export function MemberStatusControl({ memberId, status }: { memberId: string; status: MemberStatus }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={isPending || status === opt.value}
          onClick={() => startTransition(() => setMemberStatusAction(memberId, opt.value))}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors disabled:cursor-default ${
            status === opt.value
              ? "bg-primary-800 text-white border-primary-800"
              : "border-line text-slate hover:border-primary-300"
          }`}
        >
          {opt.label}
        </button>
      ))}
      {isPending && <Loader2 size={14} className="animate-spin text-slate" />}
    </div>
  );
}
