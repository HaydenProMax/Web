import { cookies } from "next/headers";

import { ACTIVITY_FOCUS_COOKIE, ACTIVITY_FOCUS_DEFAULT_COOKIE, buildActivityHref, getActivityFocusLabel, getActivityFocusNextStep, resolveActivityFocus } from "@/lib/activity-focus";

export {
  ACTIVITY_FOCUS_COOKIE,
  ACTIVITY_FOCUS_DEFAULT_COOKIE,
  ACTIVITY_FOCUS_MAX_AGE,
  buildActivityHref,
  getActivityFocusCookieConfig,
  getActivityFocusDefaultCookieConfig,
  getActivityFocusLabel,
  getActivityFocusNextStep,
  resolveActivityFocus
} from "@/lib/activity-focus";
export type { ActivityFocusKey } from "@/lib/activity-focus";

export async function getPreferredActivityFocus() {
  const cookieStore = await cookies();
  const currentFocus = cookieStore.get(ACTIVITY_FOCUS_COOKIE)?.value;
  const defaultFocus = cookieStore.get(ACTIVITY_FOCUS_DEFAULT_COOKIE)?.value;
  return resolveActivityFocus(currentFocus ?? defaultFocus);
}

export async function getDefaultActivityFocus() {
  const cookieStore = await cookies();
  return resolveActivityFocus(cookieStore.get(ACTIVITY_FOCUS_DEFAULT_COOKIE)?.value);
}

export async function getPreferredActivityHref(hash?: string) {
  const focus = await getPreferredActivityFocus();
  return buildActivityHref(focus, hash);
}

export async function getPreferredActivityReentry() {
  const focus = await getPreferredActivityFocus();
  const defaultFocus = await getDefaultActivityFocus();
  return {
    focus,
    label: getActivityFocusLabel(focus),
    href: buildActivityHref(focus),
    nextStep: getActivityFocusNextStep(focus),
    defaultFocus,
    defaultLabel: getActivityFocusLabel(defaultFocus)
  };
}
