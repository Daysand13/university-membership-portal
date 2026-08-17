"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronRight } from "lucide-react";
import { SocialIcon } from "./SocialIcon";
import type { SocialLink } from "@/generated/prisma/client";

const PRIMARY_LINKS = [
  { href: "/", label: "Homepage" },
  { href: "/about", label: "About Us" },
  { href: "/library", label: "Library" },
  { href: "/elections", label: "Election" },
  { href: "/contact", label: "Contact Us" },
];

const QUICK_LINKS = [
  { href: "/news", label: "News" },
  { href: "/membership", label: "Membership Portal" },
  { href: "/events", label: "Upcoming Events" },
  { href: "/events?when=past", label: "Past Events" },
  { href: "/donate", label: "Donate" },
];

export function MobileNav({ socialLinks }: { socialLinks: SocialLink[] }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  // Close the drawer when the route changes. This adjusts state during
  // render (React's documented pattern for "reset state when a prop
  // changes") rather than in an effect, since it's derived from a prop,
  // not an external system.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    // Genuine effect, not derived state: synchronizes document.body's
    // overflow with an external DOM property, and defers setVisible(true)
    // to the next animation frame so the CSS transition actually plays
    // (setting it synchronously during render would skip the transition).
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
    setVisible(false);
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="p-2 -mr-2 text-primary-950 rounded-md hover:bg-primary-50"
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button
            aria-label="Close menu"
            className={`absolute inset-0 bg-primary-950/50 backdrop-blur-[1px] transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
            onClick={() => setOpen(false)}
          />
          <nav
            className={`relative ml-auto h-full w-[86%] max-w-sm bg-white shadow-xl flex flex-col transition-transform duration-300 ease-out ${
              visible ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <span className="kicker">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="p-2 -mr-2 text-primary-950 rounded-md hover:bg-primary-50"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <ul>
                {PRIMARY_LINKS.map((link) => (
                  <li key={link.href} className="border-b border-line last:border-0">
                    <Link
                      href={link.href}
                      className="flex items-center justify-between py-3.5 text-[15px] font-semibold text-primary-950"
                    >
                      {link.label}
                      <ChevronRight size={18} className="text-slate-light" />
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="kicker mt-7 mb-3">Quick Links</p>
              <ul className="space-y-0.5">
                {QUICK_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="block py-2 text-sm text-slate hover:text-primary-800">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                <Link
                  href="/membership/enroll"
                  className="block w-full text-center rounded-md bg-accent-500 text-primary-950 font-semibold py-3 text-sm hover:bg-accent-600"
                >
                  Enroll for Membership
                </Link>
                <Link
                  href="/membership/login"
                  className="block w-full text-center rounded-md border border-primary-800 text-primary-800 font-semibold py-3 text-sm mt-2.5 hover:bg-primary-50"
                >
                  Member Login
                </Link>
              </div>
            </div>

            {socialLinks.length > 0 && (
              <div className="border-t border-line px-5 py-4 flex items-center gap-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.displayName}
                    className="p-2 rounded-full bg-surface-muted text-primary-800 hover:bg-primary-100"
                  >
                    <SocialIcon platform={link.platform} />
                  </a>
                ))}
              </div>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
