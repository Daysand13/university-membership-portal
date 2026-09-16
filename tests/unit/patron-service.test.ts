import { beforeEach, describe, expect, it, vi } from "vitest";

// No database, no real hashing, no email: each is replaced so these read as
// the rules they check.
const mocks = vi.hoisted(() => ({
  db: {
    patronProfile: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    notification: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  notify: {
    notifyAdminsOfPatronApplication: vi.fn(async () => {}),
    notifyPasswordChanged: vi.fn(async () => {}),
    notifyPatronApplicationReceived: vi.fn(async () => {}),
    notifyPatronDecision: vi.fn(async () => {}),
    notifyPatronPasswordReset: vi.fn<(params: { resetPath: string }) => Promise<void>>(async () => {}),
    notifyPatronRemoved: vi.fn(async () => {}),
    patronSalutation: (p: { fullName: string }) => p.fullName,
  },
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth/password", async (importOriginal) => ({
  // The real password rules stay; only hashing is replaced.
  ...(await importOriginal<typeof import("@/lib/auth/password")>()),
  hashPassword: async (password: string) => `hash:${password}`,
  verifyPassword: async (password: string, hash: string) => hash === `hash:${password}`,
}));
vi.mock("@/lib/services/account-notification-service", () => mocks.notify);

import {
  authenticatePatron,
  canDeletePatron,
  deletePatron,
  InvalidPatronResetLinkError,
  isPatronResetLinkValid,
  PatronDeleteError,
  requestPatronPasswordReset,
  resetPatronPassword,
  DuplicatePatronEmailError,
  InvalidPatronCredentialsError,
  PatronNotApprovedError,
  PatronReviewError,
  registerPatron,
  reviewPatron,
} from "@/lib/services/patron-service";
import { patronRegisterSchema } from "@/lib/validations/patron";

const { db, notify } = mocks;

const application = {
  title: "Dr." as const,
  fullName: "Akosua Boateng",
  email: "akosua@example.com",
  phone: "0240000000",
  occupation: "Medical Doctor",
  organization: "Winneba Municipal Hospital",
  jobTitle: "",
  address: "Winneba",
  region: "Central",
  supportInterest: "Health talks for members",
  motivation: "",
  password: "Secret123",
  confirmPassword: "Secret123",
  consent: true as const,
};

function stored(overrides: Record<string, unknown> = {}) {
  return { id: "patron-1", ...application, passwordHash: "hash:Secret123", status: "PENDING", ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === "function" ? (arg as (tx: typeof db) => Promise<unknown>)(db) : Promise.all(arg as Promise<unknown>[]),
  );
  db.patronProfile.create.mockImplementation(async ({ data }: { data: object }) => ({ id: "patron-1", ...data }));
  db.patronProfile.update.mockImplementation(async ({ data }: { data: object }) => ({ id: "patron-1", ...data }));
});

describe("registerPatron", () => {
  it("saves a pending application with a hashed password and tells the applicant and the admins", async () => {
    db.patronProfile.findUnique.mockResolvedValue(null);

    await registerPatron(application);

    const { data } = db.patronProfile.create.mock.calls[0][0];
    expect(data).toMatchObject({ email: "akosua@example.com", occupation: "Medical Doctor", passwordHash: "hash:Secret123", jobTitle: null });
    expect(data).not.toHaveProperty("password");
    expect(notify.notifyPatronApplicationReceived).toHaveBeenCalledTimes(1);
    expect(notify.notifyAdminsOfPatronApplication).toHaveBeenCalledTimes(1);
  });

  it("refuses a second application with the same email while the first is pending or approved", async () => {
    for (const status of ["PENDING", "APPROVED", "SUSPENDED"]) {
      db.patronProfile.findUnique.mockResolvedValue(stored({ status }));
      await expect(registerPatron(application)).rejects.toBeInstanceOf(DuplicatePatronEmailError);
    }
    expect(db.patronProfile.create).not.toHaveBeenCalled();
    expect(notify.notifyPatronApplicationReceived).not.toHaveBeenCalled();
  });

  it("lets someone who was rejected apply again, as a fresh pending application", async () => {
    db.patronProfile.findUnique.mockResolvedValue(stored({ status: "REJECTED", adminNote: "Incomplete details" }));

    await registerPatron(application);

    expect(db.patronProfile.update).toHaveBeenCalledWith({
      where: { id: "patron-1" },
      data: expect.objectContaining({ status: "PENDING", reviewedById: null, reviewedAt: null, adminNote: null }),
    });
  });
});

