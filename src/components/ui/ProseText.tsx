import { parseProse } from "@/lib/prose";

/**
 * Renders plain text an administrator typed, with lists laid out as lists.
 *
 * Bulleted and numbered points become real <ul>/<ol> markup, so they carry
 * bullets on screen and are announced as a list of N items by a screen
 * reader. Everything else keeps the line breaks it was written with.
 */
export function ProseText({ text, className = "prose-content" }: { text: string; className?: string }) {
  const blocks = parseProse(text);
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
