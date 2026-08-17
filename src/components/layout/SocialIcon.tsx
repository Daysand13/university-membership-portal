import { Link2 } from "lucide-react";
import type { SocialPlatform } from "@/generated/prisma/client";

const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "currentColor" } as const;

const ICONS: Record<SocialPlatform, React.ReactNode> = {
  FACEBOOK: (
    <svg {...common} aria-hidden="true">
      <path d="M13.5 21v-7.5h2.5l.4-3H13.5V8.4c0-.87.24-1.46 1.5-1.46h1.6V4.35C16.3 4.24 15.3 4.15 14.16 4.15c-2.4 0-4.05 1.47-4.05 4.15v2.4H7.6v3h2.5V21h3.4Z" />
    </svg>
  ),
  INSTAGRAM: (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  TWITTER: (
    <svg {...common} aria-hidden="true">
      <path d="M4 4l7 8.6L4.3 20h1.9l6-6.6 4.6 6.6H21l-7.4-9.1L20 4h-1.9l-5.6 6.1L8.3 4H4Z" />
    </svg>
  ),
  TIKTOK: (
    <svg {...common} aria-hidden="true">
      <path d="M14.5 3.5c.5 1.9 1.8 3.1 3.9 3.3v2.6c-1.4.1-2.7-.3-3.9-1.1v6c0 3-2.1 5.2-5 5.2-2.6 0-4.9-2-4.9-4.9 0-2.9 2.4-5 5.2-4.9v2.7c-1.3-.2-2.5.7-2.5 2.1 0 1.3 1 2.2 2.2 2.2 1.4 0 2.4-1 2.4-2.7V3.5h2.6Z" />
    </svg>
  ),
  YOUTUBE: (
    <svg {...common} aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10.5 9.5l5 2.5-5 2.5v-5Z" />
    </svg>
  ),
  LINKEDIN: (
    <svg {...common} aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8" cy="8.3" r="1.2" />
      <rect x="7" y="10.8" width="2" height="6.2" />
      <path d="M11.3 10.8h2v1c.5-.8 1.3-1.2 2.3-1.2 1.8 0 2.9 1.2 2.9 3.3v3.1h-2v-2.8c0-1-.4-1.7-1.4-1.7-.8 0-1.4.6-1.6 1.2-.1.2-.1.4-.1.7v2.6h-2v-6.2Z" />
    </svg>
  ),
  WHATSAPP: (
    <svg {...common} aria-hidden="true">
      <path d="M12 3.5a8.4 8.4 0 0 0-7.2 12.7L3.5 20.5l4.4-1.2A8.4 8.4 0 1 0 12 3.5Zm0 1.8a6.6 6.6 0 0 1 5.6 10.1c-.1.2-.2.4-.5.5l-2 .8c-.6.2-1.2.1-1.7-.2a10 10 0 0 1-4.4-4.4c-.3-.5-.4-1.1-.2-1.7l.8-2c.1-.3.3-.4.5-.5A6.6 6.6 0 0 1 12 5.3Z" />
    </svg>
  ),
  TELEGRAM: (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M7 12.2l3 1.8 1.2 3 6-10.5-11 4.4 2.4.9 6.6-4" strokeLinejoin="round" />
    </svg>
  ),
  CUSTOM: <Link2 size={18} />,
};

export function SocialIcon({ platform }: { platform: SocialPlatform }) {
  return <>{ICONS[platform] ?? <Link2 size={18} />}</>;
}
