import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

// Header and Footer both read site settings/social links from the database
// on every request. Declaring the whole group dynamic here means content
// edited in the admin is reflected immediately everywhere, and no public
// page needs to remember this export individually.
export const dynamic = "force-dynamic";

/**
 * Every public page — the homepage included — has the full footer (Quick
 * Links, Contact, the copyright line), whether or not the visitor is signed
 * in. The Student, Alumni and Patrons' portals live in the (portal) group
 * with their own layout, which is where the footer is meant to be absent;
 * hiding it here as well, for anyone signed in, took it off the public site.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
