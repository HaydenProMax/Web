export type SearchDeskDensity = "comfortable" | "compact";

export const SEARCH_DENSITY_COOKIE = "command-desk-density";
export const SEARCH_DENSITY_MAX_AGE = 60 * 60 * 24 * 365;

export function parseSearchDeskDensity(value?: string | null): SearchDeskDensity | null {
  if (value === "compact" || value === "comfortable") {
    return value;
  }

  return null;
}

export function normalizeDeskDensity(value?: string | null): SearchDeskDensity {
  return parseSearchDeskDensity(value) ?? "comfortable";
}

export function getSearchDensityCookieConfig(value: SearchDeskDensity) {
  return {
    name: SEARCH_DENSITY_COOKIE,
    value,
    options: {
      path: "/",
      sameSite: "lax" as const,
      httpOnly: false,
      maxAge: SEARCH_DENSITY_MAX_AGE
    }
  };
}
