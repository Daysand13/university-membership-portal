import { describe, expect, it } from "vitest";
import { parseProse } from "@/lib/prose";
import { asPoints } from "@/components/ui/ProseText";
import { buildGreeting, segmentForHour } from "@/components/ui/WelcomeGreeting";
import { AdminRole } from "@/generated/prisma/enums";
import {
  ALL_CAPABILITIES,
  effectiveCapabilities,
  hasCapability,
  parsePermissionMask,
  ROLE_DEFAULTS,
} from "@/lib/auth/capabilities";
import { overridesFrom } from "@/lib/services/admin-permission-service";
import { adminAccountSchema, adminSetPasswordSchema } from "@/lib/validations/admin-account";

describe("points typed into a plain box", () => {
  it("reads dashes, bullets and numbers as lists", () => {
    expect(parseProse("- Advocacy\n- Inclusion\n* Access")).toEqual([
      { kind: "bullets", items: ["Advocacy", "Inclusion", "Access"] },
    ]);
    expect(parseProse("1. First\n2) Second")).toEqual([{ kind: "numbers", items: ["First", "Second"] }]);
  });

  it("keeps ordinary prose as prose, and its line breaks", () => {
    expect(parseProse("We speak up for students.\nEvery one of them.")).toEqual([
      { kind: "paragraph", lines: ["We speak up for students.", "Every one of them."] },
    ]);
  });

  it("separates a list from the words introducing it", () => {
    expect(parseProse("Our objectives are:\n\n- Access\n- Dignity")).toEqual([
      { kind: "paragraph", lines: ["Our objectives are:"] },
      { kind: "bullets", items: ["Access", "Dignity"] },
    ]);
  });

  it("doesn't turn a stray hyphen inside a sentence into a bullet", () => {
    expect(parseProse("Students with special needs-including deaf students-are represented.")).toEqual([
      { kind: "paragraph", lines: ["Students with special needs-including deaf students-are represented."] },
    ]);
  });
});

describe("sections that are lists of points", () => {
  // How the association actually writes its core values: one point per
  // paragraph, a label, a colon, and no dash in sight.
  const coreValues = [
    "Inclusivity: Ensuring every member feels welcomed.",
    "",
    "Advocacy: Speaking up for the rights of students with special needs.",
    "",
    "Empowerment: Building confidence and independence.",
  ].join("\n");

  it("bullets each point, however it was typed", () => {
    expect(asPoints(parseProse(coreValues))).toEqual([
      {
        kind: "bullets",
        items: [
          "Inclusivity: Ensuring every member feels welcomed.",
          "Advocacy: Speaking up for the rights of students with special needs.",
          "Empowerment: Building confidence and independence.",
        ],
      },
    ]);
  });

  it("leaves a list the writer marked up exactly as they marked it", () => {
    expect(asPoints(parseProse("1. Access\n2. Dignity"))).toEqual([
      { kind: "numbers", items: ["Access", "Dignity"] },
    ]);
  });
});

describe("the welcome greeting", () => {
  it("matches the hour to the part of the day", () => {
    expect(segmentForHour(5)).toBe("morning");
    expect(segmentForHour(11)).toBe("morning");
    expect(segmentForHour(12)).toBe("afternoon");
    expect(segmentForHour(16)).toBe("afternoon");
    expect(segmentForHour(17)).toBe("evening");
    expect(segmentForHour(20)).toBe("evening");
    expect(segmentForHour(21)).toBe("night");
    expect(segmentForHour(4)).toBe("night");
  });

  it("greets a signed-in person by name, and a visitor without one", () => {
    const wednesdayMorning = new Date(2026, 8, 23, 9, 30);
    expect(buildGreeting(wednesdayMorning, "Eric").text).toContain("Good morning, Eric!");
    expect(buildGreeting(wednesdayMorning).text).toContain("Good morning!");
  });

  it("says so on a Wednesday, and not on other days", () => {
    expect(buildGreeting(new Date(2026, 8, 23, 14, 0)).text).toContain("Happy mid-week!");
    expect(buildGreeting(new Date(2026, 8, 24, 14, 0)).text).not.toContain("mid-week");
  });

  it("names the day and thanks them for the time of day", () => {
    const text = buildGreeting(new Date(2026, 8, 24, 22, 5)).text;
    expect(text).toContain("Thursday");
    expect(text).toContain("Thank you for passing through tonight.");
  });
});

