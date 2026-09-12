import { describe, expect, it } from "vitest";
import {
  aboutContentSchema,
  electionSchema,
  eventSchema,
  siteSettingsSchema,
  teamMemberSchema,
} from "@/lib/validations/content";
import { memberAdminEditSchema } from "@/lib/validations/membership";

const text = (length: number) => "a".repeat(length);

describe("text an administrator types isn't cut off at the old, too-small limits", () => {
  it("accepts a long executive position and a long bio", () => {
    const parsed = teamMemberSchema.safeParse({
      type: "LEADERSHIP",
      name: text(300),
      position: text(400), // was capped at 150
      bio: text(20_000), // was capped at 2,000
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a long About page history", () => {
    expect(aboutContentSchema.safeParse({ history: text(60_000) }).success).toBe(true); // was 8,000
  });

  it("accepts a long event title, summary and venue", () => {
    const parsed = eventSchema.safeParse({
      title: text(450), // was 200
      description: "A full description of the event.",
      shortDescription: text(2_000), // was 300
      startDate: "2026-10-01",
      endDate: "2026-10-01",
      venue: text(450), // was 200
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a long election description", () => {
    expect(electionSchema.safeParse({ title: "Executive Elections", description: text(30_000) }).success).toBe(true);
  });

  it("accepts long programme and department names when an admin corrects a member record", () => {
    const parsed = memberAdminEditSchema.safeParse({
      indexNumber: "5211040123",
      firstName: "Ama",
      lastName: "Mensah",
      email: "ama@example.com",
      phone: "0244000000",
      campus: "North Campus",
      programme: text(400), // was 200
      academicDepartment: text(400), // was 150
      level: "Level 300",
      yearOfAdmission: 2024,
      department: text(400), // was 150
      residentialAddress: text(1_500), // was 300
    });
    expect(parsed.success).toBe(true);
  });

  it("still refuses a runaway paste far beyond any real value", () => {
    expect(teamMemberSchema.safeParse({ type: "PATRON", name: "x", position: text(10_000) }).success).toBe(false);
  });
});

describe("site settings map link", () => {
  it("keeps just the URL when Google's Embed-a-map snippet is pasted", () => {
    const parsed = siteSettingsSchema.safeParse({
      siteTitle: "Association",
      mapEmbedUrl: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!2d-0.63!3d5.36" width="600" height="450"></iframe>',
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.mapEmbedUrl).toBe("https://www.google.com/maps/embed?pb=!1m18!2d-0.63!3d5.36");
  });

  it("accepts a share link and an empty value", () => {
    expect(siteSettingsSchema.safeParse({ siteTitle: "A", mapEmbedUrl: "https://maps.app.goo.gl/h47cU3akP5rCV6yr7" }).success).toBe(true);
    expect(siteSettingsSchema.safeParse({ siteTitle: "A", mapEmbedUrl: "" }).success).toBe(true);
  });
});
