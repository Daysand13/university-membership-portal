import type { Metadata } from "next";
import "./globals.css";
import { getSiteSettings } from "@/lib/services/content-service";
import { AccessibilityWidget } from "@/components/a11y/AccessibilityWidget";

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
      <head>
        {/* Applied before paint so a saved dark/light theme never flashes
            the default theme first on load. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('a11y-theme')==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-white text-ink">
        {children}
        <AccessibilityWidget />
      </body>
    </html>
  );
}
