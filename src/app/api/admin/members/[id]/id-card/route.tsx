import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getSiteOrigin } from "@/lib/services/member-card-service";
import { loadIdCardData } from "@/lib/id-card/id-card-service";
import { renderIdCardPdf, renderIdCardPng, type IdCardSide } from "@/lib/id-card/render";

// sharp, the PDF renderer and the font files all need the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A member's association ID card, for administrators only.
 *
 *   ?side=front|back          PNG, shown inline (the admin preview)
 *   ?side=front|back&download=1   the same PNG as a download
 *   ?format=pdf               both sides as a print-ready, card-sized PDF
 *
 * Downloads are written to the audit log: a card carries a member's photo and
 * category of special needs, so who took a copy, and when, should be on record.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const sp = request.nextUrl.searchParams;
  const wantsPdf = sp.get("format") === "pdf";
  const side: IdCardSide = sp.get("side") === "back" ? "back" : "front";
  const download = wantsPdf || sp.get("download") === "1";

  const data = await loadIdCardData(id, await getSiteOrigin());
  if (!data) return new Response("Member not found", { status: 404 });

  const baseName = `ASSN-UEW-ID-${data.indexNumber.replace(/[^A-Za-z0-9-]+/g, "_")}`;

  try {
    let body: Buffer;
    let contentType: string;
    let filename: string;

    if (wantsPdf) {
      const [front, back] = await Promise.all([renderIdCardPng("front", data), renderIdCardPng("back", data)]);
      body = await renderIdCardPdf(front, back, `ID card — ${data.fullName}`);
      contentType = "application/pdf";
      filename = `${baseName}.pdf`;
    } else {
      body = await renderIdCardPng(side, data);
      contentType = "image/png";
      filename = `${baseName}-${side}.png`;
    }

    if (download) {
      try {
        await db.auditLog.create({
          data: {
            adminId: admin.id,
            action: "DOWNLOAD_MEMBER_ID_CARD",
            entityType: "Member",
            entityId: id,
            newValue: { format: wantsPdf ? "pdf" : `png-${side}` },
          },
        });
      } catch (err) {
        console.error("[id-card] could not record the download in the audit log", err);
      }
    }

    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("[id-card] rendering failed for member", id, err);
    return new Response("The ID card couldn't be generated. Please try again.", { status: 500 });
  }
}
