export type SearchDeskDensity = "comfortable" | "compact";

export const SEARCH_DENSITY_COOKIE = "command-desk-density";
export const SEARCH_DENSITY_MAX_AGE = 60 * 60 * 24 * 365;

export function normalizeDeskDensity(value?: string | null): SearchDeskDensity {
  return value === "compact" ? "compact" : "comfortable";
}

export function getSearchDensityCookieConfig(value?: string | null) {
  return {
    name: SEARCH_DENSITY_COOKIE,
    value: normalizeDeskDensity(value),
    options: {
      path: "/",
      sameSite: "lax" as const,
      httpOnly: false,
      maxAge: SEARCH_DENSITY_MAX_AGE
    }
  };
}
