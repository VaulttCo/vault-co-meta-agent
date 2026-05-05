/**
 * Next.js Edge Middleware — runs on every request before the page renders.
 *
 * Responsibilities:
 * 1. Refresh the Supabase session cookie (keeps users logged in across tabs/refreshes)
 * 2. Redirect unauthenticated users to /login for all protected routes
 * 3. Redirect authenticated users away from /login to the dashboard
 *
 * In demo mode (NEXT_PUBLIC_AUTH_MODE=demo), all route protection is skipped
 * because there are no real Supabase sessions — the client-side AuthProvider
 * handles demo auth via localStorage.
 *
 * Role-level access control (e.g. blocking /settings for non-admins) is handled
 * in each page component via useAuth().can() — not in middleware — because role
 * data requires a database query that is too slow for the edge.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Routes that do NOT require authentication
const PUBLIC_ROUTES = ["/login", "/auth/callback"];

// Routes that require authentication (all others are also protected by default)
const PROTECTED_PREFIXES = [
  "/",
  "/clients",
  "/campaigns",
  "/ai-agent",
  "/creatives",
  "/analytics",
  "/reports",
  "/approvals",
  "/settings",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Skip middleware for static assets and Next.js internals ──────────────
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".") // static files (images, fonts, etc.)
  ) {
    return NextResponse.next();
  }

  // ── Demo mode: skip all server-side auth checks ───────────────────────────
  // Client-side AuthProvider handles demo auth via localStorage.
  const authMode = process.env.NEXT_PUBLIC_AUTH_MODE ?? "supabase";
  if (authMode === "demo") {
    return NextResponse.next();
  }

  // ── Supabase mode: check session ──────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, allow all requests (prevents lockout during setup)
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  // Create a Supabase client that can read/write cookies
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh the session — this also updates the cookie if it's about to expire
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;
  const isPublic = isPublicRoute(pathname);

  // Unauthenticated user trying to access a protected route → redirect to /login
  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user visiting /login → redirect to dashboard
  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - icon.png
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
