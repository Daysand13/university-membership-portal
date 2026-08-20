import Link from "next/link";
import { Search, GraduationCap } from "lucide-react";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { SocialIcon } from "./SocialIcon";
import { getActiveSocialLinks, getSiteSettings } from "@/lib/services/content-service";

const PRIMARY_LINKS = [
  { href: "/", label: "Homepage" },
  { href: "/about", label: "About Us" },
  { href: "/library", label: "Library" },
  { href: "/elections", label: "Election" },
  { href: "/contact", label: "Contact Us" },
];

export async function Header() {
  const [socialLinks, settings] = await Promise.all([getActiveSocialLinks(), getSiteSettings()]);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-line">
      {/* Utility bar */}
      <div className="hidden sm:block bg-primary-950 text-primary-100 text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-9">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <GraduationCap size={14} className="text-accent-400" />
              Official Membership Portal
            </span>
          </div>
          <div className="flex items-center gap-4">
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-2.5">
                {socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.displayName}
                    className="text-primary-200 hover:text-accent-400 transition-colors"
                  >
                    <SocialIcon platform={link.platform} />
                  </a>
                ))}
              </div>
            )}
            <span className="w-px h-3.5 bg-primary-800" />
            <Link href="/membership/login" className="hover:text-accent-400">
              Member Login
            </Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[68px]">
          <Logo siteTitle={settings.siteTitle} logoUrl={settings.logoUrl} />

          <nav className="hidden lg:flex items-center gap-1">
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 rounded-md text-sm font-semibold text-primary-950 hover:bg-primary-50 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <Link
              href="/search"
              aria-label="Search"
              className="p-2.5 rounded-md text-primary-800 hover:bg-primary-50"
            >
              <Search size={18} />
            </Link>
            <Link
              href="/donate"
              className="px-4 py-2 rounded-md text-sm font-semibold border border-primary-800 text-primary-800 hover:bg-primary-50 transition-colors"
            >
              Donate
            </Link>
            <Link
              href="/membership/enroll"
              className="px-4 py-2 rounded-md text-sm font-semibold bg-primary-800 text-white hover:bg-primary-900 transition-colors shadow-sm"
            >
              Membership Portal
            </Link>
          </div>

          <MobileNav socialLinks={socialLinks} />
        </div>
      </div>
    </header>
  );
}
