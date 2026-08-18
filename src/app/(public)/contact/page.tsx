import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ContactForm } from "@/components/forms/ContactForm";
import { SocialIcon } from "@/components/layout/SocialIcon";
import { getSiteSettings, getActiveSocialLinks } from "@/lib/services/content-service";

export const metadata: Metadata = { title: "Contact Us" };
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const [settings, socialLinks] = await Promise.all([getSiteSettings(), getActiveSocialLinks()]);

  return (
    <div className="bg-white">
      <div className="bg-surface-muted border-b border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <SectionHeading kicker="We'd Love to Hear From You" title="Contact Us" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-5 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {settings.physicalAddress && (
            <div className="flex gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-800 flex items-center justify-center shrink-0">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-950">Office Address</p>
                <p className="text-sm text-slate mt-0.5">{settings.physicalAddress}</p>
                {settings.postalAddress && <p className="text-sm text-slate">{settings.postalAddress}</p>}
              </div>
            </div>
          )}
          {(settings.phonePrimary || settings.phoneSecondary) && (
            <div className="flex gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-800 flex items-center justify-center shrink-0">
                <Phone size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-950">Phone</p>
                {settings.phonePrimary && <p className="text-sm text-slate mt-0.5">{settings.phonePrimary}</p>}
                {settings.phoneSecondary && <p className="text-sm text-slate">{settings.phoneSecondary}</p>}
              </div>
            </div>
          )}
          {(settings.generalEmail || settings.membershipEmail) && (
            <div className="flex gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-800 flex items-center justify-center shrink-0">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-950">Email</p>
                {settings.generalEmail && <p className="text-sm text-slate mt-0.5">General: {settings.generalEmail}</p>}
                {settings.membershipEmail && <p className="text-sm text-slate">Membership: {settings.membershipEmail}</p>}
              </div>
            </div>
          )}
          {settings.officeHours && (
            <div className="flex gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-800 flex items-center justify-center shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-950">Office Hours</p>
                <p className="text-sm text-slate mt-0.5">{settings.officeHours}</p>
              </div>
            </div>
          )}

          {socialLinks.length > 0 && (
            <div className="flex gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-800 flex items-center justify-center shrink-0">
                <Send size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-950 mb-2">Follow Us</p>
                <div className="flex items-center gap-2">
                  {socialLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.displayName}
                      className="p-2 rounded-full bg-primary-50 text-primary-800 hover:bg-primary-800 hover:text-white transition-colors"
                    >
                      <SocialIcon platform={link.platform} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {settings.mapEmbedUrl && (
            <div className="rounded-lg overflow-hidden border border-line aspect-video mt-2">
              <iframe src={settings.mapEmbedUrl} className="w-full h-full" loading="lazy" title="Location map" />
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-lg border border-line p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <Send size={18} className="text-accent-500" />
              <h2 className="font-display font-bold text-lg text-primary-950">Send us a message</h2>
            </div>
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
