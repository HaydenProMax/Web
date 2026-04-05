import Link from "next/link";

import { ModuleCard } from "@/components/shell/module-card";
import { ShellLayout } from "@/components/shell/shell-layout";
import { WorkspaceViewNav } from "@/components/shell/workspace-view-nav";
import { getPreferredActivityHref, getPreferredActivityReentry } from "@/server/activity/preferences";
import { getPlannerOverview, getPlannerPlanningView, listPlannerTasks } from "@/server/planner/service";

import { updatePlannerTaskStatusAction } from "./actions";

export const dynamic = "force-dynamic";

function taskMeta(task: { status: string; priority: string; scheduledFor?: string; dueAt?: string; completedAt?: string }) {
  if (task.status === "DONE") {
    return task.completedAt ? `已完成 ${new Date(task.completedAt).toLocaleString("zh-CN")}` : "任务已完成";
  }

  if (task.dueAt) {
    return `截止 ${new Date(task.dueAt).toLocaleString("zh-CN")}`;
  }

  if (task.scheduledFor) {
    return `计划于 ${new Date(task.scheduledFor).toLocaleString("zh-CN")}`;
  }

  return `${task.priority} 优先级`;
}

function nextAction(task: { id: string; status: string }) {
  if (task.status === "TODO") {
    return { label: "开始任务", status: "IN_PROGRESS" };
  }

  if (task.status === "IN_PROGRESS") {
    return { label: "标记完成", status: "DONE" };
  }

  if (task.status === "DONE") {
    return { label: "重新打开", status: "TODO" };
  }

  return null;
}

function workThreadSummary(task: { relatedNoteTitle?: string; relatedDraftTitle?: string; description: string }) {
  if (task.description) {
    return task.description;
  }

  if (task.relatedNoteTitle && task.relatedDraftTitle) {
    return `围绕笔记“${task.relatedNoteTitle}”与草稿“${task.relatedDraftTitle}”形成线程。`;
  }

  if (task.relatedNoteTitle) {
    return `线程锚定于笔记“${task.relatedNoteTitle}”形成线程。`;
  }

  if (task.relatedDraftTitle) {
    return `线程锚定于草稿“${task.relatedDraftTitle}”形成线程。`;
  }

  return "独立任务。";
}

function formatThreadTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatPlanningTime(value?: string) {
  if (!value) {
    return "尚未设定计划锚点";
  }

  return new Date(value).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function PlanningLane({
  eyebrow,
  title,
  description,
  tasks,
  emptyMessage
}: {
  eyebrow: string;
  title: string;
  description: string;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    scheduledFor?: string;
    dueAt?: string;
    relatedNoteSlug?: string;
    relatedNoteTitle?: string;
    relatedDraftId?: string;
    relatedDraftTitle?: string;
  }>;
  emptyMessage: string;
}) {
  return (
    <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
      <p className="text-xs uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h3 className="mt-3 font-headline text-2xl text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-foreground/70">{description}</p>
      <div className="mt-5 space-y-3">
        {tasks.length > 0 ? tasks.map((task) => (
          <div key={task.id} className="rounded-[1.25rem] bg-surface-container-low px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{task.title}</p>
                <p className="mt-1 text-xs text-foreground/55">{formatPlanningTime(task.scheduledFor ?? task.dueAt)}</p>
              </div>
              <span className="rounded-full bg-primary-container/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                {task.status}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-primary">
              <span className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-ambient">{task.priority}</span>
              {task.relatedNoteSlug && task.relatedNoteTitle ? (
                <Link href={`/knowledge/${task.relatedNoteSlug}`} className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-ambient">
                  笔记：{task.relatedNoteTitle}
                </Link>
              ) : null}
              {task.relatedDraftId && task.relatedDraftTitle ? (
                <Link href={`/writing/drafts/${task.relatedDraftId}`} className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-ambient">
                  草稿：{task.relatedDraftTitle}
                </Link>
              ) : null}
            </div>
          </div>
        )) : (
          <p className="rounded-[1.25rem] bg-surface-container-low px-4 py-3 text-sm leading-6 text-foreground/60">
            {emptyMessage}
          </p>
        )}
      </div>
    </article>
  );
}

