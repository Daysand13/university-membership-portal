"use client";

export type TextSize = "standard" | "large" | "larger";

export const TEXT_SIZES: { value: TextSize; label: string; sample: string }[] = [
  { value: "standard", label: "Standard", sample: "text-sm" },
  { value: "large", label: "Large", sample: "text-base" },
  { value: "larger", label: "Larger", sample: "text-lg" },
];

export function isTextSize(value: string | null): value is TextSize {
  return value === "standard" || value === "large" || value === "larger";
}

/**
 * Text size, high contrast and (on phones) dark mode, in one small panel.
 *
 * Kept deliberately short: three sizes rather than a slider, because a
 * slider is hard to use precisely with a tremor or a screen reader, and one
 * contrast switch rather than a palette picker. Each setting is a real
 * control with a pressed/checked state a screen reader announces.
 */
export function DisplaySettingsPanel({
  id,
  textSize,
  onTextSize,
  highContrast,
  onHighContrast,
  dark,
  className = "",
}: {
  id: string;
  textSize: TextSize;
  onTextSize: (size: TextSize) => void;
  highContrast: boolean;
  onHighContrast: (on: boolean) => void;
  /** Included where there's no separate Dark Mode button (phones). */
  dark?: { on: boolean; toggle: () => void };
  className?: string;
}) {
  return (
    <div
      id={id}
      role="group"
      aria-label="Display settings"
      className={`rounded-xl border border-line bg-white text-ink shadow-lg p-4 space-y-4 ${className}`}
    >
      <fieldset>
        <legend className="text-sm font-semibold text-primary-950 mb-2">Text size</legend>
        <div className="grid grid-cols-3 gap-1.5">
          {TEXT_SIZES.map((size) => (
            <label
              key={size.value}
              className={`flex flex-col items-center justify-center min-h-14 rounded-lg border cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-600 ${
                textSize === size.value
                  ? "border-primary-800 bg-primary-800 text-white"
                  : "border-line bg-white text-primary-950 hover:border-primary-400"
              }`}
            >
              <input
                type="radio"
                name={`${id}-text-size`}
                value={size.value}
                checked={textSize === size.value}
                onChange={() => onTextSize(size.value)}
                className="sr-only"
              />
              <span aria-hidden="true" className={`font-bold leading-none ${size.sample}`}>
                A
              </span>
              <span className="text-xs mt-1">{size.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={highContrast}
          onChange={(e) => onHighContrast(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-line text-primary-800"
        />
        <span>
          <span className="block text-sm font-semibold text-primary-950">High contrast</span>
          <span className="block text-xs text-slate">Stronger text and borders, underlined links.</span>
        </span>
      </label>

      {dark && (
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={dark.on}
            onChange={dark.toggle}
            className="mt-1 h-4 w-4 rounded border-line text-primary-800"
          />
          <span>
            <span className="block text-sm font-semibold text-primary-950">Dark mode</span>
            <span className="block text-xs text-slate">Light text on a dark background.</span>
          </span>
        </label>
      )}

      <p className="text-xs text-slate">Saved on this device.</p>
    </div>
  );
}
