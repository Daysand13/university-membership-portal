"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import type { ChartTip } from "./chart-utils";

export interface LegendItem {
  label: string;
  color: string;
  shape: "bar" | "line";
}

interface TipState {
  tip: ChartTip;
  /** Pixels from the left edge (tooltip to the right of the pointer) or from the right edge (to its left). */
  left?: number;
  right?: number;
  y: number;
}

function readTip(target: EventTarget | null): { element: Element; tip: ChartTip } | null {
  const element = target instanceof Element ? target.closest("[data-tip]") : null;
  const raw = element?.getAttribute("data-tip");
  if (!element || !raw) return null;
  try {
    return { element, tip: JSON.parse(raw) as ChartTip };
  } catch {
    return null;
  }
}

/**
 * The frame around every chart: title and legend above, the plot (which
 * scrolls sideways on a narrow phone rather than shrinking its text), a
 * tooltip for whichever mark is under the pointer or has keyboard focus,
 * and a "Show the numbers" table so no value depends on hovering or on
 * telling colours apart.
 */
export function ChartFrame({
  legend,
  table,
  minWidth = 520,
  children,
}: {
  legend?: LegendItem[];
  table: ReactNode;
  /** Below this width the plot scrolls instead of squeezing. */
  minWidth?: number;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<TipState | null>(null);

  const place = useCallback((tip: ChartTip, clientX: number, clientY: number) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    // Opens away from the nearer edge, so it stays inside the chart.
    const x = clientX - box.left;
    const side = x > box.width / 2 ? { right: Math.max(box.width - x + 12, 0) } : { left: x + 12 };
    setState({ tip, ...side, y: clientY - box.top });
  }, []);

  return (
    <div className="viz">
      {legend && legend.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3 text-sm text-slate" aria-label="Legend">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={item.shape === "line" ? "inline-block w-4 h-0.5 rounded-full" : "inline-block w-3 h-3 rounded-sm"}
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </li>
          ))}
        </ul>
      )}

      <div
        ref={containerRef}
        className="relative"
        onPointerMove={(event) => {
          const found = readTip(event.target);
          if (found) place(found.tip, event.clientX, event.clientY);
          else setState(null);
        }}
        onPointerLeave={() => setState(null)}
        onFocus={(event) => {
          const found = readTip(event.target);
          if (!found) return;
          const rect = found.element.getBoundingClientRect();
          place(found.tip, rect.left + rect.width / 2, rect.top);
        }}
        onBlur={() => setState(null)}
      >
        <div className="overflow-x-auto">
          <div style={{ minWidth }}>{children}</div>
        </div>

        {state && (
          <div
            role="presentation"
            className="pointer-events-none absolute z-20 w-max max-w-[16rem] rounded-lg border border-line bg-white px-3 py-2 shadow-card-hover text-sm"
            style={{
              left: state.left,
              right: state.right,
              top: Math.max(state.y - 12, 0),
              transform: "translateY(-100%)",
            }}
          >
            <p className="text-xs font-semibold text-slate mb-1">{state.tip.title}</p>
            <ul className="space-y-0.5">
              {state.tip.rows.map((row) => (
                <li key={row.label} className="flex items-center gap-2">
                  {row.color && (
                    <span aria-hidden="true" className="inline-block w-3 h-0.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                  )}
                  <span className={`font-data whitespace-nowrap ${row.strong ? "font-bold" : "font-semibold"} text-primary-950`}>
                    {row.value}
                  </span>
                  <span className="text-slate text-xs whitespace-nowrap">{row.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <details className="mt-3 group">
        <summary className="cursor-pointer text-sm font-semibold text-primary-800 hover:text-accent-600 w-fit">
          Show the numbers
        </summary>
        <div className="mt-2 overflow-x-auto">{table}</div>
      </details>
    </div>
  );
}

/** A plain table for the "Show the numbers" view. */
export function ChartTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
          {headers.map((header, i) => (
            <th key={header} scope="col" className={`py-2 pr-4 font-semibold ${i > 0 ? "text-right" : ""}`}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((row) => (
          <tr key={String(row[0])}>
            {row.map((cell, i) =>
              i === 0 ? (
                <th key={i} scope="row" className="py-2 pr-4 text-left font-medium text-primary-950">
                  {cell}
                </th>
              ) : (
                <td key={i} className="py-2 pr-4 text-right font-data tabular-nums text-ink">
                  {cell}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
