/**
 * Turning a page into something worth listening to.
 *
 * The Read Aloud button used to speak `main.textContent`. That is not the
 * page: `textContent` leaves out everything that is not a text node, so a
 * tick box, a radio button, a dropdown and a text box were all simply
 * silent — a form read as a list of stray words with no way to tell what
 * any of them were for. It also ignores CSS, so anything hidden was read
 * out anyway, including the second copy of a list that a page renders for
 * a different screen size.
 *
 * This walks the page instead: it skips what is not shown, says what each
 * control is and what state it is in, reads a picture's description rather
 * than nothing, and puts a cell under its column heading so a table can be
 * followed by ear. Written for the students this association exists for,
 * who are listening to it rather than looking at it.
 *
 * The pieces that decide *wording* are plain functions with no DOM in
 * them, so they can be checked without a browser; the walk itself is the
 * thin part on top.
 */

/** What a control is, in words an ordinary listener will recognise. */
export type ControlKind = "checkbox" | "radio" | "select" | "textbox" | "file" | "button" | "link";

export interface ControlDescription {
  kind: ControlKind;
  /** What it is called. Empty means nothing labels it — worth saying so. */
  name: string;
  /** Tick boxes and radio buttons. */
  checked?: boolean;
  /** What is in it, or chosen in it. */
  value?: string;
  disabled?: boolean;
  required?: boolean;
}

const KIND_WORD: Record<ControlKind, string> = {
  checkbox: "tick box",
  radio: "option",
  select: "dropdown",
  textbox: "text box",
  file: "file chooser",
  button: "button",
  link: "link",
};

/**
 * One control, said aloud.
 *
 * Name first, because that is what somebody is listening for; then what it
 * is; then what state it is in. A control with no name says so rather than
 * passing in silence — an unlabelled box is a fault worth hearing.
 */
export function describeControl(control: ControlDescription): string {
  const parts: string[] = [];
  parts.push(control.name.trim() || "unlabelled");
  parts.push(KIND_WORD[control.kind]);

  if (control.kind === "checkbox") parts.push(control.checked ? "ticked" : "not ticked");
  else if (control.kind === "radio") parts.push(control.checked ? "chosen" : "not chosen");
  else if (control.kind === "select" || control.kind === "textbox" || control.kind === "file") {
    const value = (control.value ?? "").trim();
    parts.push(value || "empty");
  }

  if (control.required) parts.push("required");
  if (control.disabled) parts.push("not available");

  return `${parts.join(", ")}.`;
}

/**
 * Joins what was found into speakable prose.
 *
 * Each block of the page ends up as its own sentence, so the voice pauses
 * between a heading and the paragraph under it instead of running them
 * together the way `textContent` did.
 */
export function joinForSpeech(parts: string[]): string {
  const cleaned = parts
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length > 0)
    .map((part) => (/[.!?,:;]$/.test(part) ? part : `${part}.`));
  return cleaned.join(" ");
}

/**
 * Speech synthesis quietly drops an utterance that is too long, so a page
 * is spoken a sentence at a time, one after another.
 *
 * A full stop after an initial is not the end of a sentence: "B.Ed." and
 * "E.N" would otherwise be broken into pieces and read with a pause in the
 * middle of somebody's own qualification or signature. Anything too short
 * to be a sentence is joined to what follows it.
 */
export function chunkForSpeech(text: string): string[] {
  /** "B.Ed.", "E.N." — a stop inside a name, not the end of a sentence. */
  const abbreviated = (sofar: string) => /(?:^|\s)(?:[A-Za-z]\.)+[A-Za-z]*\.$/.test(sofar);

  const raw: string[] = [];
  let current = "";
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    current += character;
    if (character !== "." && character !== "!" && character !== "?" && character !== "\n") continue;
    // A stop with no space after it is inside something — a decimal, an
    // abbreviation — rather than between two sentences.
    const next = text[i + 1];
    if (next !== undefined && !/\s/.test(next)) continue;
    if (abbreviated(current)) continue;
    if (current.trim()) raw.push(current.trim());
    current = "";
  }
  if (current.trim()) raw.push(current.trim());

  // Anything too short to be a sentence is joined to what follows it.
  const chunks: string[] = [];
  let carried = "";
  for (const chunk of raw) {
    const joined = carried ? `${carried} ${chunk}` : chunk;
    if (chunk.replace(/[.!?]$/, "").trim().length <= 3 && joined.length < 300) {
      carried = joined;
      continue;
    }
    chunks.push(joined);
    carried = "";
  }
  if (carried) chunks.push(carried);
  return chunks;
}

