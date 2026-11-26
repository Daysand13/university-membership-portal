import { File, Paths } from "expo-file-system";
import type { IdCardReply } from "../api/types";

/**
 * The last ID card fetched, kept on the phone so it can be shown with no
 * signal. In the app's own storage, which no other app can read, and
 * removed when the person signs out or is signed out.
 */

export type ReadyCard = Extract<IdCardReply, { status: "ready" }>;

const file = () => new File(Paths.document, "id-card.json");

export async function readSavedCard(): Promise<ReadyCard | null> {
  try {
    const f = file();
    if (!f.exists) return null;
    const card = JSON.parse(await f.text()) as ReadyCard;
    return card.status === "ready" ? card : null;
  } catch {
    return null;
  }
}

export function saveCard(card: ReadyCard): void {
  try {
    file().write(JSON.stringify(card));
  } catch {
    // A full phone is not a reason to fail the screen.
  }
}

export function forgetSavedCard(): void {
  try {
    const f = file();
    if (f.exists) f.delete();
  } catch {
    // Nothing to remove.
  }
}
