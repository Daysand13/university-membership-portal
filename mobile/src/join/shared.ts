import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiError } from "../api/client";

/**
 * What the four sign-up screens share: the lists the server offers, a
 * draft that survives the app being closed behind the camera, and turning
 * a refused form into something somebody can act on.
 */

export type Track = "UNDERGRADUATE" | "POSTGRADUATE";

export interface JoinOptions {
  student: {
    membershipTypes: { value: string; label: string }[];
    campuses: string[];
    halls: string[];
    regions: string[];
    supportNeeds: string[];
    specialNeedsCategories: string[];
    tracks: Record<Track, { departments: string[]; programmes: string[]; levels: string[]; degreeCategories: string[] }>;
    limits: { passportBytes: number; medicalReportBytes: number; medicalReportTypes: string[] };
  };
  patron: { titles: string[] };
  passwordRule: string;
}

export type FieldErrors = Record<string, string[]>;

/**
 * Android closes an app behind the camera or the file picker when the phone
 * is short of memory — common on the phones many members have. Without a
 * draft, coming back from taking a passport photo could mean an empty form.
 *
 * Kept for two hours, the life of an upload ticket: after that the
 * attachments in it would be refused anyway. Cleared the moment the form is
 * sent, so a shared phone does not keep somebody's half-finished
 * application for the next person.
 */
const DRAFT_HOURS = 2;

export async function loadDraft<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`draft:${key}`);
    if (!raw) return null;
    const { savedAt, value } = JSON.parse(raw) as { savedAt: number; value: T };
    if (Date.now() - savedAt > DRAFT_HOURS * 60 * 60 * 1000) {
      await AsyncStorage.removeItem(`draft:${key}`);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export async function saveDraft<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(`draft:${key}`, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // A draft that could not be saved costs nothing until the app is closed.
  }
}

export async function clearDraft(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`draft:${key}`);
  } catch {
    // Expires by itself in two hours regardless.
  }
}

/**
 * A refused form, said where the person is.
 *
 * The form is long and the submit button is at the bottom, so the summary
 * goes beside the button — and names the boxes, rather than "some details
 * need correcting" with no hint of which, on a screen several thumbs-worth
 * tall.
 */
export function refusal(err: unknown, labels: Record<string, string>): { message: string; fieldErrors: FieldErrors } {
  if (!(err instanceof ApiError)) {
    return { message: "Something went wrong. Check your connection and try again.", fieldErrors: {} };
  }
  const fieldErrors = err.fieldErrors;
  const named = Object.keys(fieldErrors).map((field) => labels[field] ?? field);
  if (named.length === 0) return { message: err.message, fieldErrors };

  const list = named.length > 3 ? `${named.slice(0, 3).join(", ")} and ${named.length - 3} more` : named.join(", ");
  const boxes = named.length === 1 ? "One box needs" : `${named.length} boxes need`;
  return { message: `${boxes} correcting: ${list}. The message is under each one.`, fieldErrors };
}