describe("authenticatePatron", () => {
  it("signs in an approved patron", async () => {
    db.patronProfile.findUnique.mockResolvedValue(stored({ status: "APPROVED" }));
    await expect(authenticatePatron("Akosua@Example.com ", "Secret123")).resolves.toMatchObject({ id: "patron-1" });
  });

  it("gives the same answer for an unknown email and a wrong password", async () => {
    db.patronProfile.findUnique.mockResolvedValue(null);
    await expect(authenticatePatron("nobody@example.com", "Secret123")).rejects.toBeInstanceOf(InvalidPatronCredentialsError);

    db.patronProfile.findUnique.mockResolvedValue(stored({ status: "PENDING" }));
    await expect(authenticatePatron("akosua@example.com", "wrong")).rejects.toBeInstanceOf(InvalidPatronCredentialsError);
  });

  it("explains a pending, rejected or suspended account only to someone with the right password", async () => {
    for (const status of ["PENDING", "REJECTED", "SUSPENDED"] as const) {
      db.patronProfile.findUnique.mockResolvedValue(stored({ status }));
      const attempt = authenticatePatron("akosua@example.com", "Secret123");
      await expect(attempt).rejects.toBeInstanceOf(PatronNotApprovedError);
      await expect(attempt).rejects.toMatchObject({ status });
    }
  });
});

describe("reviewPatron", () => {
  it("approves a pending application, records it, and emails the applicant", async () => {
    db.patronProfile.findUnique.mockResolvedValue(stored({ status: "PENDING" }));
    db.patronProfile.updateMany.mockResolvedValue({ count: 1 });
    db.patronProfile.findUniqueOrThrow.mockResolvedValue(stored({ status: "APPROVED" }));

    await reviewPatron({ patronId: "patron-1", adminId: "admin-1", decision: "APPROVE" });

    expect(db.patronProfile.updateMany).toHaveBeenCalledWith({
      where: { id: "patron-1", status: "PENDING" },
      data: expect.objectContaining({ status: "APPROVED", reviewedById: "admin-1" }),
    });
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "PATRON_APPROVED", adminId: "admin-1" }),
    });
    expect(notify.notifyPatronDecision).toHaveBeenCalledWith(
      expect.objectContaining({ status: "APPROVED", previousStatus: "PENDING", note: null }),
    );
  });

  it("passes the admin's note along with a rejection", async () => {
    db.patronProfile.findUnique.mockResolvedValue(stored({ status: "PENDING" }));
    db.patronProfile.updateMany.mockResolvedValue({ count: 1 });
    db.patronProfile.findUniqueOrThrow.mockResolvedValue(stored({ status: "REJECTED" }));

    await reviewPatron({ patronId: "patron-1", adminId: "admin-1", decision: "REJECT", note: "  Please add your organisation.  " });

    expect(notify.notifyPatronDecision).toHaveBeenCalledWith(
      expect.objectContaining({ status: "REJECTED", note: "Please add your organisation." }),
    );
  });

  it("refuses a decision the current status doesn't allow, changing nothing", async () => {
    db.patronProfile.findUnique.mockResolvedValue(stored({ status: "PENDING" }));
    await expect(reviewPatron({ patronId: "patron-1", adminId: "a", decision: "SUSPEND" })).rejects.toBeInstanceOf(PatronReviewError);

    db.patronProfile.findUnique.mockResolvedValue(stored({ status: "APPROVED" }));
    await expect(reviewPatron({ patronId: "patron-1", adminId: "a", decision: "REJECT" })).rejects.toBeInstanceOf(PatronReviewError);

    expect(db.patronProfile.updateMany).not.toHaveBeenCalled();
    expect(notify.notifyPatronDecision).not.toHaveBeenCalled();
  });

  it("sends nothing when another admin decided first", async () => {
    db.patronProfile.findUnique.mockResolvedValue(stored({ status: "PENDING" }));
    db.patronProfile.updateMany.mockResolvedValue({ count: 0 });

    await expect(reviewPatron({ patronId: "patron-1", adminId: "a", decision: "APPROVE" })).rejects.toBeInstanceOf(PatronReviewError);
    expect(db.auditLog.create).not.toHaveBeenCalled();
    expect(notify.notifyPatronDecision).not.toHaveBeenCalled();
  });
});

