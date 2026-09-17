export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
}

export const initialActionState: ActionState = {};

/**
 * Whether a form's last submission finished successfully — which is what
 * lets a form say "Saved" instead of leaving the person wondering whether
 * the button did anything.
 *
 * An action that saved returns a fresh object (often an empty one, or
 * { success: true }), so a state that is no longer the initial one and
 * carries no errors means the save went through. While a submission is in
 * flight the previous state is still current, hence the isPending guard.
 */
export function hasJustSaved(state: ActionState, isPending: boolean): boolean {
  if (isPending || state === initialActionState) return false;
  return !state.error && !state.fieldErrors;
}
