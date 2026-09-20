/**
 * Turns the plain text an administrator types into a box — a mission
 * statement, a list of objectives — into blocks a page can lay out.
 *
 * Someone writing a list of points types them as lines, often with a dash
 * or a number in front. Rendered as one run of pre-wrapped text, those
 * points read as a wall: sighted readers get no bullets, and a screen
 * reader announces no list at all, so there's no way to hear how many
 * points there are or move between them. Recognising the shapes people
 * actually type lets the page render a real list instead.
 *
 * Deliberately not Markdown: this is what someone typed into a plain
 * textarea, so only the cues they reasonably expect to work are honoured,
 * and anything else is left exactly as written.
 */

export type ProseBlock =
  | { kind: "paragraph"; lines: string[] }
  | { kind: "bullets" | "numbers"; items: string[] };

/** "- point", "* point", "• point", "– point". */
const BULLET = /^\s*[-*•–—]\s+(.*)$/;
/** "1. point", "2) point", "iii. point" is not worth guessing at. */
const NUMBER = /^\s*\d{1,3}[.)]\s+(.*)$/;

export function parseProse(text: string): ProseBlock[] {
  const blocks: ProseBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) blocks.push({ kind: "paragraph", lines: paragraph });
    paragraph = [];
  };

  for (const rawLine of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    const bullet = line.match(BULLET);
    const number = bullet ? null : line.match(NUMBER);
    const kind = bullet ? "bullets" : number ? "numbers" : null;
    if (!kind) {
      paragraph.push(line);
      continue;
    }

    flushParagraph();
    const item = ((bullet ?? number) as RegExpMatchArray)[1].trim();
    // A run of the same kind of line is one list; switching kind starts
    // another, so a numbered list under a bulleted one stays two lists.
    const previous = blocks[blocks.length - 1];
    if (previous && previous.kind === kind) previous.items.push(item);
    else blocks.push({ kind, items: [item] });
  }

  flushParagraph();
  return blocks;
}
