import { describe, expect, it } from "vitest";
import { extractMapUrl, isMapShortLink, locationFromGoogleMapsUrl } from "@/lib/maps-url";

describe("extractMapUrl", () => {
  it("returns a plain URL unchanged (trimmed)", () => {
    expect(extractMapUrl("  https://maps.app.goo.gl/abc  ")).toBe("https://maps.app.goo.gl/abc");
  });

  it("pulls the src out of Google's Embed-a-map snippet", () => {
    const snippet =
      '<iframe src="https://www.google.com/maps/embed?pb=!1m18!2d-0.63!3d5.36&amp;x=1" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>';
    expect(extractMapUrl(snippet)).toBe("https://www.google.com/maps/embed?pb=!1m18!2d-0.63!3d5.36&x=1");
  });
});

describe("isMapShortLink", () => {
  it("recognises share links", () => {
    expect(isMapShortLink("https://maps.app.goo.gl/h47cU3akP5rCV6yr7")).toBe(true);
    expect(isMapShortLink("https://goo.gl/maps/abc")).toBe(true);
  });
  it("does not treat full Google Maps URLs or other goo.gl links as map short links", () => {
    expect(isMapShortLink("https://www.google.com/maps/place/x")).toBe(false);
    expect(isMapShortLink("https://goo.gl/something")).toBe(false);
  });
});

describe("locationFromGoogleMapsUrl", () => {
  it("uses the DESTINATION of a shared directions link, never the sharer's own position", () => {
    // The exact URL the association's saved share link redirects to. It
    // starts at the sharer's GPS position (5.3873874,-0.6515267) — that must
    // never be what gets pinned on a public page.
    const url =
      "https://www.google.com/maps/dir/5.3873874,-0.6515267/University+of+Education,+Winneba/data=!4m10!4m9!1m1!4e1!1m5!1m4!1s0xfde356b7affb3e5:0xb8a2037936e8eb16!8m2!3d5.363087!4d-0.6321500999999999!3e0?utm_source=mstt_0";
    const location = locationFromGoogleMapsUrl(url);
    expect(location).not.toBeNull();
    expect(location!.embedUrl).toBe("https://maps.google.com/maps?q=5.363087,-0.6321500999999999&z=16&output=embed");
    expect(location!.directionsUrl).toContain("destination=5.363087,-0.6321500999999999");
    expect(JSON.stringify(location)).not.toContain("5.3873874");
    expect(JSON.stringify(location)).not.toContain("-0.6515267");
  });

  it("uses a place's own coordinates rather than the viewport centre", () => {
    const url =
      "https://www.google.com/maps/place/University+of+Education,+Winneba/@5.36,-0.63,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d5.363087!4d-0.63215!16s";
    expect(locationFromGoogleMapsUrl(url)!.embedUrl).toContain("q=5.363087,-0.63215");
  });

  it("falls back to the place name when there are no coordinates", () => {
    const location = locationFromGoogleMapsUrl("https://www.google.com/maps/place/University+of+Education,+Winneba/");
    expect(location!.embedUrl).toBe(
      `https://maps.google.com/maps?q=${encodeURIComponent("University of Education, Winneba")}&z=16&output=embed`,
    );
  });

  it("reads q= query links", () => {
    expect(locationFromGoogleMapsUrl("https://maps.google.com/?q=5.36,-0.63")!.embedUrl).toContain("q=5.36,-0.63");
    expect(locationFromGoogleMapsUrl("https://www.google.com/maps?q=Winneba")!.embedUrl).toContain("q=Winneba");
  });

  it("keeps a real embed URL as-is and derives open/directions links from it", () => {
    const embed = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3970.9!2d-0.6321501!3d5.363087!2m3";
    const location = locationFromGoogleMapsUrl(embed);
    expect(location!.embedUrl).toBe(embed);
    expect(location!.openUrl).toContain("query=5.363087,-0.6321501");
  });

  it("takes the last stop of a directions link with no data blob", () => {
    const location = locationFromGoogleMapsUrl("https://www.google.com/maps/dir/5.38,-0.65/Winneba+Junction/");
    expect(location!.embedUrl).toContain(`q=${encodeURIComponent("Winneba Junction")}`);
    expect(JSON.stringify(location)).not.toContain("5.38,-0.65");
  });

  it("rejects anything that isn't Google Maps", () => {
    expect(locationFromGoogleMapsUrl("https://example.com/maps/place/x")).toBeNull();
    expect(locationFromGoogleMapsUrl("https://www.google.com/search?q=winneba")).toBeNull();
    expect(locationFromGoogleMapsUrl("javascript:alert(1)")).toBeNull();
    expect(locationFromGoogleMapsUrl("not a url")).toBeNull();
  });

  it("rejects out-of-range coordinates", () => {
    expect(locationFromGoogleMapsUrl("https://maps.google.com/?ll=95,200")).toBeNull();
  });
});
