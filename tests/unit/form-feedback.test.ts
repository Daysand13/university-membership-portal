import { describe, expect, it } from "vitest";
import { hasJustSaved, initialActionState, type ActionState } from "@/lib/actions/types";

/**
 * Pressing Save has to visibly do something. This is the rule behind the
 * "Saved." line every admin form shows, so a save can't go silent again.
 */
describe("has the form just saved?", () => {
  it("says nothing before anything is submitted", () => {
    expect(hasJustSaved(initialActionState, false)).toBe(false);
  });

  it("says nothing while the save is still running", () => {
    expect(hasJustSaved({}, true)).toBe(false);
    expect(hasJustSaved({ success: true }, true)).toBe(false);
  });

  it("confirms a save that came back clean", () => {
    // Actions that simply saved return a fresh, empty state…
    expect(hasJustSaved({}, false)).toBe(true);
    // …and ones that say so explicitly count too.
    expect(hasJustSaved({ success: true }, false)).toBe(true);
  });

  it("stays quiet when the save was refused", () => {
    expect(hasJustSaved({ error: "Something went wrong." }, false)).toBe(false);
    expect(hasJustSaved({ fieldErrors: { title: ["Give the slide a title"] } }, false)).toBe(false);
  });

  it("treats the shared initial state as 'nothing submitted', not as a save", () => {
    // The initial object is shared by every form; only a NEW object means
    // an action actually returned.
    const state: ActionState = initialActionState;
    expect(hasJustSaved(state, false)).toBe(false);
    expect(hasJustSaved({ ...state }, false)).toBe(true);
  });
});