export default async function 日程规划Page({
  searchParams
}: {
  searchParams?: Promise<{ created?: string; updated?: string; edited?: string; error?: string }>;
}) {
  const [overview, tasks, planningView, resolvedSearchParams, recentActivityHref, workThreadsHref, historyTimelineHref, activityReentry] = await Promise.all([
    getPlannerOverview(),
    listPlannerTasks(9),
    getPlannerPlanningView(4),
    searchParams ? searchParams : Promise.resolve(undefined),
    getPreferredActivityHref("#recent-activity"),
    getPreferredActivityHref("#work-threads"),
    getPreferredActivityHref("#history-timeline"),
    getPreferredActivityReentry()
  ]);

  const linkedTasks = tasks.filter((task) => task.relatedNoteTitle || task.relatedDraftTitle);
  const feedbackMessage =
    resolvedSearchParams?.created === "1"
      ? "任务创建成功，规划列表已更新。"
      : resolvedSearchParams?.edited === "1"
        ? "任务详情更新成功。"
        : resolvedSearchParams?.updated === "1"
          ? "任务状态更新成功。"
          : resolvedSearchParams?.error === "update-failed"
            ? "任务状态更新失败。"
            : resolvedSearchParams?.error === "missing-task"
              ? "日程规划 task is missing."
              : null;

  return (
    <ShellLayout
      title="日程规划"
      description="日程规划 now carries durable status, 优先级, scheduling data, and cross-module links back to the notes and drafts that generated the work."
    >
      <WorkspaceViewNav
        eyebrow="回放视图"
        title="在执行与回放之间切换"
        items={[
          {
            label: "工作线程",
            href: workThreadsHref,
            description: "回到已经关联笔记和草稿的执行线程。"
          },
          {
            label: "总览活动",
            href: recentActivityHref,
            description: "需要更大范围的上下文时，回到共享时间线。"
          },
          {
            label: "归档时间线",
            href: historyTimelineHref,
            description: "从执行层跳回更长期的归档记录。"
          }
        ]}
      />

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">回放上下文</p>
        <h2 className="mt-3 font-headline text-3xl text-foreground">日程规划可以回到 {activityReentry.label}</h2>
        <p className="mt-3 text-sm leading-6 text-foreground/70">执行层不必孤立存在。需要更广上下文时，可以直接回到当前回放视角。</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={activityReentry.nextStep.href} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
            {activityReentry.nextStep.label}
          </Link>
          <p className="text-sm leading-6 text-foreground/60">{activityReentry.nextStep.description}</p>
        </div>
      </section>

      {feedbackMessage ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          {feedbackMessage}
        </section>
      ) : null}

      <div className="flex items-center justify-end">
        <Link href="/planner/new" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
          新建任务
        </Link>
      </div>

      <section className="grid gap-6 lg:grid-cols-3 xl:grid-cols-4">
        <ModuleCard title="任务" description={`${overview.totalCount} 个规划任务正在追踪中。`} eyebrow="领域" />
        <ModuleCard title="待开始" description={`${overview.todoCount} 个任务等待开始。`} eyebrow="队列" />
        <ModuleCard title="进行中" description={`${overview.inProgressCount} 个任务正在推进。`} eyebrow="推进中" />
        <ModuleCard title="已完成" description={`${overview.doneCount} 个任务已经完成。`} eyebrow="历史" />
      </section>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">回放上下文</p>
        <h2 className="mt-3 font-headline text-3xl text-foreground">日程规划可以回到 {activityReentry.label}</h2>
        <p className="mt-3 text-sm leading-6 text-foreground/70">执行层不必孤立存在。需要更广上下文时，可以直接回到当前回放视角。</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={activityReentry.nextStep.href} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
            {activityReentry.nextStep.label}
          </Link>
          <p className="text-sm leading-6 text-foreground/60">{activityReentry.nextStep.description}</p>
        </div>
      </section>

      {feedbackMessage ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          {feedbackMessage}
        </section>
      ) : null}

      <div className="flex items-center justify-end">
        <Link href="/planner/new" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
          新建任务
        </Link>
      </div>

      <section className="grid gap-6 lg:grid-cols-3 xl:grid-cols-4">
        <ModuleCard title="任务" description={`${overview.totalCount} 个规划任务正在追踪中。`} eyebrow="领域" />
        <ModuleCard title="待开始" description={`${overview.todoCount} 个任务等待开始。`} eyebrow="队列" />
        <ModuleCard title="进行中" description={`${overview.inProgressCount} 个任务正在推进。`} eyebrow="推进中" />
        <ModuleCard title="已完成" description={`${overview.doneCount} 个任务已经完成。`} eyebrow="历史" />
      </section>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">规划视图</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">从今日、本周与逾期压力三个层面组织执行</h2>
          </div>
          <span className="text-sm text-foreground/50">{planningView.todayTasks.length + planningView.weekTasks.length + planningView.overdueTasks.length} 个计划锚点</span>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <PlanningLane
            eyebrow="今日"
            title="今日 pull"
            description="展示今天已排上或今天到期的任务，帮助你决定今天必须推进什么。"
            tasks={planningView.todayTasks}
            emptyMessage="今天还没有被明确锚定的任务。准备投入时，把一个活跃任务拉进今日分组。"
          />
          <PlanningLane
            eyebrow="本周"
            title="本周视野"
            description="已经进入近期待办、但不需要今天立即处理的工作。"
            tasks={planningView.weekTasks}
            emptyMessage="当前近期视野是空的。给任务补上计划时间，就能开始形成真实的周计划。"
          />
          <PlanningLane
            eyebrow="逾期"
            title="压力点"
            description="已经逾期的任务会继续可见，方便你主动重排或完成。"
            tasks={planningView.overdueTasks}
            emptyMessage="当前没有逾期压力点，计划仍然领先于时间。"
          />
        </div>
      </section>

      <section id="work-threads" className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">工作线程</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">按上游上下文组织的关联任务</h2>
          </div>
          <span className="text-sm text-foreground/50">{linkedTasks.length} 条关联线程</span>
        </div>

        {linkedTasks.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {linkedTasks.map((task) => (
              <article key={task.id} className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">{task.status} | {task.priority}</p>
                  <p className="text-xs text-foreground/50">{formatThreadTime(task.updatedAt)}</p>
                </div>
                <h3 className="mt-3 font-headline text-2xl text-foreground">{task.title}</h3>
                <p className="mt-3 text-sm leading-6 text-foreground/70">{workThreadSummary(task)}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs">
                  {task.relatedNoteTitle && task.relatedNoteSlug ? (
                    <Link href={`/knowledge/${task.relatedNoteSlug}`} className="rounded-full bg-surface-container-low px-3 py-1.5 font-semibold text-primary">
                      笔记：{task.relatedNoteTitle}
                    </Link>
                  ) : null}
                  {task.relatedDraftTitle && task.relatedDraftId ? (
                    <Link href={`/writing/drafts/${task.relatedDraftId}`} className="rounded-full bg-surface-container-low px-3 py-1.5 font-semibold text-primary">
                      草稿：{task.relatedDraftTitle}
                    </Link>
                  ) : null}
                </div>
                <Link href={`/planner/${task.id}/edit`} className="mt-4 inline-flex text-sm font-semibold text-primary">
                  打开线程任务
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.5rem] bg-white/80 p-4 text-sm text-foreground/60">
            当前还没有关联工作线程。从笔记或草稿创建任务后，规划模块才会成为真正的协同层。
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-3xl">最近任务</h2>
          <span className="text-sm text-foreground/50">显示 {tasks.length} / {overview.totalCount} 条任务记录</span>
        </div>

        {tasks.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => {
              const action = nextAction(task);

              return (
                <article key={task.id} className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
                  <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-primary">
                    <span>{task.status}</span>
                    <span>{task.priority}</span>
                  </div>
                  <h3 className="mt-3 font-headline text-2xl text-foreground">{task.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-foreground/70">{task.description || "暂无说明。"}</p>
                  <p className="mt-4 text-xs text-foreground/50">{taskMeta(task)}</p>
                  <p className="mt-2 text-xs text-foreground/50">更新于 {new Date(task.updatedAt).toLocaleString("zh-CN")}</p>

                  {task.relatedNoteTitle || task.relatedDraftTitle ? (
                    <div className="mt-4 flex flex-wrap gap-3 text-xs">
                      {task.relatedNoteTitle && task.relatedNoteSlug ? (
                        <Link href={`/knowledge/${task.relatedNoteSlug}`} className="rounded-full bg-white px-3 py-1.5 font-semibold text-primary shadow-ambient">
                          笔记：{task.relatedNoteTitle}
                        </Link>
                      ) : null}
                      {task.relatedDraftTitle && task.relatedDraftId ? (
                        <Link href={`/writing/drafts/${task.relatedDraftId}`} className="rounded-full bg-white px-3 py-1.5 font-semibold text-primary shadow-ambient">
                          草稿：{task.relatedDraftTitle}
                        </Link>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link href={`/planner/${task.id}/edit`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-ambient">
                      编辑任务
                    </Link>
                    {action ? (
                      <form action={updatePlannerTaskStatusAction}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="status" value={action.status} />
                        <button type="submit" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-ambient">
                          {action.label}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
            当前还没有规划任务。创建一个任务后，执行层才会开始成形。
          </div>
        )}
      </section>
    </ShellLayout>
  );
}



