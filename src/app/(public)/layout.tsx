import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getMemberClaims } from "@/lib/auth/member";
import { getAlumniClaims } from "@/lib/auth/alumni";
import { getUserClaims } from "@/lib/auth/user";

// Header and Footer both read site settings/social links from the database
// on every request. Declaring the whole group dynamic here means content
// edited in the admin is reflected immediately everywhere, and no public
// page needs to remember this export individually.
export const dynamic = "force-dynamic";

/**
 * Whether anyone is signed in to a member or alumni account.
 *
 * All three cookies are checked because a person can be signed in through
 * either the legacy member/alumni sessions or the unified one, and this
 * needs to be true for all of them. Each check is just a cookie read and a
 * signature verify — no database work — so it's cheap enough to run on
 * every public page render.
 */
async function isSignedIn(): Promise<boolean> {
  const [member, alumni, user] = await Promise.all([
    getMemberClaims(),
    getAlumniClaims(),
    getUserClaims(),
  ]);
  return Boolean(member || alumni || user);
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // The footer is a signed-out landing surface: it markets the association
  // and links to Enroll Now, Member Login and Forgot Password. None of that
  // is any use to someone already signed in, so it's dropped for them.
  const signedIn = await isSignedIn();

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      {!signedIn && <Footer />}
    </>
  );
}
