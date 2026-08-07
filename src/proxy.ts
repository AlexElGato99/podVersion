import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Pinterest's domain-verification file, e.g. "pinterest-1a2b3c.html". */
const PINTEREST_VERIFY_FILE = /^\/(pinterest-[A-Za-z0-9_-]+\.html)$/;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always forward pathname as header so root layout can read it
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // Pinterest expects its verification file at the domain root. Rewriting here
  // rather than via next.config keeps the filename configurable from the
  // dashboard, and avoids next.config's `:param(regex)` syntax, which newer
  // path-to-regexp versions no longer substitute.
  const verifyMatch = pathname.match(PINTEREST_VERIFY_FILE);
  if (verifyMatch) {
    const url = request.nextUrl.clone();
    url.pathname = "/api/pinterest-verify";
    url.searchParams.set("filename", verifyMatch[1]);
    // The header is a fallback: query strings added during a rewrite are not
    // always preserved, and a silently dropped filename looks identical to a
    // genuinely missing file.
    const headers = new Headers(request.headers);
    headers.set("x-pinterest-verify-file", verifyMatch[1]);
    return NextResponse.rewrite(url, { request: { headers } });
  }

  // Pass through the admin login page itself
  if (pathname === "/admin/login") {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Protect all /dashboard/* routes
  if (pathname.startsWith("/dashboard")) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
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
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    return response;
  }

  // For all other routes, refresh the Supabase session
  return await updateSession(request);
}

async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
