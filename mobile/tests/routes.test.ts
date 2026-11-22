import { describe, expect, it } from "vitest";
import { destinationFor } from "../src/push/routes";

describe("where a website link lands in the app", () => {
  it("opens news and events on the app's own screens", () => {
    expect(destinationFor("/news/budget-2027")).toEqual({ kind: "app", route: "/news/budget-2027" });
    expect(destinationFor("/events/sports-day?ref=push")).toEqual({ kind: "app", route: "/events/sports-day" });
  });

  it("opens a mentorship conversation in the app, from either portal's address", () => {
    expect(destinationFor("/membership/dashboard/mentorship/cm123")).toEqual({ kind: "app", route: "/mentorship/cm123" });
    expect(destinationFor("/alumni/mentorship/cm123")).toEqual({ kind: "app", route: "/mentorship/cm123" });
    expect(destinationFor("/alumni/mentorship")).toEqual({ kind: "app", route: "/mentorship" });
  });

  it("sends a call to the website, where the meeting runs", () => {
    expect(destinationFor("/membership/dashboard/mentorship/cm123/call")).toEqual({
      kind: "web",
      path: "/membership/dashboard/mentorship/cm123/call",
    });
  });

  it("opens anything the app has no screen for on the website, rather than a dead page", () => {
    expect(destinationFor("/membership/dashboard/letters")).toEqual({ kind: "web", path: "/membership/dashboard/letters" });
    expect(destinationFor("/login")).toEqual({ kind: "web", path: "/login" });
  });

  it("knows the screens it does have under their website names", () => {
    expect(destinationFor("/membership/dashboard/dues")).toEqual({ kind: "app", route: "/dues" });
    expect(destinationFor("/membership/dashboard/announcements")).toEqual({ kind: "app", route: "/announcements" });
    expect(destinationFor("/elections")).toEqual({ kind: "app", route: "/elections" });
  });
});
