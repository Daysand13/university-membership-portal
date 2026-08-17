import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Acme University Students' Association",
    template: "%s | Acme University Students' Association",
  },
  description:
    "The official membership and information portal of the Acme University Students' Association.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-white text-ink">{children}</body>
    </html>
  );
}
