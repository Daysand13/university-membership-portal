/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text --
   These elements are never rendered in a browser: they're drawn into a PNG
   by the image renderer (Satori), which only understands plain <img> and
   has no use for alt text. */

/**
 * The association's member ID card — front and back — laid out for the image
 * renderer behind next/og.
 *
 * Sized as a standard CR80 card (85.6 × 54 mm, the size of a bank card)
 * rendered at 600 DPI: 2022 × 1276 pixels. Every measurement below is written
 * at 300 DPI (1011 × 638) and doubled by `s()`, so the numbers stay readable.
 *
 * The renderer supports flexbox and a subset of CSS only — every element with
 * more than one child needs display:flex, there's no grid, and images aren't
 * clipped to rounded corners (so anything round is prepared as round in
 * images.ts). Text can't be measured, so long values are fitted by fitText: a
 * smaller size first, and only if even the smallest won't fit, a shortened
 * value.
 *
 * Colours come from the association's own badge (deep purple, orange) so the
 * card and the logo printed on it belong together.
 */

import { fitText } from "./fit-text";

export const ID_CARD_SCALE = 2;
const DESIGN_WIDTH = 1011;
const DESIGN_HEIGHT = 638;
export const ID_CARD_WIDTH = DESIGN_WIDTH * ID_CARD_SCALE;
export const ID_CARD_HEIGHT = DESIGN_HEIGHT * ID_CARD_SCALE;

export const ID_CARD_MOTTO = "Ability in spite of our needs";

const s = (n: number) => Math.round(n * ID_CARD_SCALE * 100) / 100;

const COLOR = {
  night: "#1b1440",
  indigo: "#2e1d6b",
  violet: "#4a2690",
  label: "#6a3db3",
  ink: "#15112e",
  muted: "#5d5873",
  orange: "#ee7a2e",
  amber: "#f7b267",
  mist: "#d9d4f0",
  paper: "#ffffff",
  photoBg: "#eceaf4",
  placeholder: "#b9b3d1",
} as const;

const HEADER_GRADIENT = `linear-gradient(115deg, ${COLOR.night} 0%, ${COLOR.indigo} 55%, ${COLOR.violet} 100%)`;

/** Inter, then Inter's Latin Extended files for letters like Ɛ and Ɔ (see fonts.ts). */
const CARD_FONT_STACK = "Inter, Inter Ext";

// Layout, in design units. Every region is sized so the card is full edge to
// edge, with no dead band above the footer.
const HEADER_HEIGHT = 146;
const RULE_HEIGHT = 7;
const FOOTER_HEIGHT = 52;
const PADDING_X = 30;

const FRONT_PADDING_TOP = 22;
const FRONT_PADDING_BOTTOM = 25;
const PHOTO_HEIGHT = DESIGN_HEIGHT - HEADER_HEIGHT - RULE_HEIGHT - FOOTER_HEIGHT - FRONT_PADDING_TOP - FRONT_PADDING_BOTTOM; // 386
const PHOTO_WIDTH = 300; // 300 × 386 ≈ a 35 × 45 mm passport photo
const PHOTO_BORDER = 4;
const PHOTO_GAP = 32;
const DETAILS_WIDTH = DESIGN_WIDTH - PADDING_X * 2 - PHOTO_WIDTH - PHOTO_GAP; // 619

const LOGO_DISC = 112;
const LOGO_RING = 3;

const BACK_HEADER_HEIGHT = 66;
const BACK_PADDING_TOP = 24;
const BACK_PADDING_BOTTOM = 20;
const PICTURE_WIDTH = 540;
const PICTURE_HEIGHT = 400;
const PICTURE_BORDER = 4;
const QR_SIZE = 290;

/** Pixel sizes the prepared images should be, so nothing is scaled at render time. */
export const ID_CARD_IMAGE_SIZES = {
  photo: { width: (PHOTO_WIDTH - PHOTO_BORDER * 2) * ID_CARD_SCALE, height: (PHOTO_HEIGHT - PHOTO_BORDER * 2) * ID_CARD_SCALE },
  logoDisc: (LOGO_DISC - LOGO_RING * 2) * ID_CARD_SCALE,
  watermark: 360 * ID_CARD_SCALE,
  /** The logo on the back when there's no association picture to show. */
  medallion: 320 * ID_CARD_SCALE,
  picture: {
    width: (PICTURE_WIDTH - PICTURE_BORDER * 2) * ID_CARD_SCALE,
    height: (PICTURE_HEIGHT - PICTURE_BORDER * 2) * ID_CARD_SCALE,
  },
  qr: QR_SIZE * ID_CARD_SCALE,
} as const;

