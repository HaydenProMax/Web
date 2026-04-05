import { cookies } from "next/headers";
import type { ModuleKey, SettingsSnapshot, SystemPostureSnapshot, UserModuleSummary, UserPreferenceSummary } from "@workspace/types/index";

import { ACTIVITY_FOCUS_DEFAULT_COOKIE, getActivityFocusLabel, resolveActivityFocus } from "@/lib/activity-focus";
import { getCurrentUserId } from "@/server/auth/current-user";
import { getPreferredActivityReentry } from "@/server/activity/preferences";
import { getDb } from "@/server/db";

const lockedModuleKeys: ModuleKey[] = ["dashboard", "modules", "settings"];

function isLockedModule(key: ModuleKey) {
  return lockedModuleKeys.includes(key);
}

function getReplayAlignedModuleKey(defaultActivityFocus: UserPreferenceSummary["defaultActivityFocus"]): ModuleKey {
  if (defaultActivityFocus === "planner") {
    return "planner";
  }

  if (defaultActivityFocus === "knowledge") {
    return "knowledge";
  }

  if (defaultActivityFocus === "writing") {
    return "writing";
  }

  if (defaultActivityFocus === "archive") {
    return "archive";
  }

  return "activity";
}

function mapPreference(input: {
  profile: { displayName: string | null; curatorTitle: string | null } | null;
  preferences: {
    theme: string | null;
    accentColor: string | null;
    typographyMode: string | null;
    locale: string | null;
    timezone: string | null;
    defaultActivityFocus: string | null;
  } | null;
  legacyDefaultActivityFocus?: string | null;
}): UserPreferenceSummary {
  return {
    displayName: input.profile?.displayName ?? "Workspace Owner",
    curatorTitle: input.profile?.curatorTitle ?? "Private Workstation",
    theme: input.preferences?.theme ?? "light",
    accentColor: input.preferences?.accentColor ?? "primary",
    typographyMode: input.preferences?.typographyMode ?? "serif-focus",
    locale: input.preferences?.locale ?? "zh-CN",
    timezone: input.preferences?.timezone ?? "Asia/Shanghai",
    defaultActivityFocus: resolveActivityFocus(input.preferences?.defaultActivityFocus ?? input.legacyDefaultActivityFocus)
  };
}

function mapModule(input: {
  key: ModuleKey;
  name: string;
  description: string;
  icon: string | null;
  routePath: string;
  enabledByDefault: boolean;
  status: "ACTIVE" | "DISABLED" | "HIDDEN";
  userSettings: Array<{ enabled: boolean; pinned: boolean }>;
  replayAlignedKey: ModuleKey;
}): UserModuleSummary {
  const locked = isLockedModule(input.key);
  const setting = input.userSettings[0];
  const enabled = locked
    ? true
    : input.status === "ACTIVE" && (setting?.enabled ?? input.enabledByDefault);
  const pinned = locked ? true : (setting?.pinned ?? input.key === "dashboard");

  return {
    key: input.key,
    name: input.name,
    description: input.description,
    href: input.routePath,
    icon: input.icon ?? input.key,
    status: input.status,
    enabledByDefault: input.enabledByDefault,
    enabled,
    pinned,
    locked,
    visibleInNavigation: enabled && input.status !== "HIDDEN",
    replayAligned: input.key === input.replayAlignedKey
  };
}

export async function getSettingsSnapshot(): Promise<SettingsSnapshot> {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const cookieStore = await cookies();
  const defaultActivityFocus = cookieStore.get(ACTIVITY_FOCUS_DEFAULT_COOKIE)?.value;

  const [user, modules] = await Promise.all([
    db.user.findUnique({
      where: { id: ownerId },
      select: {
        profile: {
          select: {
            displayName: true,
            curatorTitle: true
          }
        },
        preferences: {
          select: {
            theme: true,
            accentColor: true,
            typographyMode: true,
            locale: true,
            timezone: true,
            defaultActivityFocus: true
          }
        }
      }
    }),
    db.moduleRegistry.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        key: true,
        name: true,
        description: true,
        icon: true,
        routePath: true,
        enabledByDefault: true,
        status: true,
        userSettings: {
          where: { userId: ownerId },
          select: {
            enabled: true,
            pinned: true
          }
        }
      }
    })
  ]);

  const preferences = mapPreference({
    profile: user?.profile ?? null,
    preferences: user?.preferences ?? null,
    legacyDefaultActivityFocus: defaultActivityFocus
  });
  const replayAlignedKey = getReplayAlignedModuleKey(preferences.defaultActivityFocus);

  return {
    preferences,
    modules: modules.map((module: (typeof modules)[number]) => mapModule({ ...module, replayAlignedKey }))
  };
}

