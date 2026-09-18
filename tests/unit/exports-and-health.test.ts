import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";
import { summariseHealth } from "@/lib/services/system-health-service";

describe("the dues ledger CSV", () => {
  it("quotes commas, quotes and line breaks so rows stay rows", () => {
    expect(csvCell("Mensah, Ama")).toBe('"Mensah, Ama"');
    expect(csvCell('Kofi "KB" Boateng')).toBe('"Kofi ""KB"" Boateng"');
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
  });

  it("never lets a cell run as a spreadsheet formula", () => {
    // A name typed as a formula must open as text in the treasurer's sheet.
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe("\"'=HYPERLINK(\"\"http://x\"\")\"");
    expect(csvCell("+233 24 000 0000")).toBe("'+233 24 000 0000");
    expect(csvCell("@sum")).toBe("'@sum");
    expect(csvCell("-1")).toBe("'-1");
  });

  it("leaves real numbers alone", () => {
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell("50.00")).toBe("50.00");
  });

  it("writes empty cells for missing values", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("starts with a byte-order mark so Excel reads GH₵ and names correctly", () => {
    const csv = toCsv([["Fee"], ["GH₵ 50"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe("﻿Fee\r\nGH₵ 50\r\n");
  });
});

describe("the system health light", () => {
  const healthy = {
    databaseReachable: true,
    emailConfigured: true,
    recentEmailFailures: 0,
    paymentsConfigured: true,
    storageConfigured: true,
  };

  it("is all clear when everything is connected", () => {
    const health = summariseHealth(healthy);
    expect(health.problems).toBe(0);
    expect(health.checks.every((c) => c.state === "ok")).toBe(true);
  });

  it("says plainly when online payments aren't connected", () => {
    const health = summariseHealth({ ...healthy, paymentsConfigured: false });
    expect(health.problems).toBe(1);
    const payments = health.checks.find((c) => c.key === "payments");
    expect(payments?.state).toBe("off");
    expect(payments?.detail).toMatch(/recorded by hand/);
  });

  it("ignores a stray bounced email but flags a burst of failures", () => {
    expect(summariseHealth({ ...healthy, recentEmailFailures: 1 }).problems).toBe(0);
    const burst = summariseHealth({ ...healthy, recentEmailFailures: 12 });
    expect(burst.checks.find((c) => c.key === "email")?.state).toBe("warning");
  });

  it("treats an unreachable database as a warning, not as 'not set up'", () => {
    const health = summariseHealth({ ...healthy, databaseReachable: false });
    expect(health.checks.find((c) => c.key === "database")?.state).toBe("warning");
  });
});
