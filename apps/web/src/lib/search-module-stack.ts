export type SearchModuleStackKey = "planner" | "knowledge" | "writing" | "archive";

export const SEARCH_MODULE_STACK_COOKIE = "command-module-stack";
export const SEARCH_MODULE_STACK_MAX_AGE = 60 * 60 * 24 * 365;
export const SEARCH_MODULE_STACK_KEYS: SearchModuleStackKey[] = ["planner", "knowledge", "writing", "archive"];

const SEARCH_MODULE_STACK_META: Record<SearchModuleStackKey, { title: string; href: string; summary: string }> = {
  planner: {
    title: "Planner Stack",
    href: "/planner",
    summary: "Keep execution close with task capture, active task refinement, and note-to-task bridges."
  },
  knowledge: {
    title: "Knowledge Stack",
    href: "/knowledge",
    summary: "Keep note capture, synthesis, and note-derived drafting paths warm."
  },
  writing: {
    title: "Writing Stack",
    href: "/writing",
    summary: "Keep draft creation, continuation, and publishing re-entry in one warm lane."
  },
  archive: {
    title: "Archive Stack",
    href: "/archive",
    summary: "Keep durable records and replay history close enough to re-open with intent."
  }
};

export function isSearchModuleStackKey(value?: string | null): value is SearchModuleStackKey {
  return value === "planner" || value === "knowledge" || value === "writing" || value === "archive";
}

export function parseSearchModuleStack(value?: string | null): SearchModuleStackKey | null {
  if (isSearchModuleStackKey(value)) {
    return value;
  }

  return null;
}

export function getSearchModuleStackMeta(value: SearchModuleStackKey) {
  return SEARCH_MODULE_STACK_META[value];
}

export function getSearchModuleStackCookieConfig(value: SearchModuleStackKey) {
  return {
    name: SEARCH_MODULE_STACK_COOKIE,
    value,
    options: {
      path: "/",
      sameSite: "lax" as const,
      httpOnly: false,
      maxAge: SEARCH_MODULE_STACK_MAX_AGE
    }
  };
}

export function getSearchModuleStackClearCookieConfig() {
  return {
    name: SEARCH_MODULE_STACK_COOKIE,
    value: "",
    options: {
      path: "/",
      sameSite: "lax" as const,
      httpOnly: false,
      maxAge: 0
    }
  };
}

export function buildSearchModuleStackHref(value: SearchModuleStackKey, nextPath = "/search") {
  return "/search/stack?value=" + value + "&next=" + encodeURIComponent(nextPath);
}

export function buildClearSearchModuleStackHref(nextPath = "/search") {
  return "/search/stack?clear=1&next=" + encodeURIComponent(nextPath);
}
