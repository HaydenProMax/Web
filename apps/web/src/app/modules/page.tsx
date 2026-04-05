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
    return "打开执行回放";
  }

  if (moduleKey === "knowledge") {
    return "打开思考回放";
  }

  if (moduleKey === "writing") {
    return "打开写作回放";
  }

  if (moduleKey === "archive") {
    return "打开历史回放";
  }

  if (moduleKey === "activity") {
    return "打开默认回放";
  }

  return "打开回放上下文";
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
  const [snapshot, activityReentry, postureSnapshot, rememberedWorkflow] = await Promise.all([
    getSettingsSnapshot(),
    getPreferredActivityReentry(),
    getSystemPostureSnapshot(),
    getRememberedWorkflowSummary()
  ]);
  const updatedModule = resolveModuleFeedbackLabel(resolvedSearchParams?.updated, snapshot.modules);
  const error = resolvedSearchParams?.error === "module-update-failed" || resolvedSearchParams?.error === "unknown-module" ? resolvedSearchParams.error : "";
  const alignedWorkflowKey = isSearchModuleStackKey(postureSnapshot.alignedModuleKey) ? postureSnapshot.alignedModuleKey : null;
  const alignedWorkflowMeta = alignedWorkflowKey ? getSearchModuleStackMeta(alignedWorkflowKey) : null;

  return (
    <ShellLayout
      title="模块中心"
      description="这里管理模块启用状态、回放契合度，以及工作站壳层的长期组织方式。"
    >
      {updatedModule ? (
        <section className="rounded-[1.5rem] bg-surface-container-low px-5 py-4 text-sm text-primary shadow-ambient">
          模块偏好已更新：{updatedModule}。
        </section>
      ) : null}
      {error ? (
        <section className="rounded-[1.5rem] bg-surface-container-low px-5 py-4 text-sm text-rose-600 shadow-ambient">
          请求的模块变更无法应用。
        </section>
      ) : null}

      <SystemPostureSnapshotCard
        snapshot={postureSnapshot}
        title="先查看当前系统姿态如何影响模块注册表"
        description="先确认当前回放视角、默认习惯、对齐模块与可见模块，再决定模块层要怎么收束。"
        primaryHref={activityReentry.href}
        primaryLabel={`回到${activityReentry.label}视角`}
        secondaryHref="/settings#replay-habit"
        secondaryLabel="调整回放习惯"
        hint={getActivityFocusPostureHint(postureSnapshot.defaultLens, "modules")}
      />

      <SystemPostureNav
        title="在注册表控制、回放习惯和当前视角之间切换"
        items={[
          {
            label: "回放习惯",
            href: "/settings#replay-habit",
            description: "回到设置页，调整默认回放习惯和系统偏好。"
          },
          {
            label: "当前视角",
            href: activityReentry.href,
            description: "返回当前活动视角，确认模块层变化会如何影响回放入口。"
          },
          {
            label: "默认视角",
            href: buildActivityHref(activityReentry.defaultFocus),
            description: "按默认回放习惯重新进入活动中心。"
          }
        ]}
      />

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">记忆工作流</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">
              {rememberedWorkflow.active ? `${rememberedWorkflow.title} 仍在影响模块注册表` : "当前模块层仍由回放习惯和系统姿态共同驱动"}
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={rememberedWorkflow.href} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
              {rememberedWorkflow.active ? "打开工作流" : "打开指令台"}
            </Link>
            {rememberedWorkflow.active ? (
              <Link href={buildClearSearchModuleStackHref("/modules")} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                清除工作流
              </Link>
            ) : null}
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/70">
          {rememberedWorkflow.summary}{" "}
          {rememberedWorkflow.active
            ? "模块中心会继续保留这条工作流的优先级，因此模块的启用和排序不会抹掉你刻意固定的入口。"
            : "当前没有固定工作流时，模块中心会更多依赖系统姿态与默认回放习惯来组织入口。"}
        </p>
      </section>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">工作流覆盖</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">固定你希望模块层长期保持热度的工作流通道</h2>
          </div>
          {alignedWorkflowMeta ? (
            <Link href={buildSearchModuleStackHref(alignedWorkflowKey, "/modules")} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
              跟随 {alignedWorkflowMeta.title}
            </Link>
          ) : null}
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/70">
          如果你希望模块层持续围绕某条动作栈组织入口，就在这里固定它，而不是完全交给系统姿态自动推断。
        </p>
        {!rememberedWorkflow.active && alignedWorkflowMeta ? (
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Link href={buildSearchModuleStackHref(alignedWorkflowKey, "/modules")} className="rounded-full bg-white px-4 py-2 shadow-ambient">
              建议固定 {alignedWorkflowMeta.title}
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
                  {isRemembered ? <span className="rounded-full bg-primary px-2 py-1 text-white">已固定</span> : null}
                  {isAligned ? <span className="rounded-full bg-primary-container px-2 py-1 text-primary">已对齐</span> : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-foreground/70">{stack.summary}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={buildSearchModuleStackHref(stackKey, "/modules")} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-ambient">
                    {isRemembered ? "保持固定" : "固定工作流"}
                  </Link>
                  <Link href={stack.href} className="rounded-full bg-surface-container-low px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient">
                    打开动作栈
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">模块回放习惯</p>
        <h2 className="mt-3 font-headline text-3xl text-foreground">默认回到{activityReentry.defaultLabel}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-foreground/70">模块中心会沿用当前默认回放习惯，把你带回最合适的活动中心视角。</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={activityReentry.href} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
            回到{activityReentry.label}视角
          </Link>
          <Link href={buildActivityHref(activityReentry.defaultFocus)} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
            打开默认{getActivityFocusLabel(activityReentry.defaultFocus)}视角
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
              eyebrow={module.locked ? "锁定模块" : module.enabled ? "已在壳层启用" : "可选模块"}
            >
              <div className="space-y-4 text-sm text-foreground/65">
                <div className="flex items-center justify-between rounded-[1.5rem] bg-white/80 px-4 py-3">
                  <span>状态</span>
                  <span className="font-semibold text-primary">{module.enabled ? "启用" : "隐藏"}</span>
                </div>
                <div className="flex items-center justify-between rounded-[1.5rem] bg-white/80 px-4 py-3">
                  <span>默认启用</span>
                  <span className="font-semibold text-primary">{module.enabledByDefault ? "是" : "否"}</span>
                </div>
                <div className="flex items-center justify-between rounded-[1.5rem] bg-white/80 px-4 py-3">
                  <span>回放契合度</span>
                  <span className="font-semibold text-primary">
                    {rememberedWorkflow.active && module.key === rememberedWorkflow.key ? "匹配记忆工作流" : module.replayAligned ? "匹配当前回放习惯" : "一般"}
                  </span>
                </div>
                <Link href={moduleReplayHref(module.key, activityReentry.defaultFocus)} className="block rounded-[1.5rem] bg-white/80 px-4 py-3 font-semibold text-primary shadow-ambient">
                  {moduleReplayLabel(module.key, activityReentry.defaultFocus)}
                </Link>
                {stackModule ? (
                  <Link href={buildSearchModuleStackHref(module.key, "/modules")} className="block rounded-[1.5rem] bg-white/80 px-4 py-3 font-semibold text-primary shadow-ambient">
                    {isRemembered ? `保持 ${stackModule.title}` : `固定 ${stackModule.title}`}
                  </Link>
                ) : null}
                {module.locked ? (
                  <div className="rounded-[1.5rem] bg-white/80 px-4 py-3 font-semibold text-primary">
                    该模块属于锁定基础设施，始终保留在工作站壳层中。
                  </div>
                ) : (
                  <form action={toggleModuleEnabledAction}>
                    <input type="hidden" name="moduleKey" value={module.key} />
                    <input type="hidden" name="enabled" value={module.enabled ? "0" : "1"} />
                    <input type="hidden" name="returnTo" value="/modules" />
                    <button type="submit" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white">
                      {module.enabled ? "隐藏模块" : "启用模块"}
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
