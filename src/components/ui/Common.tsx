import type { ReactNode } from "react";
import Link from "next/link";

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-lg border border-dashed border-line bg-surface-muted">
      {icon && <div className="mb-4 text-slate-light">{icon}</div>}
      <h3 className="text-lg font-semibold text-primary-950">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-slate max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) return null;
  const pageHref = (page: number) => `${basePath}${basePath.includes("?") ? "&" : "?"}page=${page}`;

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-10" aria-label="Pagination">
      <Link
        href={pageHref(Math.max(1, currentPage - 1))}
        aria-disabled={currentPage === 1}
        className={`px-3 py-1.5 rounded-md text-sm border border-line ${
          currentPage === 1 ? "pointer-events-none text-slate-light" : "text-primary-800 hover:bg-primary-50"
        }`}
      >
        Previous
      </Link>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <Link
          key={page}
          href={pageHref(page)}
          className={`w-9 h-9 flex items-center justify-center rounded-md text-sm font-medium ${
            page === currentPage
              ? "bg-primary-800 text-white"
              : "text-primary-800 hover:bg-primary-50 border border-line"
          }`}
        >
          {page}
        </Link>
      ))}
      <Link
        href={pageHref(Math.min(totalPages, currentPage + 1))}
        aria-disabled={currentPage === totalPages}
        className={`px-3 py-1.5 rounded-md text-sm border border-line ${
          currentPage === totalPages
            ? "pointer-events-none text-slate-light"
            : "text-primary-800 hover:bg-primary-50"
        }`}
      >
        Next
      </Link>
    </nav>
  );
}

export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-sm text-danger">{messages[0]}</p>;
}

export function FormAlert({ message, variant = "error" }: { message?: string; variant?: "error" | "success" }) {
  if (!message) return null;
  const styles =
    variant === "error" ? "bg-danger-light text-danger border-danger/20" : "bg-success-light text-success border-success/20";
  return <div className={`rounded-md border px-4 py-3 text-sm ${styles}`}>{message}</div>;
}

export function Label({ htmlFor, children, required }: { htmlFor: string; children: ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-primary-950 mb-1.5">
      {children}
      {required && <span className="text-danger ml-0.5">*</span>}
    </label>
  );
}

export const inputClasses =
  "block w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-light focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none transition-colors";
