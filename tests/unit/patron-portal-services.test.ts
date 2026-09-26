import { beforeEach, describe, expect, it, vi } from "vitest";

// No database, payment provider or email: each is replaced so these read as
// the rules they check.
const mocks = vi.hoisted(() => ({
  db: {
    donation: { findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    broadcast: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    member: { findMany: vi.fn() },
    alumniProfile: { findMany: vi.fn() },
    teamMember: { findMany: vi.fn(), count: vi.fn() },
    accessibilityIssue: { findUnique: vi.fn(), updateMany: vi.fn() },
    issuePatronAction: { create: vi.fn() },
    advocacyCampaign: { findUnique: vi.fn() },
    campaignEndorsement: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  },
  paystack: {
    isPaystackConfigured: vi.fn(() => true),
    initializeTransaction: vi.fn(),
    verifyTransaction: vi.fn(),
  },
  notify: {
    notifyDonationReceived: vi.fn(async () => {}),
    notifyAdminsOfBroadcast: vi.fn(async () => {}),
    notifyPatronBroadcastDecision: vi.fn(async () => {}),
    notifyAdminsOfIssueAction: vi.fn(async () => {}),
    notifyAdminsOfEndorsement: vi.fn(async () => {}),
  },
  sendBatchEmails: vi.fn<(params: { messages: { to: string }[] }) => Promise<{ delivered: number }>>(async (params) => ({
    delivered: params.messages.length,
  })),
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/services/paystack-client", () => mocks.paystack);
vi.mock("@/lib/services/patron-portal-notification-service", () => mocks.notify);
vi.mock("@/lib/email/client", () => ({ sendBatchEmails: mocks.sendBatchEmails }));
vi.mock("@/lib/services/content-service", () => ({ getEmailBrand: async () => ({ siteTitle: "ASSN-UEW", logoUrl: null }) }));
vi.mock("@/lib/services/account-notification-service", () => ({
  firstNameOf: (name: string) => name.split(" ")[0],
}));
vi.mock("@/lib/storage/r2", () => ({ deleteObject: vi.fn() }));

import { bucketFinances, initiatePatronDonation, verifyAndRecordDonation } from "@/lib/services/patron-finance-service";
import {
  approveBroadcast,
  BroadcastReviewError,
  getBroadcastAttachment,
  resolveBroadcastRecipients,
} from "@/lib/services/broadcast-service";
import { AdvocacyError, endorseCampaign, takeIssueAction } from "@/lib/services/advocacy-service";
import { Prisma } from "@/generated/prisma/client";

const { db, paystack, notify } = mocks;

const onlineDonation = {
  id: "don-1",
  reference: "donation-abc",
  source: "ONLINE",
  status: "PENDING",
  amountPesewas: 10000,
  fund: "GENERAL",
  anonymous: false,
  patronId: "patron-1",
  donorName: "Dr. Akosua Boateng",
  donorEmail: "akosua@example.com",
  paystackTransactionId: null,
  patron: { email: "akosua@example.com", title: "Dr.", fullName: "Akosua Boateng" },
};

beforeEach(() => {
  vi.clearAllMocks();
  paystack.isPaystackConfigured.mockReturnValue(true);
});

describe("patron donations", () => {
  it("won't start a donation when online payment isn't set up", async () => {
    paystack.isPaystackConfigured.mockReturnValue(false);
    const result = await initiatePatronDonation({
      patron: { id: "patron-1", email: "a@b.c", title: null, fullName: "A B" },
      amountPesewas: 5000,
      fund: "GENERAL",
      anonymous: false,
      callbackUrl: "https://example.com/cb",
    });
    expect(result.ok).toBe(false);
    expect(db.donation.create).not.toHaveBeenCalled();
  });

  it("records a verified payment once and sends one receipt", async () => {
    db.donation.findUnique.mockResolvedValue(onlineDonation);
    paystack.verifyTransaction.mockResolvedValue({ status: "success", amountPesewas: 10000, transactionId: 42 });
    db.donation.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    expect(await verifyAndRecordDonation("donation-abc")).toEqual({ ok: true, status: "SUCCESS" });
    // The webhook and the browser callback racing: the second finds nothing to update.
    expect(await verifyAndRecordDonation("donation-abc")).toEqual({ ok: true, status: "SUCCESS" });
    expect(notify.notifyDonationReceived).toHaveBeenCalledTimes(1);
    expect(db.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("doesn't trust a payment for a different amount", async () => {
    db.donation.findUnique.mockResolvedValue(onlineDonation);
    paystack.verifyTransaction.mockResolvedValue({ status: "success", amountPesewas: 100, transactionId: 42 });
    expect(await verifyAndRecordDonation("donation-abc")).toEqual({ ok: true, status: "FAILED" });
    expect(notify.notifyDonationReceived).not.toHaveBeenCalled();
  });

  it("ignores references that aren't online donations", async () => {
    db.donation.findUnique.mockResolvedValue({ ...onlineDonation, source: "RECORDED" });
    expect((await verifyAndRecordDonation("donation-recorded-x")).ok).toBe(false);
    expect(paystack.verifyTransaction).not.toHaveBeenCalled();
  });

  it("puts each payment in its month and splits patron from other donations", () => {
    const empty = { dues: 0, patronDonations: 0, otherDonations: 0, documents: 0, expenses: 0 };
    const periods = bucketFinances(
      [
        { key: "2026-08", label: "Aug", ...empty },
        { key: "2026-09", label: "Sep", ...empty },
      ],
      (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      {
        dues: [
          { amountPesewas: 5000, paidAt: new Date("2026-09-02T10:00:00Z") },
          { amountPesewas: 9999, paidAt: null },
        ],
        donations: [
          { amountPesewas: 2000, paidAt: new Date("2026-08-31T23:59:00Z"), patronId: "p1", fund: "GENERAL" },
          { amountPesewas: 3000, paidAt: new Date("2026-09-01T00:00:00Z"), patronId: null, fund: "GENERAL" },
        ],
        documents: [
          { amountPesewas: 2000, paidAt: new Date("2026-09-04T09:00:00Z"), kind: "CV" },
          // Never paid for, so it belongs to no month.
          { amountPesewas: 1000, paidAt: null, kind: "LETTER" },
        ],
        expenses: [{ amountPesewas: 700, spentOn: new Date("2026-09-10T12:00:00Z"), category: "EVENTS" }],
      },
    );
    expect(periods[0]).toMatchObject({ dues: 0, patronDonations: 2000, otherDonations: 0, documents: 0 });
    expect(periods[1]).toMatchObject({
      dues: 5000,
      patronDonations: 0,
      otherDonations: 3000,
      documents: 2000,
      expenses: 700,
    });
  });

  it("counts what members paid for their documents as money the association raised", () => {
    // A CV, an ID card or a letter is sold at a price the executive sets;
    // leaving it out of the books made the association look poorer than it is.
    const [period] = bucketFinances(
      [{ key: "2026-09", label: "Sep", dues: 0, patronDonations: 0, otherDonations: 0, documents: 0, expenses: 0 }],
      () => "2026-09",
      {
        dues: [],
        donations: [],
        documents: [
          { amountPesewas: 2000, paidAt: new Date("2026-09-04T09:00:00Z"), kind: "CV" },
          { amountPesewas: 3000, paidAt: new Date("2026-09-06T09:00:00Z"), kind: "ID_CARD" },
          { amountPesewas: 1000, paidAt: new Date("2026-09-07T09:00:00Z"), kind: "LETTER" },
        ],
        expenses: [],
      },
    );
    expect(period.documents).toBe(6000);
  });
});

describe("broadcasts", () => {
  it("sends each person one email even if they're both a student and an alumnus", async () => {
    db.member.findMany.mockResolvedValue([
      { email: "Kofi@Example.com", firstName: "Kofi" },
      { email: "ama@example.com", firstName: "Ama" },
    ]);
    db.alumniProfile.findMany.mockResolvedValue([{ email: "kofi@example.com", fullName: "Kofi Mensah" }]);
    const recipients = await resolveBroadcastRecipients("ALL_MEMBERS");
    expect(recipients.map((r) => r.email.toLowerCase()).sort()).toEqual(["ama@example.com", "kofi@example.com"]);
  });

  it("reaches only the executive when that's the audience", async () => {
    db.teamMember.findMany.mockResolvedValue([{ member: { email: "pres@example.com", firstName: "Esi" } }, { member: null }]);
    expect(await resolveBroadcastRecipients("EXECUTIVES")).toEqual([{ email: "pres@example.com", firstName: "Esi" }]);
    expect(db.member.findMany).not.toHaveBeenCalled();
    expect(db.alumniProfile.findMany).not.toHaveBeenCalled();
  });

  it("can't be approved twice", async () => {
    db.broadcast.findUnique.mockResolvedValue({
      id: "b1",
      status: "PENDING",
      audience: "STUDENTS",
      sendEmail: true,
      postToPortal: true,
      subject: "Hello",
      bodyHtml: "<p>Hi</p>",
      authorName: "Dr. A",
      attachmentKey: null,
      attachmentName: null,
      patron: null,
    });
    db.member.findMany.mockResolvedValue([{ email: "a@example.com", firstName: "A" }]);
    db.broadcast.updateMany.mockResolvedValue({ count: 0 });
    await expect(approveBroadcast({ id: "b1", adminId: "admin-1", note: null })).rejects.toBeInstanceOf(BroadcastReviewError);
    expect(mocks.sendBatchEmails).not.toHaveBeenCalled();
  });

  it("emails the group when approved", async () => {
    db.broadcast.findUnique.mockResolvedValue({
      id: "b1",
      status: "PENDING",
      audience: "STUDENTS",
      sendEmail: true,
      postToPortal: false,
      subject: "Hello",
      bodyHtml: "<p>Hi</p>",
      authorName: "Dr. A",
      attachmentKey: null,
      attachmentName: null,
      patron: { id: "p1", email: "dr@example.com", title: "Dr.", fullName: "A" },
    });
    db.member.findMany.mockResolvedValue([
      { email: "a@example.com", firstName: "A" },
      { email: "b@example.com", firstName: "B" },
    ]);
    db.broadcast.updateMany.mockResolvedValue({ count: 1 });
    const result = await approveBroadcast({ id: "b1", adminId: "admin-1", note: null });
    expect(result).toEqual({ recipients: 2, emailsSent: 2, sendEmail: true });
    expect(mocks.sendBatchEmails.mock.calls[0][0].messages.map((m) => m.to)).toEqual(["a@example.com", "b@example.com"]);
    expect(notify.notifyPatronBroadcastDecision).toHaveBeenCalledWith(expect.objectContaining({ approved: true }));
  });

  it("keeps an unapproved attachment to its author and admins", async () => {
    db.broadcast.findUnique.mockResolvedValue({ status: "PENDING", patronId: "p1", attachmentKey: "library/x.pdf", attachmentName: "x.pdf" });
    expect(await getBroadcastAttachment({ broadcastId: "b1", viewer: { kind: "anyone" } })).toBeNull();
    expect(await getBroadcastAttachment({ broadcastId: "b1", viewer: { kind: "patron", patronId: "p2" } })).toBeNull();
    expect(await getBroadcastAttachment({ broadcastId: "b1", viewer: { kind: "patron", patronId: "p1" } })).not.toBeNull();
    expect(await getBroadcastAttachment({ broadcastId: "b1", viewer: { kind: "admin" } })).not.toBeNull();

    db.broadcast.findUnique.mockResolvedValue({ status: "APPROVED", patronId: "p1", attachmentKey: "library/x.pdf", attachmentName: "x.pdf" });
    expect(await getBroadcastAttachment({ broadcastId: "b1", viewer: { kind: "anyone" } })).not.toBeNull();
  });
});

describe("advocacy", () => {
  const patron = { id: "p1", email: "dr@example.com", title: "Dr.", fullName: "A", phone: "024" };

  it("moves an issue waiting on the executive to Patron Action Taken", async () => {
    db.accessibilityIssue.findUnique.mockResolvedValue({ id: "i1", title: "Ramp", status: "UNDER_REVIEW" });
    await takeIssueAction({ issueId: "i1", patron, type: "MEETING_REQUEST", message: "Next Tuesday works." });
    expect(db.accessibilityIssue.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "PATRON_ACTION" } }),
    );
    expect(notify.notifyAdminsOfIssueAction).toHaveBeenCalledWith(
      expect.objectContaining({ issue: expect.objectContaining({ status: "PATRON_ACTION" }) }),
    );
  });

  it("doesn't take action on a resolved issue", async () => {
    db.accessibilityIssue.findUnique.mockResolvedValue({ id: "i1", title: "Ramp", status: "RESOLVED" });
    await expect(
      takeIssueAction({ issueId: "i1", patron, type: "OFFICIAL_STATEMENT", message: "A statement." }),
    ).rejects.toBeInstanceOf(AdvocacyError);
    expect(db.issuePatronAction.create).not.toHaveBeenCalled();
  });

  it("explains a second endorsement instead of failing", async () => {
    db.advocacyCampaign.findUnique.mockResolvedValue({ id: "c1", title: "Braille", status: "ACTIVE" });
    db.campaignEndorsement.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }),
    );
    await expect(endorseCampaign({ campaignId: "c1", patron, comment: null })).rejects.toThrow("already endorsed");
    expect(notify.notifyAdminsOfEndorsement).not.toHaveBeenCalled();
  });

  it("only takes endorsements for active campaigns", async () => {
    db.advocacyCampaign.findUnique.mockResolvedValue({ id: "c1", title: "Braille", status: "CLOSED" });
    await expect(endorseCampaign({ campaignId: "c1", patron, comment: null })).rejects.toBeInstanceOf(AdvocacyError);
    expect(db.campaignEndorsement.create).not.toHaveBeenCalled();
  });
});
