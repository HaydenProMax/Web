"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ModuleKey } from "@workspace/types/index";

import { getActivityFocusCookieConfig, getActivityFocusDefaultCookieConfig, resolveActivityFocus } from "@/lib/activity-focus";
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

function resolveSafeReturnPath(value: string | null | undefined) {
  if (value === "/modules") {
    return "/modules";
  }

  return "/settings";
}

export async function updateSettingsPreferencesAction(formData: FormData) {
  try {
    await updateUserPreferences({
      displayName: formData.get("displayName")?.toString().trim() ?? "",
      curatorTitle: formData.get("curatorTitle")?.toString().trim() ?? "",
      theme: formData.get("theme")?.toString() ?? "light",
      accentColor: formData.get("accentColor")?.toString() ?? "primary",
      typographyMode: formData.get("typographyMode")?.toString() ?? "serif-focus",
      locale: formData.get("locale")?.toString() ?? "zh-CN",
      timezone: formData.get("timezone")?.toString() ?? "Asia/Shanghai",
      defaultActivityFocus: resolveActivityFocus(formData.get("defaultActivityFocus")?.toString())
    });

    const defaultFocus = resolveActivityFocus(formData.get("defaultActivityFocus")?.toString());
    const cookieStore = await cookies();
    const currentCookie = getActivityFocusCookieConfig(defaultFocus);
    const defaultCookie = getActivityFocusDefaultCookieConfig(defaultFocus);
    cookieStore.set(defaultCookie.name, defaultCookie.value, defaultCookie.options);
    cookieStore.set(currentCookie.name, currentCookie.value, currentCookie.options);

    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/modules");
    redirect("/settings?saved=1");
  } catch {
    redirect("/settings?error=preferences-save-failed");
  }
}

export async function toggleModuleEnabledAction(formData: FormData) {
  const moduleKey = formData.get("moduleKey")?.toString() as ModuleKey;
  const enabled = formData.get("enabled")?.toString() === "1";
  const returnTo = resolveSafeReturnPath(formData.get("returnTo")?.toString());

  if (!moduleKeys.has(moduleKey)) {
    redirect(`${returnTo}?error=unknown-module`);
  }

  try {
    await setModuleEnabled(moduleKey, enabled);
    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/modules");
    redirect(`${returnTo}?updated=${moduleKey}`);
  } catch {
    redirect(`${returnTo}?error=module-update-failed`);
  }
}