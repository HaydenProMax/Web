import type { Session } from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getActivityFocusCookieConfig, parseActivityFocus } from "@/lib/activity-focus";
import { getSearchDensityCookieConfig, parseSearchDeskDensity } from "@/lib/search-density";

function resolveSafeCallbackPath(pathname: string, search: string) {
  const candidate = `${pathname}${search}`;

  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/";
  }

  return candidate;
}

export default auth((req: NextRequest & { auth: Session | null }) => {
  const isSignedIn = Boolean(req.auth?.user);
  const { pathname, search } = req.nextUrl;

  function withActivityFocusSync(response: NextResponse) {
    if (pathname === "/activity") {
      const requestedFocus = parseActivityFocus(req.nextUrl.searchParams.get("focus"));
      if (requestedFocus) {
        const cookie = getActivityFocusCookieConfig(requestedFocus);
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      }
    }

    if (pathname === "/search") {
      const requestedDensity = parseSearchDeskDensity(req.nextUrl.searchParams.get("density"));
      if (requestedDensity) {
        const cookie = getSearchDensityCookieConfig(requestedDensity);
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      }
    }

    return response;
  }

  const isAuthRoute = pathname.startsWith("/api/auth");
  const isApiRoute = pathname.startsWith("/api/");
  const isSignInRoute = pathname === "/sign-in";
  const callbackPath = resolveSafeCallbackPath(pathname, search);

  if (isAuthRoute) {
    return;
  }

  if (isSignInRoute) {
    if (isSignedIn) {
      const destination = req.nextUrl.searchParams.get("callbackUrl");
      const nextPath = destination && destination.startsWith("/") && !destination.startsWith("//") ? destination : "/";
      return withActivityFocusSync(NextResponse.redirect(new URL(nextPath, req.nextUrl)));
    }

    return;
  }

  if (!isSignedIn) {
    if (isApiRoute) {
      return withActivityFocusSync(NextResponse.json(
        {
          error: "unauthorized"
        },
        { status: 401 }
      ));
    }

    const signInUrl = new URL("/sign-in", req.nextUrl);
    signInUrl.searchParams.set("callbackUrl", callbackPath);
    return withActivityFocusSync(NextResponse.redirect(signInUrl));
  }

  return withActivityFocusSync(NextResponse.next());
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
