import type { NextConfig } from "next";

let r2Hostname: string | undefined;
try {
  if (process.env.R2_PUBLIC_URL) r2Hostname = new URL(process.env.R2_PUBLIC_URL).hostname;
} catch {
  // Ignore malformed URLs in local/dev environments without R2 configured yet.
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(r2Hostname ? [{ protocol: "https" as const, hostname: r2Hostname }] : []),
      { protocol: "https" as const, hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https" as const, hostname: "*.r2.dev" },
    ],
  },
};

export default nextConfig;
