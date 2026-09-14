import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { Prisma } from "@/generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Receives the details of an applicant's attachment upload that failed for
 * good — the public-form counterpart of api/admin/upload/diagnostics.
 *
 * These failures happen on the applicant's phone, where nobody can see them;
 * the server only learns about requests that reached it, and the ones that
 * matter most are the ones that didn't. Each report says which stage failed,
 * how each attempt ended, the file's size and type, and the browser — no
 * names, no file contents.
 *
 * Written to the audit log (Admin > Audit Log, action PUBLIC_UPLOAD_FAILED)
 * because Vercel's runtime log is only kept for a short time. Anonymous, so
 * rate limited per IP to stop one stuck browser flooding it.
 */

const MAX_STRING = 300;
const MAX_TRAIL = 12;

function clampString(value: unknown, max = MAX_STRING): string | null {
  return typeof value === "string" ? value.slice(0, max) : null;
}

function clampNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sanitize(report: Record<string, unknown>) {
  const trail = Array.isArray(report.trail) ? report.trail.slice(0, MAX_TRAIL) : [];
  return {
    kind: clampString(report.kind, 20),
    mimeType: clampString(report.mimeType, 100),
    fileSize: clampNumber(report.fileSize),
    originalSize: clampNumber(report.originalSize),
    finalError: clampString(report.finalError),
    online: typeof report.online === "boolean" ? report.online : null,
    connection: clampString(report.connection, 20),
    userAgent: clampString(report.userAgent),
    page: clampString(report.page, 200),
    trail: trail.map((entry) => {
      const e = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      return { stage: clampString(e.stage, 20), attempt: clampNumber(e.attempt), outcome: clampString(e.outcome) };
    }),
  };
}

export async function POST(request: NextRequest) {
  const ip = await getClientIp();
  const limit = await checkRateLimit(`public-upload-diagnostics:ip:${ip}`, { max: 20, windowSeconds: 3600 });
  if (!limit.allowed) return new NextResponse(null, { status: 204 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return new NextResponse(null, { status: 400 });

  const report = sanitize(body as Record<string, unknown>);
  console.error("[public-upload-failure]", JSON.stringify(report));

  try {
    await db.auditLog.create({
      data: { action: "PUBLIC_UPLOAD_FAILED", entityType: "Upload", newValue: report as Prisma.InputJsonValue },
    });
  } catch (err) {
    console.error("[public-upload-failure] could not write the audit entry", err);
  }

  return new NextResponse(null, { status: 204 });
}
