import { ChartFrame, ChartTable, type LegendItem } from "./ChartFrame";
import { niceScale, tipAttr } from "./chart-utils";

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

const WIDTH = 640;
const HEIGHT = 250;
const MARGIN = { top: 16, right: 96, bottom: 30, left: 44 };

/**
 * Two or three series over time: 2px lines, dots ringed in the card colour,
 * each line labelled at its end. The whole column under the pointer is the
 * hover target, and its tooltip lists every series for that period.
 */
export function LineChart({
  label,
  categories,
  series,
  formatValue,
  integer = true,
  minWidth,
}: {
  label: string;
  categories: string[];
  series: LineSeries[];
  formatValue: (value: number) => string;
  integer?: boolean;
  minWidth?: number;
}) {
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const maxValue = Math.max(0, ...series.flatMap((s) => s.values));
  const scale = niceScale(maxValue, { integer });
  const step = categories.length > 1 ? plotWidth / (categories.length - 1) : 0;
  const x = (i: number) => MARGIN.left + (categories.length > 1 ? i * step : plotWidth / 2);
  const y = (value: number) => MARGIN.top + plotHeight - (value / scale.max) * plotHeight;
  const band = categories.length > 1 ? step : plotWidth;

  // End labels: nudge apart only when they'd overlap; they stay beside their line.
  const last = categories.length - 1;
  const ends = series
    .map((s) => ({ key: s.key, label: s.label, value: s.values[last] ?? 0, y: y(s.values[last] ?? 0) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) {
    if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
  }

  const legend: LegendItem[] = series.map((s) => ({ label: s.label, color: s.color, shape: "line" }));
  const rows = categories.map((category, i) => [category, ...series.map((s) => formatValue(s.values[i] ?? 0))]);

  return (
    <ChartFrame
      legend={legend}
      table={<ChartTable headers={["Year", ...series.map((s) => s.label)]} rows={rows} caption={label} />}
      minWidth={minWidth}
    >
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
              {formatValue(tick)}
            </text>
          </g>
        ))}

        {categories.map((category, i) => {
          const tipRows = series.map((s) => ({ label: s.label, value: formatValue(s.values[i] ?? 0), color: s.color }));
          return (
            <g
              key={category}
              data-tip={tipAttr({ title: category, rows: tipRows })}
              tabIndex={0}
              role="img"
              aria-label={`${category}: ${tipRows.map((r) => `${r.label} ${r.value}`).join(", ")}`}
            >
              <rect className="viz-hit-bg" x={x(i) - band / 2} y={MARGIN.top} width={band} height={plotHeight} fill="transparent" rx={4} />
              <text x={x(i)} y={HEIGHT - 10} textAnchor="middle" fontSize={11} fill="var(--color-slate)">
                {category}
              </text>
            </g>
          );
        })}

        {series.map((s) => (
          <g key={s.key} pointerEvents="none">
            <polyline
              points={s.values.map((value, i) => `${x(i)},${y(value)}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.values.map((value, i) => (
              <circle key={i} cx={x(i)} cy={y(value)} r={4} fill={s.color} stroke="var(--viz-surface)" strokeWidth={2} />
            ))}
          </g>
        ))}

        {ends.map((end) => (
          <text key={end.key} x={x(last) + 10} y={end.y} dy="0.32em" fontSize={11} fill="var(--color-ink)" pointerEvents="none">
            <tspan fontWeight={600}>{formatValue(end.value)}</tspan>
            <tspan fill="var(--color-slate)"> {end.label}</tspan>
          </text>
        ))}
      </svg>
    </ChartFrame>
  );
}
