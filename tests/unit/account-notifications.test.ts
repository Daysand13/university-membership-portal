import { beforeEach, describe, expect, it, vi } from "vitest";

// Nothing here touches a real database or sends a real email: both are
// replaced below, and the assertions read what WOULD have been sent.
type SentEmail = {
  to: string;
  subject: string;
  html: string;
  template: string;
  attachments?: { filename: string; content: Buffer }[];
};

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn<(params: SentEmail) => Promise<{ delivered: boolean }>>(async () => ({ delivered: true })),
  findMember: vi.fn(async ({ where }: { where: { id: string } }) => {
    const members: Record<string, { id: string; email: string; firstName: string }> = {
      m1: { id: "m1", email: "ama@example.com", firstName: "Ama" },
      m2: { id: "m2", email: "kofi@example.com", firstName: "Kofi" },
    };
    return members[where.id] ?? null;
  }),
}));

vi.mock("@/lib/email/client", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/db", () => ({ db: { member: { findUnique: mocks.findMember } } }));
vi.mock("@/lib/services/content-service", () => ({
  getEmailBrand: async () => ({ siteTitle: "Test Association", logoUrl: null }),
}));
vi.mock("@/lib/services/dues-receipt-service", () => ({
  renderDuesReceipt: vi.fn(async (paymentId: string) => ({
    filename: `ASSN-UEW-Dues-Receipt-${paymentId}.pdf`,
    content: Buffer.from("%PDF-1.3 test"),
  })),
}));

import {
  notifyCashDuesPaymentRemoved,
  notifyDuesPaymentReceived,
  notifyMemberRecordCorrected,
  notifyMemberStatusChange,
  notifyTeamListingChange,
  type TeamListingSnapshot,
} from "@/lib/services/account-notification-service";
import { accountNoticeEmail, escapeHtml } from "@/lib/email/templates";

const leadership = (overrides: Partial<TeamListingSnapshot> = {}): TeamListingSnapshot => ({
  id: "t1",
  type: "LEADERSHIP",
  position: "General Secretary",
  isActive: true,
  memberId: "m1",
  ...overrides,
});

function sent() {
  return mocks.sendEmail.mock.calls.map(([params]) => params);
}

beforeEach(() => {
  mocks.sendEmail.mockClear();
  mocks.findMember.mockClear();
});

describe("email templates", () => {
  it("escapes HTML in every interpolated value", () => {
    expect(escapeHtml(`<b>"x" & 'y'</b>`)).toBe("&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;");

    const { html } = accountNoticeEmail({
      firstName: `<img src=x onerror=alert(1)>`,
      subject: "s",
      paragraphs: ["<script>bad()</script>"],
      bullets: ["<a href='https://evil.example'>click</a>"],
      details: [{ label: "Position", value: "<i>President</i>" }],
      brand: { siteTitle: "<Assoc>" },
    });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<a href='https://evil.example'>");
    expect(html).not.toContain("<i>President</i>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
});

describe("notifyTeamListingChange", () => {
  it("tells a member they were appointed, naming the position and the executive type", async () => {
    await notifyTeamListingChange(null, leadership({ position: "President" }));

    expect(sent()).toHaveLength(1);
    const [email] = sent();
    expect(email.to).toBe("ama@example.com");
    expect(email.template).toBe("executive-appointed");
    expect(email.subject).toContain("President");
    expect(email.html).toContain("Executive Leadership");
    expect(email.html).toContain("Executive rate");
  });

  it("does not promise the Executive rate while the listing is still hidden", async () => {
    await notifyTeamListingChange(null, leadership({ isActive: false }));
    expect(sent()[0].html).not.toContain("charged at the Executive rate from now on");
    expect(sent()[0].html).toContain("once an administrator publishes it");
  });

  it("moving a listing to a different member tells both of them", async () => {
    await notifyTeamListingChange(leadership({ memberId: "m1" }), leadership({ memberId: "m2" }));

    const byRecipient = Object.fromEntries(sent().map((e) => [e.to, e.template]));
    expect(byRecipient).toEqual({
      "ama@example.com": "executive-removed",
      "kofi@example.com": "executive-appointed",
    });
  });

  it("sends one combined email when the position and visibility both change", async () => {
    await notifyTeamListingChange(
      leadership({ position: "Treasurer", isActive: true }),
      leadership({ position: "Vice President", isActive: false }),
    );

    expect(sent()).toHaveLength(1);
    const [email] = sent();
    expect(email.template).toBe("executive-updated");
    expect(email.html).toContain("from Treasurer to Vice President");
    expect(email.html).toContain("hidden from the association");
  });

  it("stays quiet when nothing about the member's standing changed", async () => {
    await notifyTeamListingChange(leadership(), leadership());
    expect(sent()).toHaveLength(0);
  });

  it("tells the member when their listing is deleted", async () => {
    await notifyTeamListingChange(leadership(), null);
    expect(sent().map((e) => e.template)).toEqual(["executive-removed"]);
  });

  it("sends nothing for a listing with no linked member", async () => {
    await notifyTeamListingChange(null, leadership({ type: "PATRON", memberId: null }));
    expect(sent()).toHaveLength(0);
  });

  it("never throws, even when the email provider does", async () => {
    mocks.sendEmail.mockRejectedValueOnce(new Error("provider down"));
    await expect(notifyTeamListingChange(null, leadership())).resolves.toBeUndefined();
  });
});

describe("member account notices", () => {
  it("warns the old address when an admin changes a member's email, without revealing the new one", async () => {
    await notifyMemberRecordCorrected({
      member: { id: "m1", email: "new@example.com", firstName: "Ama", indexNumber: "5210001" },
      previousEmail: "old@example.com",
      previousIndexNumber: "5210001",
      changedFields: ["Email Address"],
    });

    const byRecipient = Object.fromEntries(sent().map((e) => [e.to, e]));
    expect(Object.keys(byRecipient).sort()).toEqual(["new@example.com", "old@example.com"]);
    expect(byRecipient["old@example.com"].html).not.toContain("new@example.com");
    expect(byRecipient["new@example.com"].html).toContain("new@example.com");
  });

  it("includes the new index number when it changes, since it's used to sign in", async () => {
    await notifyMemberRecordCorrected({
      member: { id: "m1", email: "ama@example.com", firstName: "Ama", indexNumber: "5219999" },
      previousEmail: "ama@example.com",
      previousIndexNumber: "5210001",
      changedFields: ["Index Number"],
    });
    expect(sent()).toHaveLength(1);
    expect(sent()[0].html).toContain("5219999");
  });

  it("doesn't email about a status that didn't actually change", async () => {
    await notifyMemberStatusChange({ id: "m1", email: "ama@example.com", firstName: "Ama" }, "ACTIVE", "ACTIVE");
    expect(sent()).toHaveLength(0);

    await notifyMemberStatusChange({ id: "m1", email: "ama@example.com", firstName: "Ama" }, "ACTIVE", "SUSPENDED");
    expect(sent()).toHaveLength(1);
    expect(sent()[0].html).toContain("Suspended");
  });
});

describe("profile picture notices", () => {
  const member = { id: "m1", email: "ama@example.com", firstName: "Ama", indexNumber: "5211040123" };

  it("sends a picture-specific email when only the picture was replaced", async () => {
    await notifyMemberRecordCorrected({
      member,
      previousEmail: member.email,
      previousIndexNumber: member.indexNumber,
      changedFields: ["Profile Picture"],
      profilePictureChange: "replaced",
    });

    expect(sent()).toHaveLength(1);
    const [email] = sent();
    expect(email.subject).toBe("Your profile picture has been updated");
    expect(email.html).toContain("replaced the profile picture");
    expect(email.html).toContain("ID card");
  });

  it("asks for a clear photo when the picture was removed", async () => {
    await notifyMemberRecordCorrected({
      member,
      previousEmail: member.email,
      previousIndexNumber: member.indexNumber,
      changedFields: ["Profile Picture"],
      profilePictureChange: "removed",
    });
    expect(sent()[0].html).toContain("passport-style photo");
  });

  it("mentions the picture alongside other corrected fields in one email", async () => {
    await notifyMemberRecordCorrected({
      member,
      previousEmail: member.email,
      previousIndexNumber: member.indexNumber,
      changedFields: ["Profile Picture", "Phone Number"],
      profilePictureChange: "added",
    });

    expect(sent()).toHaveLength(1);
    const [email] = sent();
    expect(email.subject).toContain("profile picture");
    expect(email.html).toContain("added a profile picture");
    expect(email.html).toContain("Phone Number");
  });
});

describe("cash dues notices", () => {
  it("sends a receipt that says the payment was cash", async () => {
    await notifyDuesPaymentReceived({
      memberId: "m1",
      paymentId: "p1",
      academicYear: "2026/2027",
      tierLabel: "Level 200",
      amountLabel: "GHS 50.00",
      reference: "CASH-ABC123DEF456",
      paidAt: new Date("2026-09-13T10:00:00Z"),
      method: "cash",
    });

    const [email] = sent();
    expect(email.to).toBe("ama@example.com");
    expect(email.template).toBe("dues-cash-payment-recorded");
    expect(email.html).toContain("cash payment");
    expect(email.html).toContain("CASH-ABC123DEF456");
    expect(email.html).not.toContain("Paystack");
  });

  it("attaches the PDF receipt and says so", async () => {
    await notifyDuesPaymentReceived({
      memberId: "m1",
      paymentId: "p9",
      academicYear: "2026/2027",
      tierLabel: "Level 200",
      amountLabel: "GHS 50.00",
      reference: "CASH-ABC123DEF456",
      paidAt: new Date("2026-09-13T10:00:00Z"),
      method: "cash",
    });

    const [email] = sent();
    expect(email.attachments).toHaveLength(1);
    expect(email.attachments?.[0].filename).toBe("ASSN-UEW-Dues-Receipt-p9.pdf");
    expect(email.html).toContain("receipt is attached");
  });

  it("still sends the payment email when the receipt can't be generated", async () => {
    const { renderDuesReceipt } = await import("@/lib/services/dues-receipt-service");
    vi.mocked(renderDuesReceipt).mockRejectedValueOnce(new Error("renderer down"));

    await notifyDuesPaymentReceived({
      memberId: "m1",
      paymentId: "p10",
      academicYear: "2026/2027",
      tierLabel: "Level 200",
      amountLabel: "GHS 50.00",
      reference: "dues-123",
      paidAt: new Date("2026-09-13T10:00:00Z"),
    });

    const [email] = sent();
    expect(email.attachments).toBeUndefined();
    expect(email.html).toContain("keep this email as your receipt");
    expect(email.html).toContain("GHS 50.00");
  });

  it("tells the member when a cash payment is taken back off their account", async () => {
    await notifyCashDuesPaymentRemoved({
      memberId: "m2",
      paymentId: "p1",
      academicYear: "2026/2027",
      amountLabel: "GHS 50.00",
      reference: "CASH-ABC123DEF456",
    });

    const [email] = sent();
    expect(email.to).toBe("kofi@example.com");
    expect(email.template).toBe("dues-cash-payment-removed");
    expect(email.html).toContain("no longer marked as paid");
  });
});
