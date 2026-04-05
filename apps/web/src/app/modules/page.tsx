export const dynamic = "force-dynamic";

import Link from "next/link";

import type { SettingsSnapshot } from "@workspace/types/index";

import { toggleModuleEnabledAction } from "@/app/settings/actions";
import { ModuleCard } from "@/components/shell/module-card";
import { SystemPostureNav } from "@/components/shell/system-posture-nav";
import { SystemPostureSnapshotCard } from "@/components/shell/system-posture-snapshot";
import { ShellLayout } from "@/components/shell/shell-layout";
import { buildActivityHref, getActivityFocusLabel, getActivityFocusPostureHint } from "@/lib/activity-focus";
import { buildClearSearchModuleStackHref, buildSearchModuleStackHref, getSearchModuleStackMeta, isSearchModuleStackKey, SEARCH_MODULE_STACK_KEYS } from "@/lib/search-module-stack";
import { getPreferredActivityReentry } from "@/server/activity/preferences";
import { getRememberedWorkflowSummary } from "@/server/search/preferences";
import { getSettingsSnapshot, getSystemPostureSnapshot } from "@/server/settings/service";

function moduleReplayHref(moduleKey: string, defaultFocus: "all" | "planner" | "knowledge" | "writing" | "archive") {
  if (moduleKey === "planner") {
    return buildActivityHref("planner", "#recent-activity");
  }

  if (moduleKey === "knowledge") {
    return buildActivityHref("knowledge", "#recent-activity");
  }

  if (moduleKey === "writing") {
    return buildActivityHref("writing", "#recent-activity");
  }

  if (moduleKey === "archive") {
    return buildActivityHref("archive", "#history-timeline");
  }

  if (moduleKey === "activity") {
    return buildActivityHref(defaultFocus);
  }

  return buildActivityHref(defaultFocus);
}

function moduleReplayLabel(moduleKey: string, defaultFocus: "all" | "planner" | "knowledge" | "writing" | "archive") {
  if (moduleKey === "planner") {
    return "Open execution replay";
  }

  if (moduleKey === "knowledge") {
    return "Open thinking replay";
  }

  if (moduleKey === "writing") {
    return "Open publishing replay";
  }

  if (moduleKey === "archive") {
    return "Open history replay";
  }

  if (moduleKey === "activity") {
    return "Open preferred replay";
  }

  return "Open replay context";
}

function resolveModuleFeedbackLabel(value: string | undefined, modules: SettingsSnapshot["modules"]) {
  if (!value) {
    return "";
  }

  return modules.find((module) => module.key === value)?.name ?? "";
}

