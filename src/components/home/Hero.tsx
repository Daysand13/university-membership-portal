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
};

function PatternBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg width="100%" height="100%" className="absolute inset-0 opacity-[0.14]">
        <defs>
          <pattern id="hero-grid" width="46" height="46" patternUnits="userSpaceOnUse">
            <path d="M46 0H0V46" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>
      <svg
        className="absolute -right-24 -top-24 opacity-[0.16]"
        width="520"
        height="520"
        viewBox="0 0 40 40"
        fill="none"
      >
        <path
          d="M20 2 L36 9 V19 C36 29 29.5 35.5 20 38 C10.5 35.5 4 29 4 19 V9 Z"
          fill="none"
          stroke="#C9971F"
          strokeWidth="0.6"
        />
      </svg>
    </div>
  );
}

export function Hero({ slides }: { slides: HeroSlide[] }) {
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

  return (
    <section className="relative bg-primary-900 text-white overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
        style={{
          backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : undefined,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: slide.imageUrl
            ? "linear-gradient(100deg, rgba(10,31,68,0.92) 0%, rgba(10,31,68,0.72) 55%, rgba(10,31,68,0.5) 100%)"
            : "linear-gradient(120deg, #0A1F44 0%, #123A73 60%, #163F7D 100%)",
        }}
      />
      <PatternBackdrop />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
        <div className="max-w-2xl">
          <p className="kicker kicker-on-dark mb-4">Acme University Students&apos; Association</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance leading-tight text-white">
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p className="mt-5 text-base sm:text-lg text-primary-100 leading-relaxed max-w-xl">
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
              className="inline-flex items-center rounded-md border border-white/30 text-white font-semibold px-6 py-3 text-sm hover:bg-white/10 transition-colors"
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
              className="p-2 rounded-full border border-white/25 hover:bg-white/10"
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
                    i === index ? "w-7 bg-accent-500" : "w-3 bg-white/30 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => setIndex((i) => (i + 1) % activeSlides.length)}
              className="p-2 rounded-full border border-white/25 hover:bg-white/10"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
