import type { Route } from "next";

import { listEnabledModules } from "@/server/settings/service";

export async function getNavigationItems(): Promise<Array<{ href: Route; label: string; replayAligned: boolean }>> {
  const modules = await listEnabledModules();

  return modules.map((module) => ({
    href: module.href as Route,
    label: module.name,
    replayAligned: module.replayAligned
  }));
}
