/**
 * A date as the separate boxes a person fills in, and back again.
 *
 * The browser's own date picker (`<input type="date">`) is the thing that
 * stopped members with screen readers choosing dates: on Android it opens a
 * calendar dialog TalkBack can barely move through — the year is a long
 * scrolling list — and on a computer the calendar pop-up cannot be reached
 * by a screen reader at all. The field the date goes into was readable; the
 * way of putting a date into it was not.
 *
 * So dates are typed: a day box, a month chosen by name, a year box — the
 * pattern GOV.UK settled on after testing with screen reader users. Each is
 * an ordinary labelled control. These functions turn those boxes into the
 * same value the browser's picker used to send ("2001-03-27"), so nothing on
 * the server changes, and say in words what is wrong when they don't add up.
 *
 * Pure, no React, so every case can be tested.
 */

export type DateMode = "date" | "month" | "datetime" | "time";

export interface DateParts {
  day: string;
  /** "1"–"12", or "". */
  month: string;
  year: string;
  /** "1"–"12" — the clock face, not the 24-hour hour. */
  hour: string;
  /** "00"–"59". */
  minute: string;
  meridiem: "am" | "pm" | "";
}

export const EMPTY_PARTS: DateParts = { day: "", month: "", year: "", hour: "", minute: "", meridiem: "" };

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

function daysIn(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** "2001-03-27", "2001-03", "2001-03-27T14:30" or "14:30", into boxes. */
export function partsFrom(value: string | null | undefined, mode: DateMode): DateParts {
  const parts: DateParts = { ...EMPTY_PARTS };
  const text = (value ?? "").trim();
  if (!text) return parts;

  const date = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(text);
  if (date && mode !== "time") {
    parts.year = date[1];
    parts.month = String(Number(date[2]));
    if (date[3]) parts.day = String(Number(date[3]));
  }

  const time = /(?:^|T)(\d{2}):(\d{2})/.exec(text);
  if (time && (mode === "time" || mode === "datetime")) {
    const hour24 = Number(time[1]);
    parts.meridiem = hour24 >= 12 ? "pm" : "am";
    parts.hour = String(hour24 % 12 === 0 ? 12 : hour24 % 12);
    parts.minute = time[2];
  }
  return parts;
}

export interface Built {
  /** What the form sends — "" until the boxes make a whole, real date. */
  value: string;
  /** Nothing filled in at all. */
  empty: boolean;
  /** What is wrong, in words for the person filling it in. Null when nothing is. */
  problem: string | null;
}

const EXAMPLE: Record<DateMode, string> = {
  date: "for example 27 March 2001",
  month: "for example March 2021",
  datetime: "for example 27 March 2027 at 2:30 pm",
  time: "for example 2:30 pm",
};

function humanDate(iso: string, mode: DateMode): string {
  const p = partsFrom(iso, mode);
  const month = MONTH_NAMES[Number(p.month) - 1] ?? "";
  if (mode === "month") return `${month} ${p.year}`;
  return `${p.day} ${month} ${p.year}`.trim();
}

/** The boxes, as the value the form sends, with anything wrong said in words. */
export function build(
  parts: DateParts,
  mode: DateMode,
  limits: { min?: string; max?: string } = {},
): Built {
  const wantsDate = mode !== "time";
  const wantsDay = mode === "date" || mode === "datetime";
  const wantsTime = mode === "time" || mode === "datetime";

  const used = [
    wantsDay && parts.day,
    wantsDate && parts.month,
    wantsDate && parts.year,
    wantsTime && parts.hour,
    wantsTime && parts.minute,
    wantsTime && parts.meridiem,
  ].filter((v) => typeof v === "string" && v.trim() !== "");
  if (used.length === 0) return { value: "", empty: true, problem: null };

  const missing: string[] = [];
  if (wantsDay && !parts.day.trim()) missing.push("day");
  if (wantsDate && !parts.month) missing.push("month");
  if (wantsDate && !parts.year.trim()) missing.push("year");
  if (wantsTime && !parts.hour) missing.push("hour");
  if (wantsTime && !parts.minute) missing.push("minutes");
  if (wantsTime && !parts.meridiem) missing.push("am or pm");
  if (missing.length > 0) {
    const list = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(", ")} and ${missing.at(-1)}`;
    return { value: "", empty: false, problem: `Enter the ${list}.` };
  }

  let iso = "";
  if (wantsDate) {
    const year = Number(parts.year.trim());
    const month = Number(parts.month);
    if (!/^\d{4}$/.test(parts.year.trim()) || year < 1900 || year > 2100) {
      return { value: "", empty: false, problem: `Enter the year as four numbers, ${EXAMPLE[mode]}.` };
    }
    if (!(month >= 1 && month <= 12)) {
      return { value: "", empty: false, problem: `Choose a month, ${EXAMPLE[mode]}.` };
    }
    if (wantsDay) {
      const dayText = parts.day.trim();
      const day = Number(dayText);
      if (!/^\d{1,2}$/.test(dayText) || day < 1 || day > daysIn(year, month)) {
        return {
          value: "",
          empty: false,
          problem: `${MONTH_NAMES[month - 1]} ${year} has ${daysIn(year, month)} days. Enter a real day, ${EXAMPLE[mode]}.`,
        };
      }
      iso = `${year}-${pad(month)}-${pad(day)}`;
    } else {
      iso = `${year}-${pad(month)}`;
    }
  }

  if (wantsTime) {
    const hour12 = Number(parts.hour);
    const minute = Number(parts.minute);
    if (!(hour12 >= 1 && hour12 <= 12) || !(minute >= 0 && minute <= 59)) {
      return { value: "", empty: false, problem: `Enter a real time, ${EXAMPLE.time}.` };
    }
    const hour24 = (hour12 % 12) + (parts.meridiem === "pm" ? 12 : 0);
    const time = `${pad(hour24)}:${pad(minute)}`;
    iso = mode === "time" ? time : `${iso}T${time}`;
  }

  // Limits compare as text, which is exact for these fixed-width forms.
  const comparable = (bound: string) => bound.slice(0, iso.length);
  if (limits.min && iso < comparable(limits.min)) {
    return { value: "", empty: false, problem: `The date must be on or after ${humanDate(limits.min, mode)}.` };
  }
  if (limits.max && iso > comparable(limits.max)) {
    return { value: "", empty: false, problem: `The date must be on or before ${humanDate(limits.max, mode)}.` };
  }

  return { value: iso, empty: false, problem: null };
}

/** The value read back in words: "27 March 2001", "2:30 pm". For confirming what was entered. */
export function describe(value: string, mode: DateMode): string {
  if (!value) return "";
  const p = partsFrom(value, mode);
  const time = p.hour ? `${p.hour}:${p.minute} ${p.meridiem}` : "";
  if (mode === "time") return time;
  const date = humanDate(value, mode);
  return mode === "datetime" ? `${date} at ${time}` : date;
}

export { EXAMPLE as DATE_EXAMPLES };
