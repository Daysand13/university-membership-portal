import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

// Header and Footer both read site settings/social links from the database
// on every request. Declaring the whole group dynamic here means content
// edited in the admin is reflected immediately everywhere, and no public
// page needs to remember this export individually.
export const dynamic = "force-dynamic";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
