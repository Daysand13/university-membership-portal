import type { NextConfig } from "next";

let r2Hostname: string | undefined;
try {
  if (process.env.R2_PUBLIC_URL) r2Hostname = new URL(process.env.R2_PUBLIC_URL).hostname;
} catch {
  // Ignore malformed URLs in local/dev environments without R2 configured yet.
}

const nextConfig: NextConfig = {
  // Next.js's own default limit on how large a Server Action's request body
  // can be is smaller than this app's own upload limits (2MB passport
  // picture, 5MB medical report). Without raising it, a file that our own
  // validation would happily accept could get rejected by the platform
  // before our code even runs — surfacing as a generic server error rather
  // than the friendly "file too large" message our forms already show.
  // Documents (PDF/DOCX) are more likely to cross that default than a
  // compressed phone photo, which is why this showed up specifically for
  // the "upload a document" option on the medical report field.
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
