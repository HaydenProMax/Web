export const dynamic = "force-dynamic";

import Link from "next/link";

import type { SettingsSnapshot } from "@workspace/types/index";

import { ModuleCard } from "@/components/shell/module-card";
import { SystemPostureNav } from "@/components/shell/system-posture-nav";
import { SystemPostureSnapshotCard } from "@/components/shell/system-posture-snapshot";
import { toggleModuleEnabledAction, updateSettingsPreferencesAction } from "@/app/settings/actions";
import { ShellLayout } from "@/components/shell/shell-layout";
import { getPreferredActivityReentry } from "@/server/activity/preferences";
import { getActivityFocusPostureHint } from "@/lib/activity-focus";
import { buildClearSearchModuleStackHref, buildSearchModuleStackHref, getSearchModuleStackMeta, isSearchModuleStackKey, SEARCH_MODULE_STACK_KEYS } from "@/lib/search-module-stack";
import { getRememberedWorkflowSummary } from "@/server/search/preferences";
import { getSettingsSnapshot, getSystemPostureSnapshot } from "@/server/settings/service";

function resolveModuleFeedbackLabel(value: string | undefined, modules: SettingsSnapshot["modules"]) {
  if (!value) {
    return "";
  }

  return modules.find((module) => module.key === value)?.name ?? "";
}