// ---------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "SVG",
  "CANVAS",
  "IFRAME",
  "VIDEO",
  "AUDIO",
  "OBJECT",
  "MAP",
]);

/** Elements whose end is a pause. */
const BLOCK_TAGS = new Set([
  "P",
  "DIV",
  "SECTION",
  "ARTICLE",
  "HEADER",
  "FOOTER",
  "MAIN",
  "ASIDE",
  "NAV",
  "UL",
  "OL",
  "LI",
  "DL",
  "DT",
  "DD",
  "TABLE",
  "TR",
  "TD",
  "TH",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "FORM",
  "FIELDSET",
  "LEGEND",
  "BLOCKQUOTE",
  "FIGCAPTION",
]);

function isHiddenFromView(element: Element): boolean {
  if (element.getAttribute("aria-hidden") === "true") return true;
  if (element.hasAttribute("hidden")) return true;
  const view = element.ownerDocument?.defaultView;
  if (!view) return false;
  const style = view.getComputedStyle(element);
  return style.display === "none" || style.visibility === "hidden";
}

/** The plain words inside something, with controls left out. */
function plainText(element: Element): string {
  let out = "";
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === 3) out += node.nodeValue ?? "";
    else if (node.nodeType === 1) {
      const child = node as Element;
      if (SKIP_TAGS.has(child.tagName) || isHiddenFromView(child)) continue;
      if (child.tagName === "INPUT" || child.tagName === "SELECT" || child.tagName === "TEXTAREA") continue;
      out += ` ${plainText(child)}`;
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

/** What names a control: its aria-label, its label, or failing that its hint. */
function nameOf(element: Element): string {
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel?.trim()) return ariaLabel.trim();

  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const named = labelledBy
      .split(/\s+/)
      .map((id) => element.ownerDocument?.getElementById(id))
      .filter((found): found is HTMLElement => Boolean(found))
      .map((found) => plainText(found))
      .join(" ")
      .trim();
    if (named) return named;
  }

  const id = element.getAttribute("id");
  if (id && element.ownerDocument) {
    // Attribute selector rather than CSS.escape, which older browsers here
    // may not have; ids on this site never contain a quote.
    const label = element.ownerDocument.querySelector(`label[for="${id.replace(/"/g, '\\"')}"]`);
    if (label) {
      const named = plainText(label);
      if (named) return named;
    }
  }

  const wrapping = element.closest("label");
  if (wrapping) {
    const named = plainText(wrapping);
    if (named) return named;
  }

  const placeholder = element.getAttribute("placeholder");
  if (placeholder?.trim()) return placeholder.trim();

  const title = element.getAttribute("title");
  return title?.trim() ?? "";
}

function describeFormElement(element: Element): string | null {
  const tag = element.tagName;

  if (tag === "SELECT") {
    const select = element as HTMLSelectElement;
    const chosen = select.selectedOptions?.[0]?.textContent ?? "";
    return describeControl({
      kind: "select",
      name: nameOf(element),
      value: chosen,
      disabled: select.disabled,
      required: select.required,
    });
  }

  if (tag === "TEXTAREA") {
    const textarea = element as HTMLTextAreaElement;
    return describeControl({
      kind: "textbox",
      name: nameOf(element),
      value: textarea.value,
      disabled: textarea.disabled,
      required: textarea.required,
    });
  }

  if (tag !== "INPUT") return null;

  const input = element as HTMLInputElement;
  const type = (input.getAttribute("type") ?? "text").toLowerCase();
  if (type === "hidden") return null;

  if (type === "submit" || type === "button" || type === "reset") {
    return describeControl({ kind: "button", name: input.value || nameOf(element), disabled: input.disabled });
  }

  const kind: ControlKind =
    type === "checkbox" ? "checkbox" : type === "radio" ? "radio" : type === "file" ? "file" : "textbox";

  return describeControl({
    kind,
    name: nameOf(element),
    checked: input.checked,
    // A password is never read out, whatever else happens.
    value: type === "password" ? (input.value ? "filled in" : "") : input.value,
    disabled: input.disabled,
    required: input.required,
  });
}

