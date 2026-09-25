/**
 * A list of records, on a desk and in a hand.
 *
 * Every admin list used to be a wide table inside a sideways scroller,
 * which on a phone means dragging a seven-column table left and right to
 * read one person's row — the "forced to open the desktop site" feeling.
 * An officer approving applications from their phone at a meeting is the
 * normal case here, not the exception.
 *
 * So one set of columns is described once and rendered twice: cards on a
 * phone, the table on a wider screen. Only one of the two is ever
 * displayed, so a screen reader is never read the same row twice, and the
 * table keeps its real markup — headers with a scope, a caption naming
 * what the table is — rather than being faked out of divs.
 */

export interface Column<T> {
  /** The column heading, and the label on a card. */
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Ranged right in the table. */
  align?: "right";
  /**
   * A column of controls rather than information — "View", "Delete". It
   * gets no label on a card and sits along the bottom of it.
   */
  actions?: boolean;
  /** Left off the card, for detail that only makes sense in a wide table. */
  tableOnly?: boolean;
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
}: {
  /** What this table is a list of — read out before the table itself. */
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
}) {
  const [first, ...rest] = columns;
  const details = rest.filter((column) => !column.actions && !column.tableOnly);
  const actions = rest.filter((column) => column.actions);

  return (
    <>
      {/* On a phone: one card per record, nothing to scroll sideways. */}
      <ul className="md:hidden space-y-3" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="bg-white rounded-lg border border-line p-4">
            <div className="font-medium text-primary-950 break-words">{first.cell(row)}</div>
            {details.length > 0 && (
              <dl className="mt-3 space-y-1.5 text-sm">
                {details.map((column) => (
                  <div key={column.header} className="flex flex-wrap gap-x-2">
                    <dt className="text-xs uppercase tracking-wide text-slate-light w-32 shrink-0 pt-0.5">
                      {column.header}
                    </dt>
                    <dd className="text-slate min-w-0 break-words">{column.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {actions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-line flex flex-wrap items-center gap-4">
                {actions.map((column) => (
                  <div key={column.header}>{column.cell(row)}</div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* On a wider screen: the table, still scrollable if it has to be,
          but reachable from the keyboard when it is. */}
      <div
        role="region"
        aria-label={caption}
        tabIndex={0}
        className="hidden md:block bg-white rounded-lg border border-line overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
      >
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
            <tr>
              {columns.map((column) =>
                column.actions ? (
                  // A column of buttons has no heading worth reading out,
                  // but the cells beneath it still need one to belong to.
                  <th key={column.header} scope="col" className="px-4 py-3">
                    <span className="sr-only">{column.header}</span>
                  </th>
                ) : (
                  <th
                    key={column.header}
                    scope="col"
                    className={`px-4 py-3 font-semibold ${column.align === "right" ? "text-right" : "text-left"}`}
                  >
                    {column.header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-surface-muted/60">
                {columns.map((column) => (
                  <td
                    key={column.header}
                    className={`px-4 py-3.5 align-top ${
                      column.align === "right" || column.actions ? "text-right whitespace-nowrap" : ""
                    }`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