export default async function ModulesPage({
  searchParams
}: {
  searchParams?: Promise<{ updated?: string; error?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [snapshot, activityReentry, postureSnapshot, rememberedWorkflow] = await Promise.all([getSettingsSnapshot(), getPreferredActivityReentry(), getSystemPostureSnapshot(), getRememberedWorkflowSummary()]);
  const updatedModule = resolveModuleFeedbackLabel(resolvedSearchParams?.updated, snapshot.modules);
  const error = resolvedSearchParams?.error === "module-update-failed" || resolvedSearchParams?.error === "unknown-module" ? resolvedSearchParams.error : "";
  const alignedWorkflowKey = isSearchModuleStackKey(postureSnapshot.alignedModuleKey) ? postureSnapshot.alignedModuleKey : null;
  const alignedWorkflowMeta = alignedWorkflowKey ? getSearchModuleStackMeta(alignedWorkflowKey) : null;

  return (
    <ShellLayout
      title="Modules"
      description="This registry now reflects live per-user module state, so enabling or hiding capabilities changes the shell without merging module logic together."
    >
      {updatedModule ? (
        <section className="rounded-[1.5rem] bg-surface-container-low px-5 py-4 text-sm text-primary shadow-ambient">
          Module preference updated for {updatedModule}.
        </section>
      ) : null}
      {error ? (
        <section className="rounded-[1.5rem] bg-surface-container-low px-5 py-4 text-sm text-rose-600 shadow-ambient">
          The requested module change could not be applied.
        </section>
      ) : null}

      <SystemPostureSnapshotCard
        snapshot={postureSnapshot}
        title="See how the registry fits the current workstation posture"
        description="The registry now sits on top of a live shell posture. This snapshot shows which replay mode is active, which module is naturally aligned with it, and how much of the shell is currently visible."
        primaryHref={activityReentry.href}
        primaryLabel={`Resume ${activityReentry.label} Lens`}
        secondaryHref="/settings#replay-habit"
        secondaryLabel="Adjust Replay Habit"
        hint={getActivityFocusPostureHint(postureSnapshot.defaultLens, "modules")}
      />

      <SystemPostureNav
        title="Move between registry control, replay habit, and active lens entry"
        items={[
          {
            label: "Replay Habit",
            href: "/settings#replay-habit",
            description: "Adjust the default lens that determines which modules feel most natural to re-enter."
          },
          {
            label: "Current Lens",
            href: activityReentry.href,
            description: "Return directly to the replay surface that is currently steering the workstation."
          },
          {
            label: "Default Lens",
            href: buildActivityHref(activityReentry.defaultFocus),
            description: "Jump into the baseline replay habit without changing module state."
          }
        ]}
      />

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Remembered Workflow</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">{rememberedWorkflow.active ? `${rememberedWorkflow.title} is still active in the registry` : "The registry is currently following replay habit and module posture"}</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={rememberedWorkflow.href} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
              {rememberedWorkflow.active ? "Open Workflow" : "Open Command Desk"}
            </Link>
            {rememberedWorkflow.active ? (
              <Link href={buildClearSearchModuleStackHref("/modules")} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                Clear Workflow
              </Link>
            ) : null}
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/70">{rememberedWorkflow.summary} {rememberedWorkflow.active ? "The registry keeps this workflow visible so module toggles can be evaluated against the lane you are actually trying to preserve." : "Until a workflow is pinned again, module emphasis will fall back to replay habit and aligned module posture."}</p>
      </section>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Workflow Override</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">Switch which module stack the registry should keep in front</h2>
          </div>
          {alignedWorkflowMeta ? (
            <Link href={buildSearchModuleStackHref(alignedWorkflowKey, "/modules")} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
              Follow {alignedWorkflowMeta.title}
            </Link>
          ) : null}
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/70">Use the registry to explicitly repin the stack you want the desk to favor. This lets you switch workflow memory without hunting through the command desk first.</p>
        {!rememberedWorkflow.active && alignedWorkflowMeta ? (
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Link href={buildSearchModuleStackHref(alignedWorkflowKey, "/modules")} className="rounded-full bg-white px-4 py-2 shadow-ambient">
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
                  <Link href={buildSearchModuleStackHref(stackKey, "/modules")} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-ambient">
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

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Module Replay Habit</p>
        <h2 className="mt-3 font-headline text-3xl text-foreground">Your current module posture follows {activityReentry.defaultLabel}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-foreground/70">Modules that match your default replay lens are highlighted as the most natural re-entry points. You can still jump directly into the replay surface from here without leaving the registry.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={activityReentry.href} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
            Resume {activityReentry.label} Lens
          </Link>
          <Link href={buildActivityHref(activityReentry.defaultFocus)} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
            Open Default {getActivityFocusLabel(activityReentry.defaultFocus)} Lens
          </Link>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {snapshot.modules.map((module) => {
          const stackModule = isSearchModuleStackKey(module.key) ? getSearchModuleStackMeta(module.key) : null;
          const isRemembered = stackModule ? module.key === rememberedWorkflow.key : false;

          return (
            <ModuleCard
              key={module.key}
              title={module.name}
              description={module.description}
              href={module.enabled ? module.href : undefined}
              eyebrow={module.locked ? "Locked" : module.enabled ? "Enabled in shell" : "Hidden from shell"}
            >
              <div className="space-y-4 text-sm text-foreground/65">
                <div className="flex items-center justify-between rounded-[1.5rem] bg-white/80 px-4 py-3">
                  <span>Status</span>
                  <span className="font-semibold text-primary">{module.enabled ? "Visible" : "Disabled"}</span>
                </div>
                <div className="flex items-center justify-between rounded-[1.5rem] bg-white/80 px-4 py-3">
                  <span>Registry default</span>
                  <span className="font-semibold text-primary">{module.enabledByDefault ? "Enabled" : "Optional"}</span>
                </div>
                <div className="flex items-center justify-between rounded-[1.5rem] bg-white/80 px-4 py-3">
                  <span>Replay fit</span>
                  <span className="font-semibold text-primary">{rememberedWorkflow.active && module.key === rememberedWorkflow.key ? "Matches remembered workflow" : module.replayAligned ? "Matches your default lens" : "Neutral"}</span>
                </div>
                <Link href={moduleReplayHref(module.key, activityReentry.defaultFocus)} className="block rounded-[1.5rem] bg-white/80 px-4 py-3 font-semibold text-primary shadow-ambient">
                  {moduleReplayLabel(module.key, activityReentry.defaultFocus)}
                </Link>
                {stackModule ? (
                  <Link href={buildSearchModuleStackHref(module.key, "/modules")} className="block rounded-[1.5rem] bg-white/80 px-4 py-3 font-semibold text-primary shadow-ambient">
                    {isRemembered ? `Keep ${stackModule.title}` : `Pin ${stackModule.title}`}
                  </Link>
                ) : null}
                {module.locked ? (
                  <div className="rounded-[1.5rem] bg-white/80 px-4 py-3 font-semibold text-primary">
                    Core infrastructure modules stay available so the shell can always be configured.
                  </div>
                ) : (
                  <form action={toggleModuleEnabledAction}>
                    <input type="hidden" name="moduleKey" value={module.key} />
                    <input type="hidden" name="enabled" value={module.enabled ? "0" : "1"} />
                    <input type="hidden" name="returnTo" value="/modules" />
                    <button type="submit" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white">
                      {module.enabled ? "Hide from shell" : "Enable in shell"}
                    </button>
                  </form>
                )}
              </div>
            </ModuleCard>
          );
        })}
      </div>
    </ShellLayout>
  );
}



