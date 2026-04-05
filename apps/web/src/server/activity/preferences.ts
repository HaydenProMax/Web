import { cookies } from "next/headers";

import { ACTIVITY_FOCUS_COOKIE, ACTIVITY_FOCUS_DEFAULT_COOKIE, buildActivityHref, getActivityFocusLabel, getActivityFocusNextStep, parseActivityFocus, resolveActivityFocus } from "@/lib/activity-focus";
import { getCurrentUserId } from "@/server/auth/current-user";
import { getDb } from "@/server/db";

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

async function getPersistedDefaultActivityFocus() {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const preferences = await db.userPreference.findUnique({
    where: { userId: ownerId },
    select: { defaultActivityFocus: true }
  });

  return parseActivityFocus(preferences?.defaultActivityFocus) ?? null;
}

export async function getPreferredActivityFocus() {
  const cookieStore = await cookies();
  const currentFocus = parseActivityFocus(cookieStore.get(ACTIVITY_FOCUS_COOKIE)?.value);
  const persistedDefaultFocus = await getPersistedDefaultActivityFocus();
  const defaultFocus = parseActivityFocus(cookieStore.get(ACTIVITY_FOCUS_DEFAULT_COOKIE)?.value);
  return currentFocus ?? persistedDefaultFocus ?? defaultFocus ?? "all";
}

export async function getDefaultActivityFocus() {
  const cookieStore = await cookies();
  const persistedDefaultFocus = await getPersistedDefaultActivityFocus();
  return persistedDefaultFocus ?? resolveActivityFocus(cookieStore.get(ACTIVITY_FOCUS_DEFAULT_COOKIE)?.value);
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
