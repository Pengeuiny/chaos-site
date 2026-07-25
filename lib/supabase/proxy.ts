import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase Auth session cookie on every request so server
 * components/actions never see a stale token. Also does an *optimistic*
 * redirect for unauthenticated visitors to /admin/* — the real enforcement
 * still happens server-side via requireAdmin()/requireRole() (lib/admin-auth.ts),
 * this is just a fast pre-check per Next's own guidance that proxy checks
 * shouldn't be the only line of defense.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Never trust getSession() here — it doesn't validate the JWT. getClaims()
  // checks the signature against the project's published keys every time.
  const { data } = await supabase.auth.getClaims();
  const authed = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname;
  const isPublicAdminRoute = path === "/admin/login" || path === "/admin/setup";
  const isProtectedAdminRoute = path.startsWith("/admin") && !isPublicAdminRoute;

  if (isProtectedAdminRoute && !authed) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
