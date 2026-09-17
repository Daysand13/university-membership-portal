/** Shared maths for the SVG charts. */

export interface ChartTip {
  title: string;
  rows: { label: string; value: string; color?: string; strong?: boolean }[];
}

export function tipAttr(tip: ChartTip): string {
  return JSON.stringify(tip);
}

/** Clean axis ticks (0, 250, 500…) covering `maxValue`. */
export function niceScale(maxValue: number, options?: { tickCount?: number; integer?: boolean }): { max: number; ticks: number[] } {
  const tickCount = options?.tickCount ?? 4;
  if (!(maxValue > 0)) {
    const step = options?.integer ? 1 : 1;
    return { max: step * tickCount, ticks: Array.from({ length: tickCount + 1 }, (_, i) => i * step) };
  }
  const rough = maxValue / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalised = rough / magnitude;
  let step = (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10) * magnitude;
  if (options?.integer) step = Math.max(1, Math.ceil(step));
  const max = step * Math.ceil(maxValue / step);
  const ticks: number[] = [];
  for (let value = 0; value <= max + step / 2; value += step) ticks.push(Math.round(value * 100) / 100);
  return { max, ticks };
}

/** A column with a 4px rounded data end and a square base. */
export function columnPath(x: number, y: number, width: number, height: number, radius = 4): string {
  if (height <= 0 || width <= 0) return "";
  const r = Math.min(radius, height, width / 2);
  const bottom = y + height;
  return `M${x},${bottom} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${bottom} Z`;
}

export const compactNumber = new Intl.NumberFormat("en-GH", { notation: "compact", maximumFractionDigits: 1 });