export async function listEnabledModules() {
  const snapshot = await getSettingsSnapshot();
  const moduleRank = (module: SettingsSnapshot["modules"][number]) => {
    if (module.key === "dashboard") {
      return 0;
    }

    if (module.key === "activity") {
      return 1;
    }

    if (module.replayAligned) {
      return 2;
    }

    if (module.key === "modules") {
      return 98;
    }

    if (module.key === "settings") {
      return 99;
    }

    return 10;
  };

  return snapshot.modules
    .filter((module) => module.visibleInNavigation)
    .sort((left, right) => {
      const rankDiff = moduleRank(left) - moduleRank(right);
      if (rankDiff !== 0) {
        return rankDiff;
      }

      if (left.replayAligned !== right.replayAligned) {
        return left.replayAligned ? -1 : 1;
      }

      return left.name.localeCompare(right.name, "zh-CN");
    });
}

export async function updateUserPreferences(input: UserPreferenceSummary) {
  const db = getDb();
  const ownerId = await getCurrentUserId();

  await db.userProfile.upsert({
    where: { userId: ownerId },
    update: {
      displayName: input.displayName,
      curatorTitle: input.curatorTitle
    },
    create: {
      userId: ownerId,
      displayName: input.displayName,
      curatorTitle: input.curatorTitle
    }
  });

  await db.userPreference.upsert({
    where: { userId: ownerId },
    update: {
      theme: input.theme,
      accentColor: input.accentColor,
      typographyMode: input.typographyMode,
      locale: input.locale,
      timezone: input.timezone,
      defaultActivityFocus: input.defaultActivityFocus
    },
    create: {
      userId: ownerId,
      theme: input.theme,
      accentColor: input.accentColor,
      typographyMode: input.typographyMode,
      locale: input.locale,
      timezone: input.timezone,
      defaultActivityFocus: input.defaultActivityFocus
    }
  });
}

export async function setModuleEnabled(moduleKey: ModuleKey, enabled: boolean) {
  if (isLockedModule(moduleKey)) {
    return;
  }

  const db = getDb();
  const ownerId = await getCurrentUserId();
  const moduleRecord = await db.moduleRegistry.findUnique({
    where: { key: moduleKey },
    select: { id: true }
  });

  if (!moduleRecord) {
    throw new Error(`Unknown module key: ${moduleKey}`);
  }

  await db.userModuleSetting.upsert({
    where: {
      userId_moduleId: {
        userId: ownerId,
        moduleId: moduleRecord.id
      }
    },
    update: {
      enabled
    },
    create: {
      userId: ownerId,
      moduleId: moduleRecord.id,
      enabled,
      pinned: false
    }
  });
}

export async function getSystemPostureSnapshot(): Promise<SystemPostureSnapshot> {
  const [snapshot, activityReentry] = await Promise.all([getSettingsSnapshot(), getPreferredActivityReentry()]);
  const alignedModule = snapshot.modules.find((module) => module.replayAligned)
    ?? snapshot.modules.find((module) => module.key === "activity")
    ?? snapshot.modules[0];
  const visibleModuleCount = snapshot.modules.filter((module) => module.visibleInNavigation).length;
  const hiddenModuleCount = snapshot.modules.filter((module) => !module.visibleInNavigation).length;
  const lockedModuleCount = snapshot.modules.filter((module) => module.locked).length;

  return {
    currentLens: activityReentry.focus,
    currentLensLabel: activityReentry.label,
    defaultLens: activityReentry.defaultFocus,
    defaultLensLabel: getActivityFocusLabel(activityReentry.defaultFocus),
    alignedModuleKey: alignedModule.key,
    alignedModuleName: alignedModule.name,
    alignedModuleHref: alignedModule.href,
    visibleModuleCount,
    hiddenModuleCount,
    lockedModuleCount
  };
}
