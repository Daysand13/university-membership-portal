import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Prisma } from "@/generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Receives the details of an admin upload that failed for good, from the
 * browser that saw it fail.
 *
 * Upload failures happen in the admin's browser, where nobody can see them:
 * the server only ever learns about requests that reached it, and the
 * failures that matter most are precisely the ones that didn't. Without this
 * the only evidence is a person's description of an error message, which is
 * how the cause was misdiagnosed twice before. Each report records which
 * stage failed, how each attempt ended, the file's size and type, and the
 * browser — enough to tell a blocked request from a dropped connection from
 * an unreadable file.
 *
 * Written to the audit log (Admin > Audit Log, action ADMIN_UPLOAD_FAILED)
 * rather than only to the runtime log, which Vercel keeps for a short time.
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
    category: clampString(report.category, 40),
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
      return {
        stage: clampString(e.stage, 20),
        attempt: clampNumber(e.attempt),
        outcome: clampString(e.outcome),
      };
    }),
  };
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return new NextResponse(null, { status: 401 });

  // A browser stuck in a failure loop shouldn't be able to flood the log.
  const limit = await checkRateLimit(`upload-diagnostics:admin:${admin.id}`, { max: 30, windowSeconds: 3600 });
  if (!limit.allowed) return new NextResponse(null, { status: 204 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!body || typeof body !== "object") return new NextResponse(null, { status: 400 });

  const report = sanitize(body as Record<string, unknown>);
  console.error("[admin-upload-failure]", JSON.stringify({ adminId: admin.id, ...report }));

  try {
    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: "ADMIN_UPLOAD_FAILED",
        entityType: "Upload",
        newValue: report as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("[admin-upload-failure] could not write the audit entry", err);
  }

  return new NextResponse(null, { status: 204 });
}
