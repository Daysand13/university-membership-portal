"use client";

import { useActionState, useState } from "react";
import { Loader2, GraduationCap, ShieldPlus, BookPlus, X, CheckCircle2 } from "lucide-react";
import {
  pushToAlumniArchiveAction,
  grantDualStatusAction,
  approveNewEnrollmentCycleAction,
} from "@/lib/actions/user-admin-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import {
  CAMPUSES,
  DISABILITY_CATEGORIES,
  ACADEMIC_DEPARTMENTS,
  PROGRAMS_OF_STUDY,
  LEVELS,
  POSTGRAD_DEPARTMENTS,
  POSTGRAD_PROGRAMS,
  POSTGRAD_LEVELS,
} from "@/lib/validations/membership";

type Panel = "archive" | "dual" | "cycle" | null;

export interface SuperpowerTarget {
  userId: string;
  name: string;
  email: string;
  roles: string[];
  currentIndexNumber: string | null;
  hasMemberRecord: boolean;
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  disabledReason,
}: {
  icon: typeof GraduationCap;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-primary-800 hover:border-primary-600 hover:text-accent-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-line disabled:hover:text-primary-800"
    >
      <Icon size={14} /> {label}
    </button>
  );
}

export function UserSuperpowerControls({ target }: { target: SuperpowerTarget }) {
  const [panel, setPanel] = useState<Panel>(null);

  const isAlumni = target.roles.includes("ALUMNI");
  const isMember = target.roles.includes("MEMBER");
  const thisYear = new Date().getFullYear();

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <ActionButton
          icon={GraduationCap}
          label="Push to Alumni Archive"
          onClick={() => setPanel(panel === "archive" ? null : "archive")}
          disabled={!target.hasMemberRecord}
          disabledReason="No student record to archive."
        />
        <ActionButton
          icon={ShieldPlus}
          label="Grant Dual Status"
          onClick={() => setPanel(panel === "dual" ? null : "dual")}
          disabled={isMember && isAlumni}
          disabledReason="Already holds both standings."
        />
        <ActionButton
          icon={BookPlus}
          label="Approve New Enrollment Cycle"
          onClick={() => setPanel(panel === "cycle" ? null : "cycle")}
        />
      </div>

      {panel && (
        <div className="mt-3 rounded-lg border border-line bg-surface-muted p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-xs text-slate">
              {panel === "archive" && "Ends their active studies and gives them alumni standing."}
              {panel === "dual" && "Attaches a standing they're entitled to but never acquired."}
              {panel === "cycle" && "Links a NEW index number for a returning student. The current cycle is closed, not overwritten."}
            </p>
            <button type="button" onClick={() => setPanel(null)} aria-label="Close" className="text-slate hover:text-ink shrink-0">
              <X size={15} />
            </button>
          </div>

          {panel === "archive" && <ArchiveForm target={target} thisYear={thisYear} />}
          {panel === "dual" && <DualStatusForm target={target} thisYear={thisYear} />}
          {panel === "cycle" && <NewCycleForm target={target} thisYear={thisYear} />}
        </div>
      )}
    </div>
  );
}

function Result({ state }: { state: { error?: string; success?: boolean } }) {
  return (
    <>
      <FormAlert message={state.error} />
      {state.success && (
        <p className="flex items-center gap-1.5 text-sm text-success bg-success-light rounded-md px-3 py-2">
          <CheckCircle2 size={15} /> Done.
        </p>
      )}
    </>
  );
}

function ArchiveForm({ target, thisYear }: { target: SuperpowerTarget; thisYear: number }) {
  const [state, formAction, isPending] = useActionState(pushToAlumniArchiveAction, initialActionState);
  const fe = state.fieldErrors ?? {};


  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="userId" value={target.userId} />
      <Result state={state} />
      <div className="max-w-[200px]">
        <Label htmlFor={`gradYear-${target.userId}`} required>Graduation Year</Label>
        <input
          id={`gradYear-${target.userId}`}
          name="graduationYear"
          type="number"
          required
          defaultValue={thisYear}
          className={inputClasses}
        />
        <FieldError messages={fe.graduationYear} />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending && <Loader2 size={14} className="animate-spin" />}
        {isPending ? "Archiving…" : "Confirm Archive"}
      </Button>
    </form>
  );
}

