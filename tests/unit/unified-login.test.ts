import { beforeEach, describe, expect, it, vi } from "vitest";

// Hashing is replaced with a readable stand-in so these read as what they
// check: which of a person's passwords the one sign-in box accepts.
const mocks = vi.hoisted(() => ({
  db: {
    user: { findUnique: vi.fn() },
    studentEnrollment: { findUnique: vi.fn() },
    member: { findUnique: vi.fn() },
    userRole: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth/password", () => ({
  verifyPassword: async (password: string, hash: string) => hash === `hash:${password}`,
}));

import { authenticateUser, InvalidLoginError, PasswordNotSetError } from "@/lib/services/user-service";

const { db } = mocks;

function account(passwords: { account?: string; member?: string | null; alumni?: string | null }) {
  return {
    id: "user-1",
    email: "ama@example.com",
    passwordHash: passwords.account === undefined ? "hash:temporary-0240000000" : passwords.account,
    member: passwords.member === null ? null : { passwordHash: `hash:${passwords.member ?? "temporary-0240000000"}` },
    alumniProfile: passwords.alumni === null || passwords.alumni === undefined ? null : { passwordHash: passwords.alumni },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.userRole.findMany.mockResolvedValue([{ role: "MEMBER" }, { role: "ALUMNI" }]);
});

describe("authenticateUser", () => {
  it("accepts the alumni password by email, even though the account's own password is out of date", async () => {
    // The member changed nothing on the account row; they set an alumni
    // password from an invite. That's the password they use.
    db.user.findUnique.mockResolvedValue(account({ alumni: "hash:alumni-secret" }));

    await expect(authenticateUser("Ama@Example.com", "alumni-secret")).resolves.toMatchObject({ id: "user-1" });
  });

  it("accepts a changed member password by index number", async () => {
    db.studentEnrollment.findUnique.mockResolvedValue({ user: account({ member: "new-member-secret" }) });

    await expect(authenticateUser("8261234567", "new-member-secret")).resolves.toMatchObject({ id: "user-1" });
  });

  it("still accepts the account's own password", async () => {
    db.user.findUnique.mockResolvedValue(account({}));

    await expect(authenticateUser("ama@example.com", "temporary-0240000000")).resolves.toMatchObject({ id: "user-1" });
  });

  it("refuses a password that matches none of the person's passwords", async () => {
    db.user.findUnique.mockResolvedValue(account({ alumni: "hash:alumni-secret" }));

    await expect(authenticateUser("ama@example.com", "someone-elses-password")).rejects.toBeInstanceOf(InvalidLoginError);
  });

  it("says the password isn't set yet when there's no password anywhere", async () => {
    db.user.findUnique.mockResolvedValue(account({ account: "", member: null, alumni: null }));

    await expect(authenticateUser("ama@example.com", "anything")).rejects.toBeInstanceOf(PasswordNotSetError);
  });

  it("refuses an unknown email or index number", async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.studentEnrollment.findUnique.mockResolvedValue(null);
    db.member.findUnique.mockResolvedValue(null);

    await expect(authenticateUser("nobody@example.com", "x")).rejects.toBeInstanceOf(InvalidLoginError);
    await expect(authenticateUser("0000000000", "x")).rejects.toBeInstanceOf(InvalidLoginError);
  });
});
