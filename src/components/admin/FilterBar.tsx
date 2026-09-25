import Link from "next/link";
import { Search } from "lucide-react";

/**
 * The row of filters above an admin list.
 *
 * Every control here is labelled. They used to be bare boxes whose only
 * hint was placeholder text, which disappears the moment you type and is
 * never announced as a name — so a screen reader read an admin filter row
 * as "edit, combo box, combo box, combo box". The labels are visible too:
 * on a phone, where these stack, a column of unlabelled dropdowns is no
 * clearer to the eye than it is to the ear.
 */

export const filterControlClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none";

export function FilterBar({ children, action }: { children: React.ReactNode; action?: string }) {
  return (
    <form
      action={action}
      className="mb-6 bg-white rounded-lg border border-line p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {children}
    </form>
  );
}

export function FilterField({
  id,
  label,
  children,
  wide = false,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  /** Spans two columns where there is room — for a search box. */
  wide?: boolean;
}) {
  return (
    <div className={wide ? "lg:col-span-2" : undefined}>
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

/** The search box every admin list has, named rather than merely hinted at. */
export function FilterSearch({
  id = "filter-q",
  label = "Search",
  name = "q",
  defaultValue,
  placeholder,
  wide = true,
}: {
  id?: string;
  label?: string;
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <FilterField id={id} label={label} wide={wide}>
      <div className="relative">
        <Search
          size={15}
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-light pointer-events-none"
        />
        <input
          id={id}
          type="search"
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={`${filterControlClasses} pl-9`}
        />
      </div>
    </FilterField>
  );
}

/** Apply and Clear, side by side, reachable with a thumb. */
export function FilterActions({ clearHref, applyLabel = "Apply filters" }: { clearHref: string; applyLabel?: string }) {
  return (
    <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4 lg:justify-end">
      <button
        type="submit"
        className="rounded-md bg-primary-800 text-white px-4 py-2 text-sm font-semibold hover:bg-primary-900"
      >
        {applyLabel}
      </button>
      <Link href={clearHref} className="text-sm font-semibold text-slate hover:text-primary-800">
        Clear
      </Link>
    </div>
  );
}
