import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATIC_ROUTES = [
  "",
  "/about",
  "/news",
  "/events",
  "/library",
  "/elections",
  "/contact",
  "/donate",
  "/membership",
  "/membership/enroll",
  "/membership/enroll/undergraduate",
  "/membership/enroll/postgraduate",
  "/membership/login",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const [news, events] = await Promise.all([
    db.news.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    db.event.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
  ]);

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
    })),
    ...news.map((n) => ({ url: `${baseUrl}/news/${n.slug}`, lastModified: n.updatedAt })),
    ...events.map((e) => ({ url: `${baseUrl}/events/${e.slug}`, lastModified: e.updatedAt })),
  ];
}