/** The column heading a cell sits under, so a table can be followed by ear. */
function columnHeadingFor(cell: Element): string {
  const row = cell.parentElement;
  const table = cell.closest("table");
  if (!row || !table) return "";
  const index = Array.from(row.children).indexOf(cell);
  const headRow = table.querySelector("thead tr");
  if (!headRow) return "";
  const heading = headRow.children[index];
  return heading ? plainText(heading) : "";
}

/**
 * Everything on the page, in the order it is laid out, as one piece of
 * speakable text.
 */
export function readingOf(root: Element): string {
  const parts: string[] = [];

  const visit = (node: Node) => {
    if (node.nodeType === 3) {
      const text = (node.nodeValue ?? "").replace(/\s+/g, " ").trim();
      if (text) parts.push(text);
      return;
    }
    if (node.nodeType !== 1) return;

    const element = node as Element;
    if (SKIP_TAGS.has(element.tagName) || isHiddenFromView(element)) return;

    // A table announces itself, so somebody knows why headings are
    // about to be read before every value.
    if (element.tagName === "CAPTION") {
      const caption = plainText(element);
      if (caption) parts.push(`Table: ${caption}.`);
      return;
    }

    // A picture is its description, or nothing at all.
    if (element.tagName === "IMG") {
      const alt = element.getAttribute("alt");
      if (alt?.trim()) parts.push(`Picture: ${alt.trim()}.`);
      return;
    }

    const control = describeFormElement(element);
    if (control !== null) {
      parts.push(control);
      return;
    }
    // A control with a type this doesn't speak still shouldn't be walked into.
    if (element.tagName === "INPUT" || element.tagName === "SELECT" || element.tagName === "TEXTAREA") return;

    // A label is the name of its control, and the control says its own
    // name — so reading the label as well would say it twice. Skipped
    // either way it is attached: wrapped around the control, or pointing
    // at it by id. Only when the control it names is actually on the page,
    // so a stray label is still read rather than quietly lost.
    if (element.tagName === "LABEL") {
      const wrapped = element.querySelector("input, select, textarea");
      if (wrapped) {
        if (!isHiddenFromView(wrapped)) {
          const described = describeFormElement(wrapped);
          if (described) parts.push(described);
        }
        return;
      }
      const target = element.getAttribute("for");
      if (target) {
        const control = element.ownerDocument?.getElementById(target);
        if (control && !isHiddenFromView(control)) return;
      }
    }

    if (element.tagName === "TD" || element.tagName === "TH") {
      const heading = element.tagName === "TD" ? columnHeadingFor(element) : "";
      if (heading) parts.push(`${heading}:`);
    }

    if (element.tagName === "A" && element.getAttribute("href")) {
      const inner = plainText(element);
      const label = element.getAttribute("aria-label")?.trim() || inner;
      if (label) {
        parts.push(describeControl({ kind: "link", name: label }));
        return;
      }
    }

    if (element.tagName === "BUTTON") {
      const label = element.getAttribute("aria-label")?.trim() || plainText(element);
      parts.push(
        describeControl({ kind: "button", name: label, disabled: (element as HTMLButtonElement).disabled }),
      );
      return;
    }

    for (const child of Array.from(element.childNodes)) visit(child);

    if (BLOCK_TAGS.has(element.tagName)) {
      const last = parts[parts.length - 1];
      if (last && !/[.!?,:;]$/.test(last)) parts[parts.length - 1] = `${last}.`;
    }
  };

  visit(root);
  return joinForSpeech(parts);
}
