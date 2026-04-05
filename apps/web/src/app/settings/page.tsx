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
  const [snapshot, activityReentry, postureSnapshot, rememberedWorkflow] = await Promise.all([
    getSettingsSnapshot(),
    getPreferredActivityReentry(),
    getSystemPostureSnapshot(),
    getRememberedWorkflowSummary()
  ]);
  const saved = resolvedSearchParams?.saved === "1";
  const updatedModule = resolveModuleFeedbackLabel(resolvedSearchParams?.updated, snapshot.modules);
  const error = resolvedSearchParams?.error === "preferences-save-failed" || resolvedSearchParams?.error === "module-update-failed" || resolvedSearchParams?.error === "unknown-module" ? resolvedSearchParams.error : "";
  const alignedWorkflowKey = isSearchModuleStackKey(postureSnapshot.alignedModuleKey) ? postureSnapshot.alignedModuleKey : null;
  const alignedWorkflowMeta = alignedWorkflowKey ? getSearchModuleStackMeta(alignedWorkflowKey) : null;

  return (
    <ShellLayout
      title="设置"
      description="在这里调整个人偏好、回放习惯与模块可见性，让工作站外壳按你的使用方式稳定响应。"
    >
      {saved ? (
        <section className="rounded-[1.5rem] bg-surface-container-low px-5 py-4 text-sm text-primary shadow-ambient">
          偏好已保存。
        </section>
      ) : null}
      {updatedModule ? (
        <section className="rounded-[1.5rem] bg-surface-container-low px-5 py-4 text-sm text-primary shadow-ambient">
          模块偏好已更新：{updatedModule}。
        </section>
      ) : null}
      {error ? (
        <section className="rounded-[1.5rem] bg-surface-container-low px-5 py-4 text-sm text-rose-600 shadow-ambient">
          {error === "preferences-save-failed" ? "偏好保存失败。" : "请求的设置变更无法应用。"}
        </section>
      ) : null}

      <SystemPostureSnapshotCard
        snapshot={postureSnapshot}
        title="修改前先查看当前工作站姿态"
        description="先确认当前回放视角、默认习惯和对齐模块，再决定要调整哪一层系统行为。"
        primaryHref={activityReentry.href}
        primaryLabel={`回到${activityReentry.label}视角`}
        secondaryHref="/modules"
        secondaryLabel="打开模块中心"
        hint={getActivityFocusPostureHint(postureSnapshot.defaultLens, "settings")}
      />

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">记忆工作流</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">
              {rememberedWorkflow.active ? `${rememberedWorkflow.title} 仍在影响系统姿态` : "当前系统姿态跟随回放习惯与实时上下文"}
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={rememberedWorkflow.href} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
              {rememberedWorkflow.active ? "打开工作流" : "打开指令台"}
            </Link>
            {rememberedWorkflow.active ? (
              <Link href={buildClearSearchModuleStackHref("/settings")} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                清除工作流
              </Link>
            ) : null}
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/70">
          {rememberedWorkflow.summary}{" "}
          {rememberedWorkflow.active
            ? "设置会继续保留这条通道的热度，因此即使你调整回放习惯或模块开关，也不会抹掉你刻意固定的工作流。"
            : "当前没有固定工作流时，系统会根据默认回放习惯和实时上下文动态调整。"}
        </p>
      </section>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">工作流覆盖</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">固定你希望壳层长期保持热度的工作流通道</h2>
          </div>
          {alignedWorkflowMeta ? (
            <Link href={buildSearchModuleStackHref(alignedWorkflowKey, "/settings")} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
              跟随 {alignedWorkflowMeta.title}
            </Link>
          ) : null}
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/70">
          如果你希望桌面持续围绕某条动作栈组织入口，就在这里固定它，而不是完全交给系统姿态自动推断。
        </p>
        {!rememberedWorkflow.active && alignedWorkflowMeta ? (
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Link href={buildSearchModuleStackHref(alignedWorkflowKey, "/settings")} className="rounded-full bg-white px-4 py-2 shadow-ambient">
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
                  <Link href={buildSearchModuleStackHref(stackKey, "/settings")} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-ambient">
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

      <SystemPostureNav
        title="在偏好控制、模块姿态和回放习惯之间切换"
        items={[
          {
            label: "回放习惯",
            href: "/settings#replay-habit",
            description: "调整默认回放视角，让系统入口从一开始就更偏向你的主要工作方式。"
          },
          {
            label: "模块中心",
            href: "/modules",
            description: "切到模块注册表，检查哪些模块会长期保留在壳层导航里。"
          },
          {
            label: "回到当前视角",
            href: activityReentry.href,
            description: "直接回到当前活动视角，确认这些设置会怎样影响工作站入口。"
          }
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ModuleCard
          title="个人偏好"
          description="这些设置决定壳层身份、排版方向、地区语言和默认回放视角。"
          eyebrow="偏好"
        >
          <form action={updateSettingsPreferencesAction} className="grid gap-4">
            <label className="grid gap-2 text-sm text-foreground/70">
              显示名称
              <input name="displayName" defaultValue={snapshot.preferences.displayName} className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none" />
            </label>
            <label className="grid gap-2 text-sm text-foreground/70">
              身份标题
              <input name="curatorTitle" defaultValue={snapshot.preferences.curatorTitle} className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-foreground/70">
                主题
                <select name="theme" defaultValue={snapshot.preferences.theme} className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none">
                  <option value="light">明亮</option>
                  <option value="mist">雾灰</option>
                  <option value="paper">纸感</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-foreground/70">
                强调色
                <select name="accentColor" defaultValue={snapshot.preferences.accentColor} className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none">
                  <option value="primary">主色</option>
                  <option value="forest">森林</option>
                  <option value="ember">余烬</option>
                </select>
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm text-foreground/70">
                排版
                <select name="typographyMode" defaultValue={snapshot.preferences.typographyMode} className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none">
                  <option value="serif-focus">专注衬线</option>
                  <option value="editorial">编辑风</option>
                  <option value="compact">紧凑</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-foreground/70">
                语言环境
                <input name="locale" defaultValue={snapshot.preferences.locale} className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none" />
              </label>
              <label className="grid gap-2 text-sm text-foreground/70">
                时区
                <input name="timezone" defaultValue={snapshot.preferences.timezone} className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none" />
              </label>
            </div>
            <label className="grid gap-2 text-sm text-foreground/70">
              默认回放视角
              <select name="defaultActivityFocus" defaultValue={snapshot.preferences.defaultActivityFocus} className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none">
                <option value="all">全部动态</option>
                <option value="planner">执行</option>
                <option value="knowledge">思考</option>
                <option value="writing">写作</option>
                <option value="archive">历史</option>
              </select>
            </label>
            <button type="submit" className="inline-flex w-fit rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white">
              保存偏好
            </button>
          </form>
        </ModuleCard>

        <ModuleCard
          title="系统边界"
          description="首页、模块中心和设置属于锁定基础设施。其余模块可以按用户偏好显隐，而不会改动业务数据。"
          eyebrow="系统"
        >
          <div className="space-y-4 text-sm leading-6 text-foreground/70">
            <div className="rounded-[1.5rem] bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">可见模块</p>
              <p className="mt-2">当前导航中保留了 {snapshot.modules.filter((module) => module.visibleInNavigation).length} 个模块入口。</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">锁定基础设施</p>
              <p className="mt-2">首页、模块中心和设置始终可达，这样你无论怎么调整配置，都有恢复入口。</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">区域上下文</p>
              <p className="mt-2">{snapshot.preferences.locale} | {snapshot.preferences.timezone}</p>
            </div>
            <div id="replay-habit" className="rounded-[1.5rem] bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">回放习惯</p>
              <p className="mt-2">当前默认视角：{snapshot.preferences.defaultActivityFocus}</p>
              <p className="mt-2 text-xs text-foreground/55">这个默认值会在重新进入活动中心和系统入口时持续生效。</p>
            </div>
          </div>
        </ModuleCard>
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">模块偏好</p>
          <h2 className="mt-3 font-headline text-3xl text-foreground">逐个调整模块的可见性与状态</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.modules.map((module) => (
            <ModuleCard
              key={module.key}
              title={module.name}
              description={module.description}
              href={module.enabled ? module.href : undefined}
              eyebrow={module.locked ? "锁定模块" : module.enabled ? "已启用" : "已从壳层隐藏"}
            >
              <div className="flex items-center justify-between gap-4 text-sm text-foreground/60">
                <span>{module.replayAligned ? "已与回放习惯对齐" : module.pinned ? "已固定在壳层中" : "当前可在注册表中启用"}</span>
                {module.locked ? (
                  <span className="rounded-full bg-white/80 px-3 py-2 font-semibold text-primary">锁定</span>
                ) : (
                  <form action={toggleModuleEnabledAction}>
                    <input type="hidden" name="moduleKey" value={module.key} />
                    <input type="hidden" name="enabled" value={module.enabled ? "0" : "1"} />
                    <input type="hidden" name="returnTo" value="/settings" />
                    <button type="submit" className="rounded-full bg-white px-4 py-2 font-semibold text-primary shadow-ambient">
                      {module.enabled ? "隐藏" : "启用"}
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
