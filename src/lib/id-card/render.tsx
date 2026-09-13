import { ImageResponse } from "next/og";
import { Document, Image, Page, renderToBuffer } from "@react-pdf/renderer";
import { loadIdCardFonts } from "./fonts";
import { ID_CARD_HEIGHT, ID_CARD_WIDTH, IdCardBack, IdCardFront, type IdCardData } from "./IdCard";

export type IdCardSide = "front" | "back";

/** One side of the card as a 2022 × 1276 PNG (CR80 at 600 DPI). */
export async function renderIdCardPng(side: IdCardSide, data: IdCardData): Promise<Buffer> {
  const fonts = await loadIdCardFonts();
  const element = side === "front" ? <IdCardFront data={data} /> : <IdCardBack data={data} />;
  const response = new ImageResponse(element, { width: ID_CARD_WIDTH, height: ID_CARD_HEIGHT, fonts });
  // Rendering happens as the body is read, so a layout error surfaces here.
  return Buffer.from(await response.arrayBuffer());
}

const MM_TO_PT = 72 / 25.4;
const CARD_WIDTH_PT = 85.6 * MM_TO_PT;
const CARD_HEIGHT_PT = 53.98 * MM_TO_PT;

/**
 * Both sides as a two-page PDF at the card's real size, page 1 the front and
 * page 2 the back — the layout card printers and print shops expect for
 * double-sided printing.
 */
export async function renderIdCardPdf(front: Buffer, back: Buffer, title: string): Promise<Buffer> {
  const page = (png: Buffer) => (
    <Page size={{ width: CARD_WIDTH_PT, height: CARD_HEIGHT_PT }} style={{ padding: 0 }}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- a PDF page image, not HTML */}
      <Image src={`data:image/png;base64,${png.toString("base64")}`} style={{ width: CARD_WIDTH_PT, height: CARD_HEIGHT_PT }} />
    </Page>
  );

  return renderToBuffer(
    <Document title={title} author="Association of Students with Special Needs, University of Education, Winneba">
      {page(front)}
      {page(back)}
    </Document>,
  );
}
