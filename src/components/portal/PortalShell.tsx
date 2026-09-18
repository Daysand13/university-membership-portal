import type { ReactNode } from "react";
import Link from "next/link";
import { PortalNav } from "./PortalNav";
import { PortalMobileMenu } from "./PortalMobileMenu";
import { PortalSwitcher } from "./PortalSwitcher";
import { PortalUserMenu } from "./PortalUserMenu";
import { PORTAL_LABEL, PORTAL_NAV, type PortalMode } from "./portal-nav-items";

const ACCOUNT_LINKS: Record<PortalMode, { settingsHref: string; passwordHref: string }> = {
  member: { settingsHref: "/membership/dashboard/profile", passwordHref: "/membership/dashboard/change-password" },
  alumni: { settingsHref: "/alumni/profile", passwordHref: "/alumni/profile#password" },
  patron: { settingsHref: "/patrons/dashboard/account", passwordHref: "/patrons/dashboard/account#password" },
};

/**
 * The frame every signed-in portal page shares, student, alumni or patron: a header
 * (logo, portal switcher, account menu), a sidebar that changes with the
 * portal, and the page itself. The same layout in both portals, so moving
 * between them never feels like landing on a different site.
 *
 * Built for the association's members specifically: a skip link to the
 * content, real landmarks (<header>, <nav>, <aside>, <main>), 44px touch
 * targets, visible focus, and a sidebar that becomes a menu on phones rather
 * than squeezing beside the content.
 */
export function PortalShell({
  mode,
  siteTitle,
  logoUrl,
  person,
  switcher,
  signOutAction,
  headerTools,
  children,
}: {
  mode: PortalMode;
  siteTitle: string;
  logoUrl: string | null | undefined;
  person: { name: string; email: string; avatarUrl: string | null };
  switcher: { isDual: boolean; canSwitch: boolean; isAdmin: boolean };
  signOutAction: () => Promise<void>;
  /** Extra controls beside the account menu (the Patrons' Portal's search, quick actions and bell). */
  headerTools?: ReactNode;
  children: ReactNode;
}) {
  const portalLabel = PORTAL_LABEL[mode];
  const items = PORTAL_NAV[mode];
  const { settingsHref, passwordHref } = ACCOUNT_LINKS[mode];

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-primary-800 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 bg-white border-b border-line">
        {/* Wraps rather than overflowing: with the text size turned up on a
            small phone, the controls move to a second row instead of
            pushing the page sideways or sliding over the logo. */}
        <div className="mx-auto max-w-7xl flex flex-wrap items-center gap-2 sm:gap-4 min-h-16 py-2 px-4 sm:px-6 lg:px-8">
          <PortalMobileMenu items={items} portalLabel={portalLabel} />

          <Link
            href="/"
            className="flex items-center gap-2.5 min-w-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="w-9 h-9 object-contain shrink-0" />
            ) : (
              <span aria-hidden="true" className="w-9 h-9 rounded-md bg-primary-800 shrink-0" />
            )}
            <span className="sr-only">{siteTitle} — home</span>
            <span
              aria-hidden="true"
              className="hidden sm:block max-w-[16rem] xl:max-w-[22rem] font-display font-bold text-sm leading-snug text-primary-950 line-clamp-2"
            >
              {siteTitle}
            </span>
          </Link>

          <div className="hidden md:block">
            <PortalSwitcher current={mode} {...switcher} />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {headerTools}
            {/* The accessibility toolbar's compact Read Aloud / Dark Mode
                buttons portal into this slot on small screens. */}
            <div id="a11y-mobile-slot" className="flex items-center" />
            <PortalUserMenu
              name={person.name}
              email={person.email}
              avatarUrl={person.avatarUrl}
              settingsHref={settingsHref}
              passwordHref={passwordHref}
              signOutAction={signOutAction}
            />
          </div>
        </div>

        <div className="md:hidden border-t border-line px-4 py-2">
          <PortalSwitcher current={mode} {...switcher} />
        </div>
      </header>

      <div className="flex-1 bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8 lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-8">
          <aside aria-label={`${portalLabel} sidebar`} className="hidden lg:block">
            <div className="sticky top-24">
              <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wide text-slate">{portalLabel}</p>
              <PortalNav items={items} label={`${portalLabel} navigation`} />
            </div>
          </aside>

          <main id="main-content" tabIndex={-1} className="min-w-0 focus:outline-none">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
