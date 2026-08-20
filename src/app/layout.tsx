import type { Metadata } from "next";
import "./globals.css";
import { getSiteSettings } from "@/lib/services/content-service";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: {
      default: settings.siteTitle,
      template: `%s | ${settings.siteTitle}`,
    },
    description:
      settings.footerDescription ||
      "The official membership and information portal.",
    icons: settings.faviconUrl ? { icon: settings.faviconUrl } : undefined,
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-white text-ink">{children}</body>
    </html>
  );
}
