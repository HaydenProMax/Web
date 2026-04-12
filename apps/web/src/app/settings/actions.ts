"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ModuleKey } from "@workspace/types/index";

import { getActivityFocusDefaultCookieConfig, resolveActivityFocus } from "@/lib/activity-focus";
import { setModuleEnabled, updateUserPreferences } from "@/server/settings/service";

const moduleKeys = new Set<ModuleKey>([
  "dashboard",
  "activity",
  "planner",
  "knowledge",
  "writing",
  "archive",
  "modules",
  "settings"
]);

const lockedModuleKeys = new Set<ModuleKey>(["dashboard", "modules", "settings"]);

function resolveSafeReturnPath(value: string | null | undefined) {
  if (value === "/modules") {
    return "/modules";
  }

  return "/settings";
}

function parseActivityFocusInput(value: string | null | undefined) {
  if (value === "all" || value === "planner" || value === "knowledge" || value === "writing" || value === "archive") {
    return value;
  }

  return undefined;
}

function parseBooleanToggle(value: string | null | undefined) {
  if (value === "1") {
    return true;
  }

  if (value === "0") {
    return false;
  }

  return undefined;
}

function parseThemeInput(value: string | null | undefined) {
  if (value === "light" || value === "mist" || value === "paper") {
    return value;
  }

  return undefined;
}

function parseAccentColorInput(value: string | null | undefined) {
  if (value === "primary" || value === "forest" || value === "ember") {
    return value;
  }

  return undefined;
}

function parseTypographyModeInput(value: string | null | undefined) {
  if (value === "serif-focus" || value === "editorial" || value === "compact") {
    return value;
  }

  return undefined;
}

export async function updateSettingsPreferencesAction(formData: FormData) {
  const parsedDefaultFocus = parseActivityFocusInput(formData.get("defaultActivityFocus")?.toString());
  const parsedTheme = parseThemeInput(formData.get("theme")?.toString());
  const parsedAccentColor = parseAccentColorInput(formData.get("accentColor")?.toString());
  const parsedTypographyMode = parseTypographyModeInput(formData.get("typographyMode")?.toString());
  const locale = formData.get("locale")?.toString().trim() ?? "";
  const timezone = formData.get("timezone")?.toString().trim() ?? "";

  if (!parsedDefaultFocus || !parsedTheme || !parsedAccentColor || !parsedTypographyMode || !locale || !timezone) {
    redirect("/settings?error=preferences-save-failed");
  }

  try {
    await updateUserPreferences({
      displayName: formData.get("displayName")?.toString().trim() ?? "",
      theme: parsedTheme,
      accentColor: parsedAccentColor,
      typographyMode: parsedTypographyMode,
      locale,
      timezone,
      defaultActivityFocus: parsedDefaultFocus
    });
  } catch {
    redirect("/settings?error=preferences-save-failed");
  }

  const defaultFocus = resolveActivityFocus(parsedDefaultFocus);
  const cookieStore = await cookies();
  const defaultCookie = getActivityFocusDefaultCookieConfig(defaultFocus);
  cookieStore.set(defaultCookie.name, defaultCookie.value, defaultCookie.options);

  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/modules");
  redirect("/settings?saved=1");
}

export async function toggleModuleEnabledAction(formData: FormData) {
  const moduleKey = formData.get("moduleKey")?.toString() as ModuleKey;
  const enabled = parseBooleanToggle(formData.get("enabled")?.toString());
  const returnTo = resolveSafeReturnPath(formData.get("returnTo")?.toString());

  if (!moduleKeys.has(moduleKey)) {
    redirect(`${returnTo}?error=unknown-module`);
  }

  if (lockedModuleKeys.has(moduleKey) || enabled === undefined) {
    redirect(`${returnTo}?error=module-update-failed`);
  }

  try {
    await setModuleEnabled(moduleKey, enabled);
  } catch {
    redirect(`${returnTo}?error=module-update-failed`);
  }

  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/modules");
  redirect(`${returnTo}?updated=${moduleKey}`);
}


