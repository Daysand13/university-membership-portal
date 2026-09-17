/**
 * A ranked list of horizontal bars in one colour — used where each row is a
 * category and the question is "how much, compared with the others"
 * (spending by category, students by level). Every row carries its value
 * and share as text, so it needs no legend, tooltip or separate table.
 */
export function BarList({
  label,
  rows,
  color,
  formatValue,
  showShare = true,
}: {
  label: string;
  rows: { key: string; label: string; value: number }[];
  color: string;
  formatValue: (value: number) => string;
  showShare?: boolean;
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const max = Math.max(0, ...rows.map((row) => row.value));

  return (
    <ul className="viz space-y-3" aria-label={label}>
      {rows.map((row) => {
        const share = total > 0 ? Math.round((row.value / total) * 100) : 0;
        const width = max > 0 ? Math.max((row.value / max) * 100, row.value > 0 ? 1.5 : 0) : 0;
        return (
          <li key={row.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-primary-950 font-medium min-w-0">{row.label}</span>
              <span className="shrink-0 font-data tabular-nums text-ink">
                <span className="font-semibold">{formatValue(row.value)}</span>
                {showShare && <span className="text-slate"> · {share}%</span>}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 rounded-full bg-surface-muted overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-r-full" style={{ width: `${width}%`, backgroundColor: color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
