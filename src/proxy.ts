import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./lib/supabase/public-env";

/**
 * Runs before every page request: refreshes the Supabase session cookie and
 * redirects signed-out users away from app pages. This is only an optimistic
 * check; every API route and data read verifies the user again on the server.
 */
const PUBLIC_PATHS = ["/", "/login", "/signup", "/privacy", "/terms", "/auth", "/reset-password"];

export async function proxy(request: NextRequest) {
  try {
    return await guard(request);
  } catch (err) {
    // Never take the whole site down: log it, and let public pages render.
    // App pages still verify the user on the server, so this fails safe.
    console.error("[proxy] session check failed", err);
    return NextResponse.next({ request });
  }
}

async function guard(request: NextRequest) {
  const url = SUPABASE_URL;
  const key = SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set");
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || (p !== "/" && path.startsWith(p + "/")));

  if (!signedIn && !isPublic && !path.startsWith("/api")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (signedIn && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
