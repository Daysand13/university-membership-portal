import type { Metadata } from "next";
import "./globals.css";
import { getSiteSettings } from "@/lib/services/content-service";
import { AccessibilityWidget } from "@/components/a11y/AccessibilityWidget";
import { Toaster } from "@/components/ui/Toast";

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
    // The pre-paint script below sets data-theme / data-text-size /
    // data-contrast on <html> before React loads, so the server's HTML
    // legitimately differs there. This silences that one element only.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Applied before paint so a saved theme, text size or contrast
            setting never flashes the default first on load. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var d=document.documentElement,s=localStorage;" +
              "if(s.getItem('a11y-theme')==='dark')d.setAttribute('data-theme','dark');" +
              "var t=s.getItem('a11y-text-size');if(t==='large'||t==='larger')d.setAttribute('data-text-size',t);" +
              "if(s.getItem('a11y-contrast')==='high')d.setAttribute('data-contrast','high');}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-white text-ink">
        {children}
        <AccessibilityWidget />
        <Toaster />
      </body>
    </html>
  );
}
