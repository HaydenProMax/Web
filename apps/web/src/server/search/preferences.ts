import { cookies } from "next/headers";

import { SEARCH_MODULE_STACK_COOKIE, getSearchModuleStackMeta, parseSearchModuleStack } from "@/lib/search-module-stack";

export async function getRememberedWorkflowSummary() {
  const cookieStore = await cookies();
  const key = parseSearchModuleStack(cookieStore.get(SEARCH_MODULE_STACK_COOKIE)?.value);

  if (!key) {
    return {
      active: false,
      key: undefined,
      title: "No pinned workflow",
      href: "/search",
      summary: "The desk is currently following live posture and replay habit without a pinned workflow overriding the lane."
    };
  }

  const meta = getSearchModuleStackMeta(key);

  return {
    active: true,
    key,
    ...meta
  };
}
