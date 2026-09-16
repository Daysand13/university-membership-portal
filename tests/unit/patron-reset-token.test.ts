import { beforeAll, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { passwordFingerprint, readPatronResetToken, signPatronResetToken } from "@/lib/auth/patron-reset-token";

beforeAll(() => {
  process.env.AUTH_SECRET ||= "test-secret-for-patron-password-reset-links";
});

const patron = { id: "patron-1", passwordHash: "$2a$12$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ01234" };
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET);

describe("patron password reset links", () => {
  it("name the patron and the password they were issued for", async () => {
    const token = await signPatronResetToken(patron);
    expect(await readPatronResetToken(token)).toEqual({
      patronId: "patron-1",
      fingerprint: passwordFingerprint(patron.passwordHash),
    });
  });

  it("stop matching once the password changes", async () => {
    const claims = await readPatronResetToken(await signPatronResetToken(patron));
    expect(claims?.fingerprint).not.toBe(passwordFingerprint("$2a$12$a-completely-different-hash"));
  });

  it("refuse a tampered, garbled or empty token", async () => {
    const token = await signPatronResetToken(patron);
    expect(await readPatronResetToken(`${token.slice(0, -3)}abc`)).toBeNull();
    expect(await readPatronResetToken("not-a-token")).toBeNull();
    expect(await readPatronResetToken("")).toBeNull();
  });

  it("refuse a sign-in session token, even though it's signed with the same secret", async () => {
    const session = await new SignJWT({ type: "patron" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("patron-1")
      .setExpirationTime("1h")
      .sign(key());
    expect(await readPatronResetToken(session)).toBeNull();
  });

  it("refuse an expired link", async () => {
    const expired = await new SignJWT({ type: "patron-password-reset", pwf: passwordFingerprint(patron.passwordHash) })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("patron-1")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(key());
    expect(await readPatronResetToken(expired)).toBeNull();
  });
});
