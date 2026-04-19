import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");

if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^"|"$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const requireFromWeb = createRequire(new URL("../apps/web/package.json", import.meta.url));
const { PrismaClient } = requireFromWeb("@prisma/client");

const moduleRegistrySeed = [
  {
    key: "dashboard",
    name: "Dashboard",
    description: "A shared overview of your current rhythm and recent activity.",
    icon: "dashboard",
    routePath: "/",
    enabledByDefault: true,
    status: "ACTIVE",
    sortOrder: 0
  },
  {
    key: "activity",
    name: "Activity Hub",
    description: "A replay surface for recent motion, linked work threads, and archive history.",
    icon: "timeline",
    routePath: "/activity",
    enabledByDefault: true,
    status: "ACTIVE",
    sortOrder: 1
  },
  {
    key: "planner",
    name: "Planner",
    description: "Calendars, tasks, reminders, and daily planning workflows.",
    icon: "calendar_today",
    routePath: "/planner",
    enabledByDefault: true,
    status: "ACTIVE",
    sortOrder: 2
  },
  {
    key: "checkin",
    name: "Check-in",
    description: "Daily habits, streaks, and lightweight personal consistency tracking.",
    icon: "wb_sunny",
    routePath: "/check-in",
    enabledByDefault: true,
    status: "ACTIVE",
    sortOrder: 3
  },
  {
    key: "knowledge",
    name: "Knowledge",
    description: "Notes, domains, tags, and connected knowledge structures.",
    icon: "auto_stories",
    routePath: "/knowledge",
    enabledByDefault: true,
    status: "ACTIVE",
    sortOrder: 4
  },
  {
    key: "writing",
    name: "Writing",
    description: "Rich-media drafts and published posts with images and video.",
    icon: "edit_note",
    routePath: "/writing",
    enabledByDefault: true,
    status: "ACTIVE",
    sortOrder: 5
  },
  {
    key: "archive",
    name: "Archive",
    description: "Favorites, historical records, and saved resources.",
    icon: "inventory_2",
    routePath: "/archive",
    enabledByDefault: true,
    status: "ACTIVE",
    sortOrder: 6
  },
  {
    key: "modules",
    name: "Modules",
    description: "Registry and control surface for workstation capabilities.",
    icon: "widgets",
    routePath: "/modules",
    enabledByDefault: true,
    status: "ACTIVE",
    sortOrder: 7
  },
  {
    key: "settings",
    name: "Settings",
    description: "Profile, appearance, privacy, and module preferences.",
    icon: "settings",
    routePath: "/settings",
    enabledByDefault: true,
    status: "ACTIVE",
    sortOrder: 8
  }
];

const defaultUserId = process.env.DEFAULT_USER_ID ?? "seed-user-id";
const defaultUserEmail = process.env.DEFAULT_USER_EMAIL ?? "hayden@example.com";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: defaultUserEmail },
    update: {
      name: "Hayden"
    },
    create: {
      id: defaultUserId,
      email: defaultUserEmail,
      name: "Hayden"
    }
  });

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {
      displayName: "Hayden",
      curatorTitle: "The Curator"
    },
    create: {
      userId: user.id,
      displayName: "Hayden",
      curatorTitle: "The Curator"
    }
  });

  await prisma.userPreference.upsert({
    where: { userId: user.id },
    update: {
      theme: "light",
      accentColor: "primary",
      typographyMode: "serif-focus",
      locale: "zh-CN",
      timezone: process.env.TZ ?? "Asia/Shanghai"
    },
    create: {
      userId: user.id,
      theme: "light",
      accentColor: "primary",
      typographyMode: "serif-focus",
      locale: "zh-CN",
      timezone: process.env.TZ ?? "Asia/Shanghai"
    }
  });

  for (const moduleEntry of moduleRegistrySeed) {
    const moduleRecord = await prisma.moduleRegistry.upsert({
      where: { key: moduleEntry.key },
      update: moduleEntry,
      create: moduleEntry
    });

    await prisma.userModuleSetting.upsert({
      where: {
        userId_moduleId: {
          userId: user.id,
          moduleId: moduleRecord.id
        }
      },
      update: {
        enabled: moduleEntry.enabledByDefault,
        pinned: moduleEntry.key === "dashboard"
      },
      create: {
        userId: user.id,
        moduleId: moduleRecord.id,
        enabled: moduleEntry.enabledByDefault,
        pinned: moduleEntry.key === "dashboard"
      }
    });
  }

  console.log(`Seed complete for user ${user.email} with ${moduleRegistrySeed.length} modules.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
