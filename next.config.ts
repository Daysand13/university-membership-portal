import type { NextConfig } from "next";

let r2Hostname: string | undefined;
try {
  if (process.env.R2_PUBLIC_URL) r2Hostname = new URL(process.env.R2_PUBLIC_URL).hostname;
} catch {
  // Ignore malformed URLs in local/dev environments without R2 configured yet.
}

const nextConfig: NextConfig = {
  // Raises Next.js's own 1MB default for Server Action bodies. Kept modest on
  // purpose: no value here can lift the limit that actually matters.
  //
  // Vercel independently caps a Function's request body at 4.5MB and rejects
  // anything larger with `413 FUNCTION_PAYLOAD_TOO_LARGE` at the edge, before
  // the function is invoked. A previous version of this comment claimed
  // raising bodySizeLimit had solved oversized enrollment uploads; it hadn't,
  // and couldn't. That pre-invocation rejection is precisely why those
  // submissions produced a generic error with *nothing* in the runtime logs —
  // the request never reached our code, so withActionErrorHandling could not
  // catch it and console.error never ran. The empty log was the symptom, not
  // the absence of one.
  //
  // Enrollment attachments therefore no longer travel in a Server Action body
  // at all: the browser uploads them straight to R2 and submits a signed
  // ticket instead. See src/lib/services/enrollment-upload-service.ts.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      ...(r2Hostname ? [{ protocol: "https" as const, hostname: r2Hostname }] : []),
      { protocol: "https" as const, hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https" as const, hostname: "*.r2.dev" },
    ],
  },
};

export default nextConfig;
