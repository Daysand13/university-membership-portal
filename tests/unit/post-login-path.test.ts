import { describe, expect, it } from "vitest";
import { landingPathFor, postLoginPath } from "@/lib/auth/post-login-path";

describe("postLoginPath", () => {
  it("returns a dual member to the portal they picked in the switcher", () => {
    expect(postLoginPath("/alumni/dashboard", ["MEMBER", "ALUMNI"])).toBe("/alumni/dashboard");
    expect(postLoginPath("/membership/dashboard", ["MEMBER", "ALUMNI"])).toBe("/membership/dashboard");
  });

  it("ignores a portal the person's roles don't open", () => {
    expect(postLoginPath("/alumni/dashboard", ["MEMBER"])).toBe("/membership/dashboard");
  });

  it("never follows anything but the two portal dashboards", () => {
    for (const next of ["https://evil.example", "//evil.example", "/admin", "/alumni/dashboard/../../admin", "", null, undefined]) {
      expect(postLoginPath(next, ["MEMBER", "ALUMNI"])).toBe("/portal");
    }
  });

  it("falls back to the usual landing page", () => {
    expect(landingPathFor(["ALUMNI"])).toBe("/alumni/dashboard");
    expect(postLoginPath(undefined, ["ADMIN"])).toBe("/admin");
  });
});
