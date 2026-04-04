import type { ModuleManifest } from "@workspace/types/index";

export const moduleRegistry: ModuleManifest[] = [
  {
    key: "dashboard",
    name: "Dashboard",
    description: "A shared overview of your current rhythm and recent activity.",
    href: "/",
    icon: "dashboard",
    enabledByDefault: true
  },
  {
    key: "activity",
    name: "Activity Hub",
    description: "A replay surface for recent motion, linked work threads, and archive history.",
    href: "/activity",
    icon: "timeline",
    enabledByDefault: true
  },
  {
    key: "planner",
    name: "Planner",
    description: "Calendars, tasks, reminders, and daily planning workflows.",
    href: "/planner",
    icon: "calendar_today",
    enabledByDefault: true
  },
  {
    key: "knowledge",
    name: "Knowledge",
    description: "Notes, domains, tags, and connected knowledge structures.",
    href: "/knowledge",
    icon: "auto_stories",
    enabledByDefault: true
  },
  {
    key: "writing",
    name: "Writing",
    description: "Rich-media drafts and published posts with images and video.",
    href: "/writing",
    icon: "edit_note",
    enabledByDefault: true
  },
  {
    key: "archive",
    name: "Archive",
    description: "Favorites, historical records, and saved resources.",
    href: "/archive",
    icon: "inventory_2",
    enabledByDefault: true
  },
  {
    key: "modules",
    name: "Modules",
    description: "Registry and control surface for workstation capabilities.",
    href: "/modules",
    icon: "widgets",
    enabledByDefault: true
  },
  {
    key: "settings",
    name: "Settings",
    description: "Profile, appearance, privacy, and module preferences.",
    href: "/settings",
    icon: "settings",
    enabledByDefault: true
  }
];