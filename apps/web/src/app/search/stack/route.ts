import { NextResponse } from "next/server";

import { getSearchModuleStackClearCookieConfig, getSearchModuleStackCookieConfig, parseSearchModuleStack } from "@/lib/search-module-stack";

function resolveSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/search";
  }

  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawValue = url.searchParams.get("value");
  const clear = url.searchParams.get("clear") === "1" || rawValue === "clear";
  const nextPath = resolveSafeNextPath(url.searchParams.get("next"));
  const nextUrl = new URL(nextPath, url.origin);

  const response = NextResponse.redirect(nextUrl);

  if (clear) {
    const cookie = getSearchModuleStackClearCookieConfig();
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  }

  const stack = parseSearchModuleStack(rawValue);
  if (!stack) {
    return response;
  }

  const cookie = getSearchModuleStackCookieConfig(stack);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
