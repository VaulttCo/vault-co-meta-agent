/**
 * Next.js Edge Middleware — runs on every request before the page renders.
 *
 * Responsibilities:
 * 1. Refresh the Supabase session cookie (keeps users logged in across tabs/refreshes)
 * 2. Redirect unauthenticated users to /login for all protected routes
 * 3. Redirect authenticated users away from /login to the dashboard
 *
 * Security policy — FAIL CLOSED:
 * - If Supabase env vars are missing or contain placeholder values, protected routes
 *   are treated as unauthenticated and redirected to /login.
 * - There is NO open fallback that allows protected routes through when Supabase
 *   is not configured. This prevents accidental exposure during misconfiguration.
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

// Placeholder values that indicate Supabase is not properly configured
const PLACEHOLDER_PATTERNS = [
  "placeholder.supabase.co",
  "your-project.supabase.co",
  "YOUR_SUPABASE",
  "example.supabase.co",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function isPlaceholderValue(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) =>
    value.toLowerCase().includes(pattern.toLowerCase())
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

  // FAIL CLOSED: If Supabase env vars are missing or contain placeholder values,
  // treat the request as unauthenticated. Protected routes redirect to /login.
  // Public routes (e.g. /login itself) are still accessible so users can see
  // the login page and a configuration error message.
  const supabaseConfigured =
    supabaseUrl &&
    supabaseAnonKey &&
    !isPlaceholderValue(supabaseUrl) &&
    !isPlaceholderValue(supabaseAnonKey);

  if (!supabaseConfigured) {
    // If the user is trying to access a protected route, redirect to /login
    if (!isPublicRoute(pathname)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      loginUrl.searchParams.set("error", "config");
      return NextResponse.redirect(loginUrl);
    }
    // Allow /login and /auth/callback through so the login page can render
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
