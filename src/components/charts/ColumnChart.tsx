import { ChartFrame, ChartTable, type LegendItem } from "./ChartFrame";
import { columnPath, niceScale, tipAttr } from "./chart-utils";

export interface ColumnSeries {
  key: string;
  label: string;
  /** A CSS colour, normally one of the --viz-* tokens. */
  color: string;
}

/**
 * One or more bars per category. Each bar is a stack of series (a bar with
 * a single series is a plain column), so "income, stacked by source, beside
 * expenses" is two bars per month.
 */
export interface ColumnBar {
  key: string;
  label: string;
  series: ColumnSeries[];
}

const WIDTH = 640;
const HEIGHT = 250;
const MARGIN = { top: 12, right: 8, bottom: 30, left: 56 };
const GAP = 2;
const MAX_BAR = 24;

export function ColumnChart({
  label,
  categories,
  bars,
  values,
  formatValue,
  formatTick,
  integer = false,
  minWidth,
}: {
  /** What the chart shows, for screen readers. */
  label: string;
  categories: string[];
  bars: ColumnBar[];
  /** values[seriesKey][categoryIndex] */
  values: Record<string, number[]>;
  formatValue: (value: number) => string;
  formatTick: (value: number) => string;
  integer?: boolean;
  minWidth?: number;
}) {
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const valueAt = (key: string, i: number) => values[key]?.[i] ?? 0;
  const barTotal = (bar: ColumnBar, i: number) => bar.series.reduce((total, s) => total + valueAt(s.key, i), 0);

  const maxValue = Math.max(0, ...categories.flatMap((_, i) => bars.map((bar) => barTotal(bar, i))));
  const scale = niceScale(maxValue, { integer });
  const y = (value: number) => MARGIN.top + plotHeight - (value / scale.max) * plotHeight;

  const band = plotWidth / Math.max(1, categories.length);
  const barWidth = Math.min(MAX_BAR, (band * 0.7 - GAP * (bars.length - 1)) / bars.length);
  const groupWidth = barWidth * bars.length + GAP * (bars.length - 1);

  const allSeries = bars.flatMap((bar) => bar.series);
  const legend: LegendItem[] = allSeries.map((s) => ({ label: s.label, color: s.color, shape: "bar" }));
  const multiSeriesBars = bars.filter((bar) => bar.series.length > 1);

  const headers = [
    "Period",
    ...allSeries.map((s) => s.label),
    ...multiSeriesBars.map((bar) => `${bar.label} (total)`),
  ];
  const rows = categories.map((category, i) => [
    category,
    ...allSeries.map((s) => formatValue(valueAt(s.key, i))),
    ...multiSeriesBars.map((bar) => formatValue(barTotal(bar, i))),
  ]);

  // Label every category when there's room, otherwise every other one.
  const labelEvery = categories.length > 8 ? 2 : 1;

  return (
    <ChartFrame legend={legend} table={<ChartTable headers={headers} rows={rows} />} minWidth={minWidth}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" role="group" aria-label={label}>
        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke={tick === 0 ? "var(--viz-axis)" : "var(--viz-grid)"}
              strokeWidth={1}
            />
            <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--color-slate)" className="font-data">
              {formatTick(tick)}
            </text>
          </g>
        ))}

        {categories.map((category, i) => {
          const bandX = MARGIN.left + i * band;
          const groupX = bandX + (band - groupWidth) / 2;
          const tipRows = bars.flatMap((bar) => [
            ...bar.series.map((s) => ({ label: s.label, value: formatValue(valueAt(s.key, i)), color: s.color })),
            ...(bar.series.length > 1 ? [{ label: `${bar.label} total`, value: formatValue(barTotal(bar, i)), strong: true }] : []),
          ]);
          const spoken = `${category}: ${tipRows.map((r) => `${r.label} ${r.value}`).join(", ")}`;

          return (
            <g key={category} data-tip={tipAttr({ title: category, rows: tipRows })} tabIndex={0} role="img" aria-label={spoken}>
              <rect className="viz-hit-bg" x={bandX} y={MARGIN.top} width={band} height={plotHeight} fill="transparent" rx={4} />
              {bars.map((bar, b) => {
                const x = groupX + b * (barWidth + GAP);
                const segments = bar.series
                  .map((s) => ({ series: s, value: valueAt(s.key, i) }))
                  .filter((segment) => segment.value > 0);
                let running = 0;
                return (
                  <g key={bar.key}>
                    {segments.map((segment, s) => {
                      const bottom = y(running);
                      running += segment.value;
                      const top = y(running);
                      const isTop = s === segments.length - 1;
                      const height = bottom - top - (isTop || bottom - top <= GAP * 2 ? 0 : GAP);
                      return isTop ? (
                        <path key={segment.series.key} d={columnPath(x, top, barWidth, height)} fill={segment.series.color} />
                      ) : (
                        <rect
                          key={segment.series.key}
                          x={x}
                          y={bottom - height}
                          width={barWidth}
                          height={Math.max(height, 0)}
                          fill={segment.series.color}
                        />
                      );
                    })}
                  </g>
                );
              })}
              {i % labelEvery === 0 && (
                <text x={bandX + band / 2} y={HEIGHT - 10} textAnchor="middle" fontSize={11} fill="var(--color-slate)">
                  {category}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </ChartFrame>
  );
}