export default async function SettingsPage({
  searchParams
}: {
  searchParams?: Promise<{ saved?: string; updated?: string; error?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [snapshot, activityReentry, postureSnapshot, rememberedWorkflow] = await Promise.all([getSettingsSnapshot(), getPreferredActivityReentry(), getSystemPostureSnapshot(), getRememberedWorkflowSummary()]);
  const saved = resolvedSearchParams?.saved === "1";
  const updatedModule = resolveModuleFeedbackLabel(resolvedSearchParams?.updated, snapshot.modules);
  const error = resolvedSearchParams?.error === "preferences-save-failed" || resolvedSearchParams?.error === "module-update-failed" || resolvedSearchParams?.error === "unknown-module" ? resolvedSearchParams.error : "";
  const alignedWorkflowKey = isSearchModuleStackKey(postureSnapshot.alignedModuleKey) ? postureSnapshot.alignedModuleKey : null;
  const alignedWorkflowMeta = alignedWorkflowKey ? getSearchModuleStackMeta(alignedWorkflowKey) : null;

  return (
    <ShellLayout
      title="Settings"
      description="Personal preferences and module visibility."
    >
      {saved ? (
        <section className="rounded-[1.5rem] bg-surface-container-low px-5 py-4 text-sm text-primary shadow-ambient">
          Preferences saved.
        </section>
      ) : null}
      {updatedModule ? (
        <section className="rounded-[1.5rem] bg-surface-container-low px-5 py-4 text-sm text-primary shadow-ambient">
          Module preference updated for {updatedModule}.
        </section>
      ) : null}
      {error ? (
        <section className="rounded-[1.5rem] bg-surface-container-low px-5 py-4 text-sm text-rose-600 shadow-ambient">
          {error === "preferences-save-failed" ? "Preferences could not be saved." : "The requested settings change could not be applied."}
        </section>
      ) : null}

      <SystemPostureSnapshotCard
        snapshot={postureSnapshot}
        title="Current focus"
        description="Your saved focus and active module."
        primaryHref={activityReentry.href}
        primaryLabel={`Resume ${activityReentry.label} Lens`}
        secondaryHref="/modules"
        secondaryLabel="Open Modules"
        hint={getActivityFocusPostureHint(postureSnapshot.defaultLens, "settings")}
      />

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Pinned Focus</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">{rememberedWorkflow.active ? rememberedWorkflow.title : "No pinned focus"}</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={rememberedWorkflow.href} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
              {rememberedWorkflow.active ? "Open Focus" : "Open Search"}
            </Link>
            {rememberedWorkflow.active ? (
              <Link href={buildClearSearchModuleStackHref("/settings")} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                Clear Workflow
              </Link>
            ) : null}
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/70">{rememberedWorkflow.summary}</p>
      </section>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Pinned Stack</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">Choose a stack to pin</h2>
          </div>
          {alignedWorkflowMeta ? (
            <Link href={buildSearchModuleStackHref(alignedWorkflowKey!, "/settings")} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
              Follow {alignedWorkflowMeta.title}
            </Link>
          ) : null}
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/70">Pick the stack you want to keep on top.</p>
        {!rememberedWorkflow.active && alignedWorkflowMeta ? (
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Link href={buildSearchModuleStackHref(alignedWorkflowKey!, "/settings")} className="rounded-full bg-white px-4 py-2 shadow-ambient">
              Suggest {alignedWorkflowMeta.title}
            </Link>
          </div>
        ) : null}
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SEARCH_MODULE_STACK_KEYS.map((stackKey) => {
            const stack = getSearchModuleStackMeta(stackKey);
            const isRemembered = stackKey === rememberedWorkflow.key;
            const isAligned = stackKey === alignedWorkflowKey;

            return (
              <div key={stackKey} className="rounded-[1.5rem] bg-white/80 p-4 shadow-ambient">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  <span>{stack.title}</span>
                  {isRemembered ? <span className="rounded-full bg-primary px-2 py-1 text-white">Pinned</span> : null}
                  {isAligned ? <span className="rounded-full bg-primary-container px-2 py-1 text-primary">Aligned</span> : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-foreground/70">{stack.summary}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={buildSearchModuleStackHref(stackKey, "/settings")} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-ambient">
                    {isRemembered ? "Keep pinned" : "Pin workflow"}
                  </Link>
                  <Link href={stack.href} className="rounded-full bg-surface-container-low px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient">
                    Open stack
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <SystemPostureNav
        title="Jump to related pages"
        items={[
          {
            label: "Default Focus",
            href: "/settings#replay-habit",
            description: "Change your default focus."
          },
          {
            label: "Modules",
            href: "/modules",
            description: "Show or hide modules."
          },
          {
            label: "Current Focus",
            href: activityReentry.href,
            description: "Open the current activity view."
          }
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ModuleCard
          title="Profile & Appearance"
          description="Name, theme, typography, locale, and time settings."
          eyebrow="User"
        >
          <form action={updateSettingsPreferencesAction} className="grid gap-4">
            <label className="grid gap-2 text-sm text-foreground/70">
              Display Name
              <input name="displayName" defaultValue={snapshot.preferences.displayName} className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-foreground/70">
                Theme
                <select name="theme" defaultValue={snapshot.preferences.theme} className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none">
                  <option value="light">Light</option>
                  <option value="mist">Mist</option>
                  <option value="paper">Paper</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-foreground/70">
                Accent
                <select name="accentColor" defaultValue={snapshot.preferences.accentColor} className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none">
                  <option value="primary">Garden Gold</option>
                  <option value="forest">Forest</option>
                  <option value="ember">Ember</option>
                </select>
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm text-foreground/70">
                Typography
                <select name="typographyMode" defaultValue={snapshot.preferences.typographyMode} className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none">
                  <option value="serif-focus">Serif Focus</option>
                  <option value="editorial">Editorial</option>
                  <option value="compact">Compact</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-foreground/70">
                Locale
                <input name="locale" defaultValue={snapshot.preferences.locale} className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none" />
              </label>
              <label className="grid gap-2 text-sm text-foreground/70">
                Timezone
                <input name="timezone" defaultValue={snapshot.preferences.timezone} className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none" />
              </label>
            </div>
            <label className="grid gap-2 text-sm text-foreground/70">
              Default Replay Lens
              <select name="defaultActivityFocus" defaultValue={snapshot.preferences.defaultActivityFocus} className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none">
                <option value="all">All Motion</option>
                <option value="planner">Execution</option>
                <option value="knowledge">Thinking</option>
                <option value="writing">Publishing</option>
                <option value="archive">History</option>
              </select>
            </label>
            <button type="submit" className="inline-flex w-fit rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white">
              Save Preferences
            </button>
          </form>
        </ModuleCard>

        <ModuleCard
          title="System Posture"
          description="Core pages stay available. Other modules can be shown or hidden."
          eyebrow="System"
        >
          <div className="space-y-4 text-sm leading-6 text-foreground/70">
            <div className="rounded-[1.5rem] bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Navigation</p>
              <p className="mt-2">Visible modules: {snapshot.modules.filter((module) => module.visibleInNavigation).length}</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Locked Modules</p>
              <p className="mt-2">Dashboard, Modules, and Settings always stay available.</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Current Locale</p>
              <p className="mt-2">{snapshot.preferences.locale} | {snapshot.preferences.timezone}</p>
            </div>
            <div id="replay-habit" className="rounded-[1.5rem] bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Replay Habit</p>
              <p className="mt-2">Default lens: {snapshot.preferences.defaultActivityFocus}</p>
              <p className="mt-2 text-xs text-foreground/55">This affects default entry points.</p>
            </div>
          </div>
        </ModuleCard>
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Module Preferences</p>
          <h2 className="mt-3 font-headline text-3xl text-foreground">Module visibility</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.modules.map((module) => (
            <ModuleCard
              key={module.key}
              title={module.name}
              description={module.description}
              href={module.enabled ? module.href : undefined}
              eyebrow={module.locked ? "Locked" : module.enabled ? "Enabled" : "Hidden from shell"}
            >
              <div className="flex items-center justify-between gap-4 text-sm text-foreground/60">
                <span>{module.replayAligned ? "Aligned with replay habit" : module.pinned ? "Pinned in shell" : "Available in registry"}</span>
                {module.locked ? (
                  <span className="rounded-full bg-white/80 px-3 py-2 font-semibold text-primary">Always on</span>
                ) : (
                  <form action={toggleModuleEnabledAction}>
                    <input type="hidden" name="moduleKey" value={module.key} />
                    <input type="hidden" name="enabled" value={module.enabled ? "0" : "1"} />
                    <input type="hidden" name="returnTo" value="/settings" />
                    <button type="submit" className="rounded-full bg-white px-4 py-2 font-semibold text-primary shadow-ambient">
                      {module.enabled ? "Disable" : "Enable"}
                    </button>
                  </form>
                )}
              </div>
            </ModuleCard>
          ))}
        </div>
      </section>
    </ShellLayout>
  );
}



