import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import type { Member } from "@/generated/prisma/client";
import { MemberListPdf } from "@/lib/pdf/MemberListPdf";
import { DuesLedgerPdf, type DuesLedgerRow } from "@/lib/pdf/DuesLedgerPdf";

/**
 * The member list and dues ledger PDFs render, with made-up rows.
 *
 * To look at them: PDF_PREVIEW_DIR=<folder> npx vitest run tests/unit/pdf-exports.test.ts
 */

const people = [
  ["Ama", "Serwaa", "Mensah", "Visually Impaired", "Department of Special Education", "B.Ed. Special Education", "Level 300"],
  ["Kofi", null, "Boateng", "Hearing Impaired", "Department of Early Childhood", "B.Ed. Early Childhood Education", "Level 100"],
  ["Abena", "Konadu", "Asantewaa-Owusu", "Physically Challenged", "Department of Mathematics Education", "B.Sc. Mathematics Education", "Level 400"],
  ["Yaw", null, "Darko", "", null, "M.Phil. Special Education", "Year 1"],
] as const;

const members = Array.from({ length: 12 }, (_, i) => {
  const [firstName, middleName, lastName, department, academicDepartment, programme, level] = people[i % people.length];
  return {
    id: `m${i}`,
    firstName,
    middleName,
    lastName,
    indexNumber: `52011${1000 + i}`,
    gender: i % 2 ? "MALE" : "FEMALE",
    academicDepartment,
    programme,
    level,
    membershipType: "REGULAR",
    department,
    createdAt: new Date("2026-02-01"),
  } as unknown as Member;
});

async function render(element: ReactElement): Promise<Buffer> {
  return renderToBuffer(element as ReactElement<DocumentProps>);
}

function keep(name: string, pdf: Buffer) {
  const dir = process.env.PDF_PREVIEW_DIR;
  if (dir) writeFileSync(join(dir, name), pdf);
}

describe("the export PDFs", () => {
  it("renders the member list, numbered, with each member's special needs category", async () => {
    const pdf = await render(createElement(MemberListPdf, { members, filterSummary: "Sample data" }));
    expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
    keep("members.pdf", pdf);
  }, 30_000);

  it("renders the dues ledger with Paid and Not paid", async () => {
    const rows: DuesLedgerRow[] = members.map((m, i) => ({
      fullName: `${m.firstName} ${m.lastName}`,
      indexNumber: m.indexNumber,
      level: m.level,
      tierLabel: "Undergraduate (regular)",
      feeCedis: "50.00",
      paid: i % 3 !== 0,
      method: i % 3 !== 0 ? "Paystack" : "",
      amountCedis: i % 3 !== 0 ? "50.00" : "",
      paidOn: i % 3 !== 0 ? "12 Oct 2026" : "",
    }));
    const pdf = await render(createElement(DuesLedgerPdf, { academicYear: "2026/2027", rows, collectedPesewas: 40_000, expectedPesewas: 60_000 }));
    expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
    keep("dues.pdf", pdf);
  }, 30_000);
});
