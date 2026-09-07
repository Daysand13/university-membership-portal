import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const encoder = new TextEncoder();

async function hasValidSession(request: NextRequest, cookieName: string, expectedType: string): Promise<boolean> {
  const token = request.cookies.get(cookieName)?.value;
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret));
    return payload.type === expectedType;
  } catch {
    return false;
  }
}

/**
 * Lightweight, edge-compatible gate: confirms a syntactically valid session
 * cookie is present before letting the request through. Per Next.js's own
 * guidance, Proxy is for optimistic checks only, not full session/authz —
 * the authoritative check (is this admin still active? still has this
 * role?) happens in the relevant Server Component layout, which can hit
 * the database — something Proxy/Edge cannot do with the Postgres driver
 * used here.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const ok = await hasValidSession(request, "admin_session", "admin");
    if (!ok) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith("/membership/dashboard")) {
    // Either session gets you past this gate: the legacy member_session, or
    // the unified user_session issued by /login. Both have to be accepted
    // while the identity migration is in flight — checking only the legacy
    // one would bounce every unified sign-in here, before the page that
    // knows how to resolve it ever runs.
    //
    // Letting a user_session through is not a hole: this is an optimistic
    // check by design (see above), and the dashboard layout's
    // requireMember() is authoritative — it resolves the member from either
    // session and enforces the MEMBER role against the database.
    const ok =
      (await hasValidSession(request, "member_session", "member")) ||
      (await hasValidSession(request, "user_session", "user"));
    if (!ok) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/membership/dashboard/:path*"],
};
