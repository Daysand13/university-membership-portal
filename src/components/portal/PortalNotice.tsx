import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

const TONES = {
  success: { classes: "border-success bg-success-light text-success", Icon: CheckCircle2 },
  warning: { classes: "border-warning bg-warning-light text-warning", Icon: AlertTriangle },
  danger: { classes: "border-danger bg-danger-light text-danger", Icon: XCircle },
  info: { classes: "border-line bg-white text-ink", Icon: Info },
} as const;

/** A one-line message at the top of a portal page (payment result, password changed…). */
export function PortalNotice({
  tone,
  children,
  action,
}: {
  tone: keyof typeof TONES;
  children: ReactNode;
  action?: ReactNode;
}) {
  const { classes, Icon } = TONES[tone];
  return (
    <div role="status" className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-lg border px-4 py-3 text-[15px] font-medium ${classes}`}>
      <div className="flex items-start gap-2.5 flex-1">
        <Icon size={18} aria-hidden="true" className="shrink-0 mt-0.5" />
        <span>{children}</span>
      </div>
      {action && <div className="shrink-0 sm:ml-auto pl-7 sm:pl-0">{action}</div>}
    </div>
  );
}
