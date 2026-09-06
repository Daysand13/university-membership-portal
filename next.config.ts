import type { NextConfig } from "next";

let r2Hostname: string | undefined;
try {
  if (process.env.R2_PUBLIC_URL) r2Hostname = new URL(process.env.R2_PUBLIC_URL).hostname;
} catch {
  // Ignore malformed URLs in local/dev environments without R2 configured yet.
}

const nextConfig: NextConfig = {
  // Raises Next.js's own 1MB default so a 2MB passport picture can travel in
  // a Server Action body at all. This IS load-bearing for the 1–4.5MB range.
  //
  // But it does NOT — and cannot — do what its previous comment claimed.
  // Vercel independently caps a Function's request body at 4.5MB and rejects
  // anything larger with `413 FUNCTION_PAYLOAD_TOO_LARGE` at the edge, before
  // the function is invoked. No value here lifts that ceiling.
  //
  // That pre-invocation rejection is why oversized enrollment submissions
  // produced a generic error with *nothing* in the runtime logs: the request
  // never reached our code, so withActionErrorHandling could not catch it and
  // console.error never ran. An empty log was the symptom, not the absence of
  // one. Anything that must exceed 4.5MB has to go straight to R2 via a
  // presigned URL rather than through a Server Action body.
  //
  // See MAX_TOTAL_UPLOAD_BYTES in src/lib/validations/membership.ts for the
  // client-side guard that keeps enrollment submissions under the real cap.
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
