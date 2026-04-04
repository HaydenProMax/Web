import { NextResponse } from "next/server";

import { getSearchDensityCookieConfig, normalizeDeskDensity } from "@/lib/search-density";

function resolveSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/search";
  }

  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const density = normalizeDeskDensity(url.searchParams.get("value"));
  const nextPath = resolveSafeNextPath(url.searchParams.get("next"));
  const nextUrl = new URL(nextPath, url.origin);

  const response = NextResponse.redirect(nextUrl);
  const cookie = getSearchDensityCookieConfig(density);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}