describe("what an administrator may do", () => {
  it("gives a role its defaults when nothing has been changed", () => {
    const editor = effectiveCapabilities(AdminRole.EDITOR, null);
    expect(hasCapability(editor, "content.news", "content.news.publish")).toBe(true);
    expect(hasCapability(editor, "finance.dues.record")).toBe(false);
  });

  it("grants and withholds individual capabilities on top of the role", () => {
    const secretary = effectiveCapabilities(AdminRole.MEMBERSHIP_OFFICER, {
      "finance.dues.record": true,
      "support.requests.decide": false,
      "content.news": true,
    });
    expect(hasCapability(secretary, "finance.dues.record", "content.news")).toBe(true);
    expect(hasCapability(secretary, "support.requests.decide")).toBe(false);
    // Untouched capabilities still follow the role.
    expect(hasCapability(secretary, "members.records")).toBe(true);
  });

  it("leaves a super administrator holding everything, whatever the mask says", () => {
    const every = effectiveCapabilities(AdminRole.SUPER_ADMIN, { "site.permissions": false, "members.records": false });
    expect(every.size).toBe(ALL_CAPABILITIES.length);
    expect(hasCapability(every, "site.permissions")).toBe(true);
  });

  it("ignores anything in the stored mask that isn't a real capability", () => {
    expect(parsePermissionMask({ "finance.dues": true, "not.a.capability": true, "content.news": "yes" })).toEqual({
      "finance.dues": true,
    });
  });

  it("stores only what differs from the role, so role changes still carry", () => {
    const defaults = ROLE_DEFAULTS[AdminRole.LIBRARIAN];
    expect(overridesFrom(AdminRole.LIBRARIAN, defaults)).toEqual({});
    expect(overridesFrom(AdminRole.LIBRARIAN, [...defaults, "content.news"])).toEqual({ "content.news": true });
    expect(overridesFrom(AdminRole.LIBRARIAN, defaults.filter((c) => c !== "library.documents"))).toEqual({
      "library.documents": false,
    });
  });

  it("round-trips: saving what the grid shows leaves the same capabilities", () => {
    const granted = [...effectiveCapabilities(AdminRole.EDITOR, { "content.news.publish": false })];
    const mask = overridesFrom(AdminRole.EDITOR, granted);
    expect([...effectiveCapabilities(AdminRole.EDITOR, mask)].sort()).toEqual([...granted].sort());
  });
});

describe("creating an administrator account", () => {
  const valid = { name: "Ama Boateng", email: "Ama@Assnuew.com", role: "EDITOR" };

  it("needs a name, a real address and a known role", () => {
    const parsed = adminAccountSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    // The address is what the invitation is sent to, so it is normalised.
    expect(parsed.success && parsed.data.email).toBe("ama@assnuew.com");
    expect(adminAccountSchema.safeParse({ ...valid, email: "not-an-address" }).success).toBe(false);
    expect(adminAccountSchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
    expect(adminAccountSchema.safeParse({ ...valid, role: "PRESIDENT" }).success).toBe(false);
  });

  it("never takes a password: there is no field for one", () => {
    const parsed = adminAccountSchema.safeParse({ ...valid, password: "Whatever123!" });
    expect(parsed.success && "password" in parsed.data).toBe(false);
  });

  it("makes the invited person confirm the password they choose", () => {
    const token = "a".repeat(64);
    expect(
      adminSetPasswordSchema.safeParse({ token, newPassword: "Str0ng-Passw0rd!", confirmNewPassword: "Str0ng-Passw0rd!" })
        .success,
    ).toBe(true);
    expect(
      adminSetPasswordSchema.safeParse({ token, newPassword: "Str0ng-Passw0rd!", confirmNewPassword: "different" }).success,
    ).toBe(false);
    expect(adminSetPasswordSchema.safeParse({ token, newPassword: "short", confirmNewPassword: "short" }).success).toBe(false);
    expect(
      adminSetPasswordSchema.safeParse({ token: "", newPassword: "Str0ng-Passw0rd!", confirmNewPassword: "Str0ng-Passw0rd!" })
        .success,
    ).toBe(false);
  });
});
