import { describe, expect, it } from "vitest";
import { chunkForSpeech, describeControl, joinForSpeech } from "@/lib/a11y/page-speech";

/**
 * What the Read Aloud button says.
 *
 * This is the association's own screen reader, and for some members it is
 * the only way the site is read at all — so what it says about a control is
 * worth pinning down.
 */

describe("saying what a control is", () => {
  it("names a tick box and whether it is ticked", () => {
    expect(describeControl({ kind: "checkbox", name: "Braille materials", checked: true })).toBe(
      "Braille materials, tick box, ticked.",
    );
    expect(describeControl({ kind: "checkbox", name: "Braille materials", checked: false })).toBe(
      "Braille materials, tick box, not ticked.",
    );
  });

  it("says which option is chosen, which is the whole point of a radio group", () => {
    expect(describeControl({ kind: "radio", name: "Type my initials", checked: true })).toBe(
      "Type my initials, option, chosen.",
    );
    expect(describeControl({ kind: "radio", name: "Draw it", checked: false })).toBe(
      "Draw it, option, not chosen.",
    );
  });

  it("reads what is in a box, not the box", () => {
    expect(describeControl({ kind: "textbox", name: "Full name", value: "Ama Serwaa Mensah" })).toBe(
      "Full name, text box, Ama Serwaa Mensah.",
    );
    expect(describeControl({ kind: "textbox", name: "Full name", value: "", required: true })).toBe(
      "Full name, text box, empty, required.",
    );
  });

  it("reads a dropdown's choice rather than all of its options", () => {
    expect(describeControl({ kind: "select", name: "Programme", value: "B.Ed. Special Education" })).toBe(
      "Programme, dropdown, B.Ed. Special Education.",
    );
  });

  it("says when something cannot be used", () => {
    expect(describeControl({ kind: "button", name: "Save", disabled: true })).toBe("Save, button, not available.");
  });

  it("calls an unlabelled control what it is, rather than passing it in silence", () => {
    // A box nobody named is a fault, and a fault nobody can hear is worse.
    expect(describeControl({ kind: "textbox", name: "", value: "" })).toBe("unlabelled, text box, empty.");
  });
});

describe("reading a page out in pieces", () => {
  it("ends each part so the voice pauses between them", () => {
    expect(joinForSpeech(["Members", "Two members", ""])).toBe("Members. Two members.");
    // Something already punctuated is left as it was.
    expect(joinForSpeech(["Index Number:", "220010345."])).toBe("Index Number: 220010345.");
  });

  it("keeps an initial with what it belongs to", () => {
    // "B.Ed." split across two utterances is read as two fragments with a
    // gap in the middle of somebody's qualification.
    expect(chunkForSpeech("Programme, dropdown, B.Ed. Special Education.")).toEqual([
      "Programme, dropdown, B.Ed. Special Education.",
    ]);
    expect(chunkForSpeech("Your initials, text box, E.N. Printed above your name.")).toEqual([
      "Your initials, text box, E.N. Printed above your name.",
    ]);
  });

  it("still breaks a page into sentences", () => {
    expect(chunkForSpeech("Members. Two members. Nothing to approve.")).toEqual([
      "Members.",
      "Two members.",
      "Nothing to approve.",
    ]);
    expect(chunkForSpeech("   ")).toEqual([]);
  });
});
