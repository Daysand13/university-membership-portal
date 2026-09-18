/**
 * A spreadsheet-safe CSV writer for the admin exports.
 *
 * Two things matter here beyond ordinary quoting. First, a cell that starts
 * with =, +, - or @ is read by Excel and Google Sheets as a formula, so a
 * member whose name was typed as "=HYPERLINK(...)" would turn the treasurer's
 * spreadsheet into something that runs it. Those cells get a leading
 * apostrophe, which spreadsheets show as plain text. Second, the file starts
 * with a byte-order mark so Excel opens "GH₵" and Ghanaian names correctly
 * instead of guessing an old Windows encoding.
 */

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && FORMULA_START.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
