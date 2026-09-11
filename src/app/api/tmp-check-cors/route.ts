import { NextResponse } from "next/server";
import { S3Client, GetBucketCorsCommand } from "@aws-sdk/client-s3";
import { requireAdminUser } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Temporary diagnostic: reads the R2 bucket's live CORS policy using the
// real production credentials Vercel injects at runtime, to check whether
// it's the cause of intermittent admin upload failures. Admin-gated so it's
// never publicly reachable even briefly. Deleted after the check.
export async function GET() {
  await requireAdminUser();

  const accountId = process.env.R2_ACCOUNT_ID;
  const endpoint =
    process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  if (!endpoint || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
    return NextResponse.json({ error: "R2 env vars missing in this environment" }, { status: 500 });
  }

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  try {
    const result = await client.send(new GetBucketCorsCommand({ Bucket: process.env.R2_BUCKET_NAME }));
    return NextResponse.json({ corsRules: result.CORSRules ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err), errorName: err instanceof Error ? err.name : null },
      { status: 500 },
    );
  }
}