export interface IdCardData {
  fullName: string;
  indexNumber: string;
  department: string;
  programme: string;
  specialNeedsCategory: string;
  phone: string;
  /** Data URIs, already cropped/fitted to ID_CARD_IMAGE_SIZES (see images.ts). */
  photo: string | null;
  /** Round, transparent-cornered logos for the header frames. */
  associationBadge: string | null;
  universityBadge: string | null;
  /** The association logo as a plain image, for the faint watermark. */
  watermark: string | null;
  backPicture: { src: string; fit: "cover" | "contain" } | null;
  qrCode: string;
  /** e.g. "31 JULY 2027" */
  validUntil: string;
  /** e.g. "www.assnuew.com" */
  website: string;
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function LogoDisc({ src, fallback }: { src: string | null; fallback: string }) {
  return (
    <div
      style={{
        width: s(LOGO_DISC),
        height: s(LOGO_DISC),
        borderRadius: s(LOGO_DISC / 2),
        background: COLOR.paper,
        border: `${s(LOGO_RING)}px solid ${COLOR.amber}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {src ? (
        <img src={src} width={s(LOGO_DISC - LOGO_RING * 2)} height={s(LOGO_DISC - LOGO_RING * 2)} />
      ) : (
        <div style={{ fontSize: s(24), fontWeight: 800, color: COLOR.indigo, letterSpacing: s(1) }}>{fallback}</div>
      )}
    </div>
  );
}

function AccentRule() {
  return (
    <div
      style={{
        height: s(RULE_HEIGHT),
        display: "flex",
        backgroundImage: `linear-gradient(90deg, ${COLOR.orange} 0%, ${COLOR.amber} 50%, ${COLOR.orange} 100%)`,
      }}
    />
  );
}

function FooterBand({ left, right, leftStyle }: { left: string; right: string; leftStyle: React.CSSProperties }) {
  return (
    <div
      style={{
        height: s(FOOTER_HEIGHT),
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `0 ${s(PADDING_X)}px`,
        background: COLOR.night,
      }}
    >
      <div style={leftStyle}>{left}</div>
      <div style={{ fontSize: s(13.5), fontWeight: 600, color: COLOR.mist, letterSpacing: s(1.5) }}>{right}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Front
// ---------------------------------------------------------------------------

function DetailField({
  label,
  value,
  size,
  weight = 600,
  letterSpacing = 0,
}: {
  label: string;
  value: string;
  size: number;
  weight?: 600 | 700 | 800;
  letterSpacing?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: s(12), fontWeight: 700, letterSpacing: s(2.2), color: COLOR.label }}>{label}</div>
      <div
        style={{
          marginTop: s(3),
          fontSize: s(size),
          fontWeight: weight,
          color: COLOR.ink,
          lineHeight: 1.18,
          letterSpacing: s(letterSpacing),
        }}
      >
        {value}
      </div>
    </div>
  );
}

function PhotoFrame({ photo }: { photo: string | null }) {
  return (
    <div
      style={{
        width: s(PHOTO_WIDTH),
        height: s(PHOTO_HEIGHT),
        borderRadius: s(16),
        border: `${s(PHOTO_BORDER)}px solid ${COLOR.indigo}`,
        background: COLOR.photoBg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {photo ? (
        <img
          src={photo}
          width={s(PHOTO_WIDTH - PHOTO_BORDER * 2)}
          height={s(PHOTO_HEIGHT - PHOTO_BORDER * 2)}
          style={{ borderRadius: s(12) }}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: s(118), height: s(118), borderRadius: s(59), background: COLOR.placeholder, display: "flex" }} />
          <div
            style={{
              width: s(226),
              height: s(150),
              marginTop: s(16),
              borderTopLeftRadius: s(113),
              borderTopRightRadius: s(113),
              background: COLOR.placeholder,
              display: "flex",
            }}
          />
        </div>
      )}
    </div>
  );
}

export function IdCardFront({ data }: { data: IdCardData }) {
  const width = DETAILS_WIDTH;
  const name = fitText(data.fullName.toUpperCase(), { sizes: [34, 30, 26, 22], lines: 2, widthFactor: 0.72, width });
  const department = fitText(data.department, { sizes: [21, 19, 17], lines: 2, widthFactor: 0.6, width });
  const programme = fitText(data.programme, { sizes: [21, 19, 17], lines: 2, widthFactor: 0.6, width });
  const category = fitText(data.specialNeedsCategory, { sizes: [21, 19, 17], lines: 2, widthFactor: 0.6, width });

  return (
    <div
      style={{
        width: ID_CARD_WIDTH,
        height: ID_CARD_HEIGHT,
        display: "flex",
        flexDirection: "column",
        background: COLOR.paper,
        fontFamily: CARD_FONT_STACK,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: s(HEADER_HEIGHT),
          display: "flex",
          alignItems: "center",
          padding: `0 ${s(24)}px`,
          backgroundImage: HEADER_GRADIENT,
        }}
      >
        <LogoDisc src={data.associationBadge} fallback="ASSN" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: `0 ${s(12)}px` }}>
          <div
            style={{
              fontFamily: "Source Serif",
              fontWeight: 700,
              fontSize: s(24.5),
              color: COLOR.paper,
              letterSpacing: s(0.3),
              lineHeight: 1.15,
              textAlign: "center",
            }}
          >
            ASSOCIATION OF STUDENTS WITH SPECIAL NEEDS
          </div>
          <div style={{ marginTop: s(6), fontSize: s(15), fontWeight: 700, color: COLOR.amber, letterSpacing: s(3.4) }}>
            UNIVERSITY OF EDUCATION, WINNEBA
          </div>
          <div
            style={{
              marginTop: s(11),
              display: "flex",
              padding: `${s(5)}px ${s(18)}px`,
              borderRadius: s(40),
              background: COLOR.orange,
              color: COLOR.night,
              fontSize: s(12),
              fontWeight: 800,
              letterSpacing: s(3.6),
            }}
          >
            MEMBER IDENTITY CARD
          </div>
        </div>
        <LogoDisc src={data.universityBadge} fallback="UEW" />
      </div>

      <AccentRule />

      <div
        style={{
          flex: 1,
          display: "flex",
          position: "relative",
          padding: `${s(FRONT_PADDING_TOP)}px ${s(PADDING_X)}px ${s(FRONT_PADDING_BOTTOM)}px`,
        }}
      >
        {data.watermark && (
          <img
            src={data.watermark}
            width={s(360)}
            height={s(360)}
            style={{ position: "absolute", right: s(-50), bottom: s(-70), opacity: 0.07 }}
          />
        )}
        <PhotoFrame photo={data.photo} />
        <div
          style={{
            width: s(DETAILS_WIDTH),
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            marginLeft: s(PHOTO_GAP),
          }}
        >
          <DetailField label="FULL NAME" value={name.text} size={name.size} weight={800} />
          <DetailField label="INDEX NUMBER" value={data.indexNumber} size={28} weight={700} letterSpacing={1.4} />
          <DetailField label="DEPARTMENT" value={department.text} size={department.size} />
          <DetailField label="PROGRAMME OF STUDY" value={programme.text} size={programme.size} />
          <DetailField label="CATEGORY OF SPECIAL NEEDS" value={category.text} size={category.size} />
        </div>
      </div>

      <FooterBand
        left={`“${ID_CARD_MOTTO}”`}
        right={data.website}
        leftStyle={{ fontFamily: "Source Serif", fontStyle: "italic", fontWeight: 600, fontSize: s(19), color: COLOR.amber }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Back
// ---------------------------------------------------------------------------

function PictureFrame({ picture }: { picture: IdCardData["backPicture"] }) {
  const cover = picture?.fit === "cover";
  const innerWidth = PICTURE_WIDTH - PICTURE_BORDER * 2;
  const innerHeight = PICTURE_HEIGHT - PICTURE_BORDER * 2;
  return (
    <div
      style={{
        width: s(PICTURE_WIDTH),
        height: s(PICTURE_HEIGHT),
        borderRadius: s(18),
        border: `${s(PICTURE_BORDER)}px solid ${COLOR.indigo}`,
        background: cover ? COLOR.indigo : COLOR.paper,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {picture ? (
        <img
          src={picture.src}
          width={cover ? s(innerWidth) : s(320)}
          height={cover ? s(innerHeight) : s(320)}
          style={cover ? { borderRadius: s(14) } : { objectFit: "contain" }}
        />
      ) : (
        <div
          style={{
            fontFamily: "Source Serif",
            fontWeight: 700,
            fontSize: s(28),
            color: COLOR.indigo,
            textAlign: "center",
            padding: `0 ${s(40)}px`,
          }}
        >
          ASSOCIATION OF STUDENTS WITH SPECIAL NEEDS
        </div>
      )}
    </div>
  );
}

export function IdCardBack({ data }: { data: IdCardData }) {
  const rightWidth = DESIGN_WIDTH - PADDING_X * 2 - PICTURE_WIDTH - PADDING_X;
  const phone = fitText(data.phone, { sizes: [34, 30, 26, 22], lines: 1, widthFactor: 0.64, width: rightWidth });

  return (
    <div
      style={{
        width: ID_CARD_WIDTH,
        height: ID_CARD_HEIGHT,
        display: "flex",
        flexDirection: "column",
        background: COLOR.paper,
        fontFamily: CARD_FONT_STACK,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: s(BACK_HEADER_HEIGHT),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: HEADER_GRADIENT,
        }}
      >
        <div style={{ fontFamily: "Source Serif", fontWeight: 700, fontSize: s(18), color: COLOR.paper, letterSpacing: s(0.6) }}>
          ASSOCIATION OF STUDENTS WITH SPECIAL NEEDS
        </div>
        <div style={{ width: s(7), height: s(7), borderRadius: s(7), background: COLOR.orange, margin: `0 ${s(14)}px`, display: "flex" }} />
        <div style={{ fontSize: s(14), fontWeight: 700, color: COLOR.amber, letterSpacing: s(3) }}>UEW</div>
      </div>

      <AccentRule />

      <div
        style={{
          flex: 1,
          display: "flex",
          padding: `${s(BACK_PADDING_TOP)}px ${s(PADDING_X)}px ${s(BACK_PADDING_BOTTOM)}px`,
        }}
      >
        <div style={{ width: s(PICTURE_WIDTH), display: "flex", flexDirection: "column" }}>
          <PictureFrame picture={data.backPicture} />
          <div style={{ marginTop: s(14), fontSize: s(13), lineHeight: 1.45, color: COLOR.muted }}>
            This card is the property of the Association of Students with Special Needs, University of Education,
            Winneba, and is not transferable.
          </div>
        </div>

        <div
          style={{
            width: s(rightWidth),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginLeft: s(PADDING_X),
          }}
        >
          <div
            style={{
              display: "flex",
              padding: s(12),
              background: COLOR.paper,
              border: `${s(4)}px solid ${COLOR.indigo}`,
              borderRadius: s(20),
            }}
          >
            <img src={data.qrCode} width={s(QR_SIZE)} height={s(QR_SIZE)} />
          </div>
          <div style={{ marginTop: s(20), fontSize: s(14.5), fontWeight: 800, letterSpacing: s(2.6), color: COLOR.label }}>
            IF FOUND, PLEASE CONTACT
          </div>
          <div style={{ marginTop: s(4), fontSize: s(phone.size), fontWeight: 800, color: COLOR.ink, letterSpacing: s(1) }}>
            {phone.text}
          </div>
          <div style={{ marginTop: s(10), fontSize: s(13), fontWeight: 600, color: COLOR.muted, textAlign: "center" }}>
            Scan the code to verify this membership
          </div>
        </div>
      </div>

      <FooterBand
        left={`VALID UNTIL ${data.validUntil}`}
        right={`INDEX NO. ${data.indexNumber}`}
        leftStyle={{ fontSize: s(14), fontWeight: 700, letterSpacing: s(2.4), color: COLOR.amber }}
      />
    </div>
  );
}
