import Link from "next/link";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Logo } from "./Logo";
import { SocialIcon } from "./SocialIcon";
import { getActiveSocialLinks, getSiteSettings } from "@/lib/services/content-service";

export async function Footer() {
  const [socialLinks, settings] = await Promise.all([getActiveSocialLinks(), getSiteSettings()]);

  return (
    <footer className="bg-primary-950 text-primary-100 mt-auto">
      <div className="border-b-2 border-accent-500/40" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <Logo siteTitle={settings.siteTitle} logoUrl={settings.logoUrl} onDark />
          <p className="mt-4 text-sm leading-relaxed text-primary-200 max-w-xs">
            {settings.footerDescription}
          </p>
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-2.5 mt-5">
              {socialLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.displayName}
                  className="p-2 rounded-full bg-white/5 hover:bg-accent-500 hover:text-primary-950 transition-colors"
                >
                  <SocialIcon platform={link.platform} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="kicker-on-dark text-xs font-semibold uppercase tracking-wider mb-4">Quick Links</h3>
          <ul className="space-y-2.5 text-sm">
            {[
              ["/about", "About Us"],
              ["/news", "News"],
              ["/events", "Events"],
              ["/library", "Library"],
              ["/elections", "Elections"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-primary-200 hover:text-white transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="kicker-on-dark text-xs font-semibold uppercase tracking-wider mb-4">Membership</h3>
          <ul className="space-y-2.5 text-sm">
            {[
              ["/membership/enroll", "Enroll Now"],
              ["/membership/login", "Member Login"],
              ["/membership/forgot-password", "Forgot Password"],
              ["/donate", "Donate"],
              ["/contact", "Contact Us"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-primary-200 hover:text-white transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="kicker-on-dark text-xs font-semibold uppercase tracking-wider mb-4">Get in Touch</h3>
          <ul className="space-y-3 text-sm text-primary-200">
            {settings.physicalAddress && (
              <li className="flex gap-2.5">
                <MapPin size={16} className="mt-0.5 shrink-0 text-accent-400" />
                <span>{settings.physicalAddress}</span>
              </li>
            )}
            {settings.phonePrimary && (
              <li className="flex gap-2.5">
                <Phone size={16} className="mt-0.5 shrink-0 text-accent-400" />
                <span>{settings.phonePrimary}</span>
              </li>
            )}
            {settings.generalEmail && (
              <li className="flex gap-2.5">
                <Mail size={16} className="mt-0.5 shrink-0 text-accent-400" />
                <span>{settings.generalEmail}</span>
              </li>
            )}
            {settings.officeHours && (
              <li className="flex gap-2.5">
                <Clock size={16} className="mt-0.5 shrink-0 text-accent-400" />
                <span>{settings.officeHours}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-primary-300">
          <p>{settings.copyrightText}</p>
        </div>
      </div>
    </footer>
  );
}
