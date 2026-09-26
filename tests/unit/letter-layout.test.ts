import { describe, expect, it } from "vitest";
import { letterHeaderLines } from "@/lib/letter-layout";
import { EMPTY_LETTER } from "@/lib/validations/letter";
import { letterFilename } from "@/lib/pdf/LetterPdf";

/**
 * Where the parts of a letter land on the page.
 *
 * This is the whole point of the feature: somebody who cannot see their own
 * page is trusting the association to arrange it the way a Ghanaian office
 * expects. Semi-block — the writer's address and the date ranged right, the
 * recipient's on the left — so the arrangement is asserted here rather than
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

describe("how a letter is laid out", () => {
  const lines = letterHeaderLines(LETTER);
  const find = (text: string) => lines.find((line) => line.text === text);
  const at = (text: string) => lines.findIndex((line) => line.text === text);

  it("ranges the writer's own address and the date right", () => {
    expect(find("Ama Serwaa Mensah")?.align).toBe("right");
    expect(find("P.O. Box 25")?.align).toBe("right");
    expect(find("Central Region")?.align).toBe("right");
    expect(find("024 000 0000")?.align).toBe("right");
    expect(find("25 September 2026")?.align).toBe("right");
  });

  it("keeps the recipient's address on the left", () => {
    expect(find("The Headmaster")?.align).toBe("left");
    expect(find("Winneba Senior High School")?.align).toBe("left");
    expect(find("P.O. Box 1")?.align).toBe("left");
  });

  it("puts the writer above the recipient, and the date between them", () => {
    expect(at("Ama Serwaa Mensah")).toBeLessThan(at("25 September 2026"));
    expect(at("25 September 2026")).toBeLessThan(at("The Headmaster"));
    expect(at("The Headmaster")).toBeLessThan(at("Dear Sir,"));
    expect(at("Dear Sir,")).toBeLessThan(at("REQUEST FOR ATTACHMENT"));
  });

  it("shouts the heading and underlines it, the way a letter here does", () => {
    const heading = find("REQUEST FOR ATTACHMENT");
    expect(heading?.bold).toBe(true);
    expect(heading?.underline).toBe(true);
  });

  it("leaves out what nobody filled in", () => {
    const bare = letterHeaderLines(
      { ...EMPTY_LETTER, senderName: "Ama Serwaa Mensah", salutation: "Dear Sir" },
      new Date("2026-01-05T12:00:00Z"),
    );
    expect(bare.map((line) => line.text)).toEqual(["Ama Serwaa Mensah", "5 January 2026", "Dear Sir,"]);
  });

  it("names the file after the letter, as a PDF", () => {
    expect(letterFilename({ title: "Request for attachment" })).toBe("request-for-attachment.pdf");
    expect(letterFilename({ title: "!!!" })).toBe("letter.pdf");
  });
});
