import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Fonts for rendering ID cards. The image renderer has no access to system
 * fonts and only ships a single regular weight of its own, so the card's
 * typefaces live in the repository (src/assets/fonts, both SIL Open Font
 * License — see the LICENSE files there). next.config.ts makes sure these
 * files are deployed with the route that reads them.
 *
 * The Latin Extended files carry letters like Ɛ and Ɔ used in Ghanaian names;
 * the renderer falls back to them for any character the main files lack, so
 * such a name prints correctly instead of as empty boxes.
 */

type Weight = 400 | 600 | 700 | 800;

export interface CardFont {
  name: string;
  data: ArrayBuffer;
  weight: Weight;
  style: "normal" | "italic";
}

const FONT_FILES: { file: string; name: string; weight: Weight; style: "normal" | "italic" }[] = [
  { file: "Inter-Regular.woff", name: "Inter", weight: 400, style: "normal" },
  { file: "Inter-SemiBold.woff", name: "Inter", weight: 600, style: "normal" },
  { file: "Inter-Bold.woff", name: "Inter", weight: 700, style: "normal" },
  { file: "Inter-ExtraBold.woff", name: "Inter", weight: 800, style: "normal" },
  // A family name of their own: registered under "Inter" at the same weights,
  // the renderer treated them as duplicates and drew Ɛ/Ɔ from a thin fallback.
  { file: "Inter-SemiBold-LatinExt.woff", name: "Inter Ext", weight: 600, style: "normal" },
  { file: "Inter-Bold-LatinExt.woff", name: "Inter Ext", weight: 700, style: "normal" },
  { file: "Inter-ExtraBold-LatinExt.woff", name: "Inter Ext", weight: 800, style: "normal" },
  { file: "SourceSerif4-Bold.woff", name: "Source Serif", weight: 700, style: "normal" },
  { file: "SourceSerif4-SemiBoldItalic.woff", name: "Source Serif", weight: 600, style: "italic" },
];

let cached: Promise<CardFont[]> | null = null;

export function loadIdCardFonts(): Promise<CardFont[]> {
  if (!cached) {
    const dir = join(process.cwd(), "src", "assets", "fonts");
    cached = Promise.all(
      FONT_FILES.map(async ({ file, name, weight, style }) => {
        const buffer = await readFile(join(dir, file));
        const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
        return { name, data, weight, style };
      }),
    ).catch((err) => {
      // Don't keep a failed read cached — the next request tries again.
      cached = null;
      throw err;
    });
  }
  return cached;
}
