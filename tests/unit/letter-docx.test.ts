import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { EMPTY_LETTER } from "@/lib/validations/letter";
import { letterFilename, renderLetterDocx } from "@/lib/docx/letter-docx";

/**
 * Where the parts of a letter land on the page.
 *
 * This is the whole point of the feature: somebody who cannot see their own
 * page is trusting the association to arrange it the way a Ghanaian office
 * expects. Semi-block — the writer's address and the date ranged right, the
 * recipient's on the left — so the alignment is asserted here rather than
 * left to be noticed by whoever receives the letter.
 */

const LETTER = {
  ...EMPTY_LETTER,
  title: "Request for attachment",
  senderName: "Ama Serwaa Mensah",
  senderAddress: "P.O. Box 25\nWinneba\nCentral Region",
  senderPhone: "024 000 0000",
  letterDate: "2026-09-25",
  recipientName: "The Headmaster",
  recipientOrganisation: "Winneba Senior High School",
  recipientAddress: "P.O. Box 1\nWinneba",
  salutation: "Dear Sir",
  subject: "Request for attachment",
  body: "I am writing to ask whether your school would take me on attachment during the coming vacation.",
};

/** The paragraphs of the document, in order, with their alignment. */
async function paragraphs(file: Buffer): Promise<Array<{ text: string; alignment: string | null }>> {
  const xml = await (await JSZip.loadAsync(file)).file("word/document.xml")!.async("string");
  const blocks = xml.match(/<w:p(?: [^>]*)?>[\s\S]*?<\/w:p>|<w:p(?: [^>]*)?\/>/g) ?? [];
  return blocks.map((block) => ({
    text: (block.match(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g) ?? [])
      .map((run) => run.replace(/<[^>]+>/g, ""))
      .join(""),
    alignment: block.match(/<w:jc w:val="([^"]+)"\/>/)?.[1] ?? null,
  }));
}

describe("how a letter is laid out", () => {
  it("ranges the writer's own address and the date right, and the recipient's left", async () => {
    const found = await paragraphs(await renderLetterDocx(LETTER));
    const find = (text: string) => found.find((p) => p.text === text);

    // The writer's block comes first, on the right.
    expect(find("Ama Serwaa Mensah")?.alignment).toBe("right");
    expect(find("P.O. Box 25")?.alignment).toBe("right");
    expect(find("Winneba")?.alignment).toBe("right");
    expect(find("Central Region")?.alignment).toBe("right");
    expect(find("024 000 0000")?.alignment).toBe("right");
    expect(find("25 September 2026")?.alignment).toBe("right");

    // The recipient's follows it, on the left — which is the default, so
    // what matters is that no alignment was put on it.
    expect(find("The Headmaster")?.alignment).toBeNull();
    expect(find("Winneba Senior High School")?.alignment).toBeNull();
    expect(find("P.O. Box 1")?.alignment).toBeNull();
  });

  it("puts the writer above the recipient, and the date between them", async () => {
    const found = await paragraphs(await renderLetterDocx(LETTER));
    const at = (text: string) => found.findIndex((p) => p.text === text);

    expect(at("Ama Serwaa Mensah")).toBeLessThan(at("25 September 2026"));
    expect(at("25 September 2026")).toBeLessThan(at("The Headmaster"));
    expect(at("The Headmaster")).toBeLessThan(at("Dear Sir,"));
    expect(at("Dear Sir,")).toBeLessThan(at("REQUEST FOR ATTACHMENT"));
  });

  it("shouts the subject and underlines it, the way a letter here does", async () => {
    const xml = await (await JSZip.loadAsync(await renderLetterDocx(LETTER)))
      .file("word/document.xml")!
      .async("string");
    expect(xml).toContain("REQUEST FOR ATTACHMENT");
    expect(xml).toMatch(/<w:u w:val="single"/);
  });

  it("names the file after the letter", () => {
    expect(letterFilename({ title: "Request for attachment" })).toBe("request-for-attachment.docx");
    expect(letterFilename({ title: "!!!" })).toBe("letter.docx");
  });
});