describe("forgotten passwords", () => {
  const resetTokenFrom = () => {
    const { resetPath } = notify.notifyPatronPasswordReset.mock.calls[0][0];
    return decodeURIComponent(resetPath.split("token=")[1]);
  };

  beforeEach(() => {
    process.env.AUTH_SECRET ||= "test-secret-for-patron-password-reset-links";
  });

  it("emails a reset link to an existing patron, and nothing for an unknown email or a rejected application", async () => {
    db.patronProfile.findUnique.mockResolvedValue(null);
    await requestPatronPasswordReset("nobody@example.com");
    db.patronProfile.findUnique.mockResolvedValue(stored({ status: "REJECTED" }));
    await requestPatronPasswordReset("akosua@example.com");
    expect(notify.notifyPatronPasswordReset).not.toHaveBeenCalled();

    db.patronProfile.findUnique.mockResolvedValue(stored({ status: "APPROVED" }));
    await requestPatronPasswordReset(" Akosua@Example.com ");
    expect(notify.notifyPatronPasswordReset).toHaveBeenCalledTimes(1);
    expect(resetTokenFrom()).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  it("sets a new password once, and the same link is refused afterwards", async () => {
    const patron = stored({ status: "APPROVED" });
    db.patronProfile.findUnique.mockResolvedValue(patron);
    await requestPatronPasswordReset(patron.email);
    const token = resetTokenFrom();

    expect(await isPatronResetLinkValid(token)).toBe(true);
    db.patronProfile.updateMany.mockResolvedValue({ count: 1 });
    await resetPatronPassword(token, "NewSecret456");
    expect(db.patronProfile.updateMany).toHaveBeenCalledWith({
      where: { id: "patron-1", passwordHash: "hash:Secret123" },
      data: { passwordHash: "hash:NewSecret456" },
    });
    expect(notify.notifyPasswordChanged).toHaveBeenCalledTimes(1);

    // The stored password has changed, so the link no longer matches it.
    db.patronProfile.findUnique.mockResolvedValue({ ...patron, passwordHash: "hash:NewSecret456" });
    expect(await isPatronResetLinkValid(token)).toBe(false);
    await expect(resetPatronPassword(token, "Another789")).rejects.toBeInstanceOf(InvalidPatronResetLinkError);
  });

  it("refuses a link submitted twice at once, after the first one changed the password", async () => {
    db.patronProfile.findUnique.mockResolvedValue(stored({ status: "APPROVED" }));
    await requestPatronPasswordReset("akosua@example.com");
    db.patronProfile.updateMany.mockResolvedValue({ count: 0 });

    await expect(resetPatronPassword(resetTokenFrom(), "NewSecret456")).rejects.toBeInstanceOf(InvalidPatronResetLinkError);
    expect(notify.notifyPasswordChanged).not.toHaveBeenCalled();
  });

  it("refuses a made-up link", async () => {
    expect(await isPatronResetLinkValid("made.up.token")).toBe(false);
    await expect(resetPatronPassword("made.up.token", "NewSecret456")).rejects.toBeInstanceOf(InvalidPatronResetLinkError);
  });
});

describe("deletePatron", () => {
  it("lets the membership team delete applications, and only a super admin delete accounts", () => {
    expect(canDeletePatron("MEMBERSHIP_OFFICER", "PENDING")).toBe(true);
    expect(canDeletePatron("MEMBERSHIP_OFFICER", "REJECTED")).toBe(true);
    expect(canDeletePatron("MEMBERSHIP_OFFICER", "APPROVED")).toBe(false);
    expect(canDeletePatron("MEMBERSHIP_OFFICER", "SUSPENDED")).toBe(false);
    expect(canDeletePatron("SUPER_ADMIN", "APPROVED")).toBe(true);
    expect(canDeletePatron("EDITOR", "PENDING")).toBe(false);
  });

  it("deletes, keeps an audit record of who it was, and emails them when asked", async () => {
    db.patronProfile.findUnique.mockResolvedValue(stored({ status: "APPROVED", submittedAt: new Date("2026-09-16") }));

    await deletePatron({ patronId: "patron-1", adminId: "admin-1", adminRole: "SUPER_ADMIN", notify: true });

    expect(db.patronProfile.delete).toHaveBeenCalledWith({ where: { id: "patron-1" } });
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "DELETE_PATRON",
        previousValue: expect.objectContaining({ email: "akosua@example.com", status: "APPROVED" }),
      }),
    });
    expect(notify.notifyPatronRemoved).toHaveBeenCalledWith(expect.objectContaining({ wasAccount: true }));
  });

  it("sends nothing when the admin unticks the email", async () => {
    db.patronProfile.findUnique.mockResolvedValue(stored({ status: "REJECTED", submittedAt: new Date() }));
    await deletePatron({ patronId: "patron-1", adminId: "a", adminRole: "MEMBERSHIP_OFFICER", notify: false });
    expect(db.patronProfile.delete).toHaveBeenCalled();
    expect(notify.notifyPatronRemoved).not.toHaveBeenCalled();
  });

  it("refuses a membership officer deleting an approved account, changing nothing", async () => {
    db.patronProfile.findUnique.mockResolvedValue(stored({ status: "APPROVED", submittedAt: new Date() }));
    await expect(
      deletePatron({ patronId: "patron-1", adminId: "a", adminRole: "MEMBERSHIP_OFFICER", notify: true }),
    ).rejects.toBeInstanceOf(PatronDeleteError);
    expect(db.patronProfile.delete).not.toHaveBeenCalled();
  });
});

describe("patronRegisterSchema", () => {
  it("accepts a complete application", () => {
    expect(patronRegisterSchema.safeParse(application).success).toBe(true);
  });

  it("requires their work and consent", () => {
    const parsed = patronRegisterSchema.safeParse({ ...application, occupation: "", consent: false });
    const errors = !parsed.success ? parsed.error.flatten().fieldErrors : {};
    expect(errors.occupation).toBeDefined();
    expect(errors.consent).toBeDefined();
  });

  it("requires the two passwords to match", () => {
    const parsed = patronRegisterSchema.safeParse({ ...application, confirmPassword: "Different123" });
    const errors = !parsed.success ? parsed.error.flatten().fieldErrors : {};
    expect(errors.confirmPassword).toEqual(["Passwords do not match"]);
  });
});
