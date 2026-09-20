import { parseProse, type ProseBlock } from "@/lib/prose";

/**
 * Every line becomes a point. A list the writer already marked up stays as
 * they marked it, and consecutive plain lines join the same list rather
 * than each becoming a list of one.
 */
export function asPoints(blocks: ProseBlock[]): ProseBlock[] {
  const out: ProseBlock[] = [];
  for (const block of blocks) {
    if (block.kind !== "paragraph") {
      out.push(block);
      continue;
    }
    const previous = out[out.length - 1];
    if (previous && previous.kind === "bullets") previous.items.push(...block.lines);
    else out.push({ kind: "bullets", items: [...block.lines] });
  }
  return out;
}

/**
 * Renders plain text an administrator typed, with lists laid out as lists.
 *
 * Bulleted and numbered points become real <ul>/<ol> markup, so they carry
 * bullets on screen and are announced as a list of N items by a screen
 * reader. Everything else keeps the line breaks it was written with.
 */
export function ProseText({
  text,
  className = "prose-content",
  points = false,
}: {
  text: string;
  className?: string;
  /**
   * For a section that is a list of points by its nature — core values,
   * objectives, who may join — where people type one point per line and
   * never think to add a dash. Each line becomes a bullet.
   */
  points?: boolean;
}) {
  const parsed = parseProse(text);
  const blocks = points ? asPoints(parsed) : parsed;
  if (blocks.length === 0) return null;

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.kind === "paragraph") {
          return (
            <p key={index} className="whitespace-pre-line">
              {block.lines.join("\n")}
            </p>
          );
        }
        const List = block.kind === "bullets" ? "ul" : "ol";
        return (
          <List key={index} className="space-y-1.5">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
