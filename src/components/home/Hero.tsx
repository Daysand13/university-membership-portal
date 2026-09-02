"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlide } from "@/generated/prisma/client";

const FALLBACK_SLIDE = {
  id: "fallback",
  title: "Welcome to the Acme University Students' Association",
  subtitle:
    "One membership portal for news, events, the resource library, and everything happening across our student community.",
  ctaText: "Become a Member",
  ctaUrl: "/membership/enroll",
  imageUrl: null as string | null,
  backgroundColor: null as string | null,
};

/**
 * Relative luminance (WCAG) for a hex color, used to decide whether light
 * or dark text/UI reads better against a solid slide background.
 */
function isLightColor(hex: string): boolean {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return false;
  const [r, g, b] = [match[1], match[2], match[3]].map((c) => parseInt(c, 16) / 255);
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.55;
}

// Fixed height for every slide so the section never resizes as slides change,
// no matter how much (or little) text a given slide has.
const HERO_HEIGHT_CLASS = "h-[440px] sm:h-[480px] lg:h-[560px]";

export function Hero({ slides, siteTitle }: { slides: HeroSlide[]; siteTitle?: string }) {
  const activeSlides = slides.length > 0 ? slides : [FALLBACK_SLIDE];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % activeSlides.length), 7000);
    return () => clearInterval(timer);
  }, [activeSlides.length]);

  const slide = activeSlides[index];
  const isLight = !slide.imageUrl && !!slide.backgroundColor && isLightColor(slide.backgroundColor);
  const textColorClass = isLight ? "text-primary-950" : "text-white";
  const subtitleColorClass = isLight ? "text-primary-800" : "text-primary-100";

  return (
    <section
      className={`relative overflow-hidden flex items-center ${HERO_HEIGHT_CLASS} ${textColorClass}`}
      style={!slide.imageUrl && slide.backgroundColor ? { backgroundColor: slide.backgroundColor } : undefined}
    >
      {slide.imageUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(100deg, rgba(10,31,68,0.78) 0%, rgba(10,31,68,0.55) 55%, rgba(10,31,68,0.32) 100%)",
            }}
          />
        </>
      )}
      {!slide.imageUrl && !slide.backgroundColor && (
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(120deg, #0A1F44 0%, #123A73 60%, #163F7D 100%)",
          }}
        />
      )}

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl">
          <p className={`kicker ${isLight ? "" : "kicker-on-dark"} mb-4`}>
            {siteTitle || "Acme University Students' Association"}
          </p>
          <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-balance leading-tight ${textColorClass}`}>
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p className={`mt-5 text-base sm:text-lg leading-relaxed max-w-xl ${subtitleColorClass}`}>
              {slide.subtitle}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {slide.ctaText && slide.ctaUrl && (
              <Link
                href={slide.ctaUrl}
                className="inline-flex items-center rounded-md bg-accent-500 text-primary-950 font-semibold px-6 py-3 text-sm hover:bg-accent-400 transition-colors shadow-sm"
              >
                {slide.ctaText}
              </Link>
            )}
            <Link
              href="/about"
              className={`inline-flex items-center rounded-md border font-semibold px-6 py-3 text-sm transition-colors ${
                isLight
                  ? "border-primary-950/30 text-primary-950 hover:bg-primary-950/10"
                  : "border-white/30 text-white hover:bg-white/10"
              }`}
            >
              Learn More
            </Link>
          </div>
        </div>

        {activeSlides.length > 1 && (
          <div className="flex items-center gap-3 mt-14">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => setIndex((i) => (i - 1 + activeSlides.length) % activeSlides.length)}
              className={`p-2 rounded-full border hover:bg-white/10 ${isLight ? "border-primary-950/25" : "border-white/25"}`}
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
              {activeSlides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index
                      ? "w-7 bg-accent-500"
                      : isLight
                        ? "w-3 bg-primary-950/30 hover:bg-primary-950/50"
                        : "w-3 bg-white/30 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => setIndex((i) => (i + 1) % activeSlides.length)}
              className={`p-2 rounded-full border hover:bg-white/10 ${isLight ? "border-primary-950/25" : "border-white/25"}`}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