function DualStatusForm({ target, thisYear }: { target: SuperpowerTarget; thisYear: number }) {
  const [state, formAction, isPending] = useActionState(grantDualStatusAction, initialActionState);
  const [role, setRole] = useState(target.roles.includes("ALUMNI") ? "MEMBER" : "ALUMNI");
  const fe = state.fieldErrors ?? {};


  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="userId" value={target.userId} />
      <Result state={state} />
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`role-${target.userId}`} required>Standing to Grant</Label>
          <select
            id={`role-${target.userId}`}
            name="role"
            required
            className={inputClasses}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="ALUMNI" disabled={target.roles.includes("ALUMNI")}>Alumni</option>
            <option value="MEMBER" disabled={target.roles.includes("MEMBER")}>Member (student)</option>
          </select>
        </div>
        {role === "ALUMNI" && (
          <div>
            <Label htmlFor={`dualYear-${target.userId}`} required>Graduation Year</Label>
            <input
              id={`dualYear-${target.userId}`}
              name="graduationYear"
              type="number"
              required
              defaultValue={thisYear}
              className={inputClasses}
            />
            <FieldError messages={fe.graduationYear} />
          </div>
        )}
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending && <Loader2 size={14} className="animate-spin" />}
        {isPending ? "Granting…" : "Grant Standing"}
      </Button>
    </form>
  );
}

function NewCycleForm({ target, thisYear }: { target: SuperpowerTarget; thisYear: number }) {
  const [state, formAction, isPending] = useActionState(approveNewEnrollmentCycleAction, initialActionState);
  const [track, setTrack] = useState("UNDERGRADUATE");
  const fe = state.fieldErrors ?? {};


  const isPg = track === "POSTGRADUATE";
  const departments = isPg ? POSTGRAD_DEPARTMENTS : ACADEMIC_DEPARTMENTS;
  const programmes = isPg ? POSTGRAD_PROGRAMS : PROGRAMS_OF_STUDY;
  const levels = isPg ? POSTGRAD_LEVELS : LEVELS;

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="userId" value={target.userId} />
      <input type="hidden" name="applicationTrack" value={track} />
      <Result state={state} />

      {target.currentIndexNumber && (
        <p className="text-xs text-slate-light">
          Current index number <span className="font-data">{target.currentIndexNumber}</span> will be kept as history.
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`idx-${target.userId}`} required>New Index Number</Label>
          <input id={`idx-${target.userId}`} name="indexNumber" required className={`${inputClasses} font-data`} />
          <FieldError messages={fe.indexNumber} />
        </div>
        <div>
          <Label htmlFor={`track-${target.userId}`} required>Study Level</Label>
          <select
            id={`track-${target.userId}`}
            className={inputClasses}
            value={track}
            onChange={(e) => setTrack(e.target.value)}
          >
            <option value="UNDERGRADUATE">Undergraduate</option>
            <option value="POSTGRADUATE">Postgraduate</option>
          </select>
        </div>
        <div>
          <Label htmlFor={`dept-${target.userId}`}>Academic Department</Label>
          <select id={`dept-${target.userId}`} name="academicDepartment" defaultValue="" className={inputClasses}>
            <option value="">—</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor={`prog-${target.userId}`} required>Programme</Label>
          <select id={`prog-${target.userId}`} name="programme" required defaultValue="" className={inputClasses}>
            <option value="" disabled>Select…</option>
            {programmes.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <FieldError messages={fe.programme} />
        </div>
        <div>
          <Label htmlFor={`lvl-${target.userId}`} required>Level</Label>
          <select id={`lvl-${target.userId}`} name="level" required defaultValue="" className={inputClasses}>
            <option value="" disabled>Select…</option>
            {levels.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <FieldError messages={fe.level} />
        </div>
        <div>
          <Label htmlFor={`camp-${target.userId}`} required>Campus</Label>
          <select id={`camp-${target.userId}`} name="campus" required defaultValue="" className={inputClasses}>
            <option value="" disabled>Select…</option>
            {CAMPUSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <FieldError messages={fe.campus} />
        </div>
        <div>
          <Label htmlFor={`cat-${target.userId}`} required>Category of Special Needs</Label>
          <select id={`cat-${target.userId}`} name="department" required defaultValue="" className={inputClasses}>
            <option value="" disabled>Select…</option>
            {DISABILITY_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <FieldError messages={fe.department} />
        </div>
        <div>
          <Label htmlFor={`yoa-${target.userId}`} required>Year of Admission</Label>
          <input
            id={`yoa-${target.userId}`}
            name="yearOfAdmission"
            type="number"
            required
            defaultValue={thisYear}
            className={inputClasses}
          />
          <FieldError messages={fe.yearOfAdmission} />
        </div>
      </div>

      <Button type="submit" size="sm" disabled={isPending}>
        {isPending && <Loader2 size={14} className="animate-spin" />}
        {isPending ? "Approving…" : "Approve Enrollment Cycle"}
      </Button>
    </form>
  );
}
