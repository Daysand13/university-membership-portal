import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, isPasswordStrongEnough } from "@/lib/auth/password";

describe("password hashing", () => {
  it("hashes a password and can verify it later", async () => {
    const hash = await hashPassword("UEW/EDU/24/0001");
    expect(hash).not.toBe("UEW/EDU/24/0001");
    expect(hash.startsWith("$2")).toBe(true); // bcrypt hash marker
    expect(await verifyPassword("UEW/EDU/24/0001", hash)).toBe(true);
  });

  it("rejects an incorrect password against a stored hash", async () => {
    const hash = await hashPassword("correct-password");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a different hash each time (unique salt)", async () => {
    const a = await hashPassword("same-input");
    const b = await hashPassword("same-input");
    expect(a).not.toBe(b);
  });
});

describe("password strength policy", () => {
  it("accepts a password meeting all requirements", () => {
    expect(isPasswordStrongEnough("Abcdef12")).toBe(true);
  });

  it.each([
    ["short", "Ab1"],
    ["no uppercase", "abcdefg1"],
    ["no lowercase", "ABCDEFG1"],
    ["no digit", "Abcdefgh"],
  ])("rejects password with %s", (_label, password) => {
    expect(isPasswordStrongEnough(password)).toBe(false);
  });
});
