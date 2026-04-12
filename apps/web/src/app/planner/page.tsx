import Link from "next/link";
import type { ReactNode } from "react";

import type { PlannerTaskSummary } from "@workspace/types/index";

import { ShellLayout } from "@/components/shell/shell-layout";
import { getPlannerOverview, getPlannerTodoView, listPlannerTasks } from "@/server/planner/service";

import {
  archivePlannerTaskFromListAction,
  createPlannerTaskAction,
  deleteArchivedPlannerTaskFromListAction,
  restorePlannerTaskFromListAction,
  updatePlannerTaskStatusAction
} from "./actions";

export const dynamic = "force-dynamic";

function formatTaskTimeLabel(task: PlannerTaskSummary) {
  if (task.status === "DONE") {
    return task.completedAt ? `Done ${new Date(task.completedAt).toLocaleString("zh-CN")}` : "Done";
  }

  if (task.dueAt && new Date(task.dueAt).getTime() < Date.now()) {
    return `Overdue - ${new Date(task.dueAt).toLocaleString("zh-CN")}`;
  }

  if (task.dueAt) {
    return `Due ${new Date(task.dueAt).toLocaleString("zh-CN")}`;
  }

  if (task.scheduledFor) {
    return `Planned ${new Date(task.scheduledFor).toLocaleString("zh-CN")}`;
  }

  return task.status === "IN_PROGRESS" ? "In progress" : "Ready today";
}

function statusChip(task: PlannerTaskSummary) {
  if (task.status === "DONE") {
    return "DONE";
  }

  if (task.status === "IN_PROGRESS") {
    return "DOING";
  }

  return "TODO";
}

function timeBadge(task: PlannerTaskSummary) {
  if (task.status === "DONE") {
    return { label: "Done", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  }

  if (task.dueAt && new Date(task.dueAt).getTime() < Date.now()) {
    return { label: "Overdue", className: "border-rose-200 bg-rose-50 text-rose-700" };
  }

  if (task.scheduledFor || task.dueAt) {
    return { label: "Today", className: "border-amber-200 bg-amber-50 text-amber-700" };
  }

  return { label: "No date", className: "border-slate-200 bg-slate-50 text-slate-600" };
}

function nextFlowAction(task: PlannerTaskSummary) {
  if (task.status === "TODO") {
    return { label: "Start", status: "IN_PROGRESS" };
  }

  if (task.status === "IN_PROGRESS") {
    return { label: "Pause", status: "TODO" };
  }

  if (task.status === "DONE") {
    return { label: "Reopen", status: "TODO" };
  }

  return null;
}

function TaskLinks({ task }: { task: PlannerTaskSummary }) {
  if (!task.relatedNoteTitle && !task.relatedDraftTitle) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2 text-xs text-primary">
      {task.relatedNoteTitle && task.relatedNoteSlug ? (
        <Link
          href={`/knowledge/${task.relatedNoteSlug}`}
          className="rounded-full border border-primary/10 bg-white px-3 py-1.5 font-semibold shadow-ambient transition-colors duration-200 hover:bg-primary/5"
        >
          Note: {task.relatedNoteTitle}
        </Link>
      ) : null}
      {task.relatedDraftTitle && task.relatedDraftId ? (
        <Link
          href={`/writing/drafts/${task.relatedDraftId}`}
          className="rounded-full border border-primary/10 bg-white px-3 py-1.5 font-semibold shadow-ambient transition-colors duration-200 hover:bg-primary/5"
        >
          Draft: {task.relatedDraftTitle}
        </Link>
      ) : null}
    </div>
  );
}

function ActiveTaskRow({ task }: { task: PlannerTaskSummary }) {
  const flowAction = nextFlowAction(task);
  const badge = timeBadge(task);

  return (
    <article className="rounded-[1.6rem] border border-white/70 bg-white/92 p-4 shadow-ambient transition-transform duration-200 hover:translate-y-[-1px]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-primary/15 bg-primary/5 px-2 text-[11px] font-semibold tracking-[0.18em] text-primary">
              {statusChip(task)}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${badge.className}`}>
              {badge.label}
            </span>
            <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
              {task.priority}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-[-0.01em] text-foreground">{task.title}</h3>
          {task.description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/70">{task.description}</p> : null}
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-foreground/45">{formatTaskTimeLabel(task)}</p>
          <TaskLinks task={task} />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:max-w-[22rem] lg:justify-end">
          <form action={updatePlannerTaskStatusAction}>
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="status" value="DONE" />
            <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-ambient transition-colors duration-200 hover:bg-primary/90">
              Done
            </button>
          </form>
          {flowAction ? (
            <form action={updatePlannerTaskStatusAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="status" value={flowAction.status} />
              <button type="submit" className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-primary/5">
                {flowAction.label}
              </button>
            </form>
          ) : null}
          <Link href={`/planner/${task.id}/edit`} className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-primary/5">
            Edit
          </Link>
          <form action={archivePlannerTaskFromListAction}>
            <input type="hidden" name="taskId" value={task.id} />
            <button type="submit" className="rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors duration-200 hover:bg-rose-100">
              Archive
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

function DoneTaskRow({ task }: { task: PlannerTaskSummary }) {
  return (
    <article className="rounded-[1.6rem] border border-white/65 bg-white/82 p-4 shadow-ambient">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              DONE
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-[-0.01em] text-foreground/75 line-through decoration-primary/30">{task.title}</h3>
          {task.description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/60">{task.description}</p> : null}
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-foreground/45">{formatTaskTimeLabel(task)}</p>
          <TaskLinks task={task} />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <form action={updatePlannerTaskStatusAction}>
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="status" value="TODO" />
            <button type="submit" className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-primary/5">
              Reopen
            </button>
          </form>
          <Link href={`/planner/${task.id}/edit`} className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-primary/5">
            Edit
          </Link>
        </div>
      </div>
    </article>
  );
}

function SectionCard({
  title,
  count,
  description,
  children
}: {
  title: string;
  count: number;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-primary/75">List</p>
          <h2 className="mt-2 font-headline text-3xl text-foreground">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/65">{description}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-foreground/55 shadow-ambient">{count}</span>
      </div>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white/88 p-5 shadow-ambient">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">{label}</p>
      <p className="mt-3 font-headline text-3xl text-foreground">{value}</p>
    </div>
  );
}

export default async function PlannerPage({
  searchParams
}: {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    edited?: string;
    deleted?: string;
    restored?: string;
    destroyed?: string;
    error?: string;
    view?: string;
    confirmDelete?: string;
  }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const archivedView = resolvedSearchParams?.view === "archived";

  const [overview, todoView, archivedTasks] = await Promise.all([
    getPlannerOverview(),
    archivedView ? Promise.resolve(null) : getPlannerTodoView(12),
    archivedView ? listPlannerTasks(50, { archived: true }) : Promise.resolve([])
  ]);

  const hasDeleteTargetQuery = archivedView && Boolean(resolvedSearchParams?.confirmDelete);
  const confirmDeleteTaskId = archivedView && archivedTasks.some((task) => task.id === resolvedSearchParams?.confirmDelete)
    ? resolvedSearchParams?.confirmDelete
    : undefined;
  const taskPendingDelete = confirmDeleteTaskId ? archivedTasks.find((task) => task.id === confirmDeleteTaskId) : undefined;
  const invalidDeleteTarget = hasDeleteTargetQuery && !taskPendingDelete;

  const feedbackMessage =
    resolvedSearchParams?.created === "1"
      ? "Task added."
      : resolvedSearchParams?.edited === "1"
        ? "Task updated."
        : resolvedSearchParams?.updated === "1"
          ? "Status updated."
          : resolvedSearchParams?.deleted === "1"
            ? "Task archived."
            : resolvedSearchParams?.restored === "1"
              ? "Task restored."
              : resolvedSearchParams?.destroyed === "1"
                ? "Archived task deleted."
                : resolvedSearchParams?.error === "update-failed"
                  ? "Status update failed."
                  : resolvedSearchParams?.error === "delete-failed"
                    ? "Archive failed."
                    : resolvedSearchParams?.error === "restore-failed"
                      ? "Restore failed."
                      : resolvedSearchParams?.error === "permanent-delete-failed"
                        ? "Delete failed."
                        : resolvedSearchParams?.error === "confirm-delete-required"
                          ? "Delete needs confirmation."
                          : invalidDeleteTarget
                            ? "That archived task no longer exists."
                            : resolvedSearchParams?.error === "missing-task"
                              ? "Task not found."
                              : null;

  if (archivedView) {
    return (
      <ShellLayout title="Planner" description="Archived tasks.">
        {feedbackMessage ? (
          <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
            {feedbackMessage}
          </section>
        ) : null}

        <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-primary/75">Archive</p>
              <h1 className="mt-2 font-headline text-4xl text-foreground">Stored for later</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/65">
                Keep inactive tasks out of the daily list without losing them.
              </p>
            </div>
            <Link href="/planner" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient transition-colors duration-200 hover:bg-primary/90">
              Back to planner
            </Link>
          </div>
        </section>

        {taskPendingDelete ? (
          <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-rose-700">Delete confirmation</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">Delete this archived task?</h2>
            <p className="mt-3 text-sm leading-6 text-foreground/70">
              <strong>{taskPendingDelete.title}</strong> will be removed permanently.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <form action={deleteArchivedPlannerTaskFromListAction}>
                <input type="hidden" name="taskId" value={taskPendingDelete.id} />
                <input type="hidden" name="confirmed" value="true" />
                <button type="submit" className="rounded-full bg-rose-700 px-5 py-3 text-sm font-semibold text-white shadow-ambient transition-colors duration-200 hover:bg-rose-800">
                  Delete forever
                </button>
              </form>
              <Link href="/planner?view=archived" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient transition-colors duration-200 hover:bg-primary/5">
                Cancel
              </Link>
            </div>
          </section>
        ) : null}

        {archivedTasks.length > 0 ? (
          <div className="space-y-3">
            {archivedTasks.map((task) => (
              <article key={task.id} className="rounded-[1.6rem] border border-white/70 bg-surface-container-low p-5 shadow-ambient">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">{task.title}</h3>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                        {task.priority}
                      </span>
                    </div>
                    {task.description ? <p className="mt-2 text-sm leading-6 text-foreground/70">{task.description}</p> : null}
                    <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-foreground/45">
                      Updated {new Date(task.updatedAt).toLocaleString("zh-CN")}
                    </p>
                    <TaskLinks task={task} />
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <form action={restorePlannerTaskFromListAction}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-ambient transition-colors duration-200 hover:bg-primary/90">
                        Restore
                      </button>
                    </form>
                    <Link href={`/planner/${task.id}/edit`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-ambient transition-colors duration-200 hover:bg-primary/5">
                      View
                    </Link>
                    <Link href={`/planner?view=archived&confirmDelete=${task.id}`} className="rounded-full bg-rose-700 px-4 py-2 text-sm font-semibold text-white shadow-ambient transition-colors duration-200 hover:bg-rose-800">
                      Delete
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
            No archived tasks yet.
          </div>
        )}
      </ShellLayout>
    );
  }

  const todayTasks = todoView?.todayTasks ?? [];
  const upcomingTasks = todoView?.upcomingTasks ?? [];
  const doneTasks = todoView?.doneTasks ?? [];

  return (
    <ShellLayout title="Planner" description="A lighter daily list.">
      {feedbackMessage ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          {feedbackMessage}
        </section>
      ) : null}

      <section className="rounded-[2.25rem] bg-surface-container-low p-6 shadow-ambient lg:p-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-primary/75">Daily todo</p>
          <h1 className="mt-4 font-headline text-4xl text-foreground sm:text-5xl">Move the right task, not every task</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-foreground/65 sm:text-base">
            Keep today visible, keep later work quiet, and keep finished tasks close enough to reopen.
          </p>
        </div>

        <div className="mx-auto mt-6 max-w-3xl rounded-[1.75rem] border border-white/70 bg-white/92 p-4 shadow-ambient">
          <form action={createPlannerTaskAction} className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              name="title"
              placeholder="Add a task for today"
              className="min-w-0 flex-1 rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none transition-colors duration-200 focus:border-primary/40"
            />
            <input type="hidden" name="description" value="" />
            <input type="hidden" name="priority" value="MEDIUM" />
            <input type="hidden" name="status" value="TODO" />
            <input type="hidden" name="scheduledFor" value="" />
            <input type="hidden" name="dueAt" value="" />
            <input type="hidden" name="relatedNoteSlug" value="" />
            <input type="hidden" name="relatedDraftId" value="" />
            <button type="submit" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-ambient transition-colors duration-200 hover:bg-primary/90">
              Add
            </button>
          </form>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-foreground/50">
            <span className="rounded-full bg-surface-container-low px-3 py-1">Quick add</span>
            <span className="rounded-full bg-surface-container-low px-3 py-1">One-line capture</span>
            <span className="rounded-full bg-surface-container-low px-3 py-1">Edit later if needed</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
          <Link href="/planner/new" className="rounded-full bg-white px-5 py-3 font-semibold text-primary shadow-ambient transition-colors duration-200 hover:bg-primary/5">
            Full editor
          </Link>
          <Link href="/planner?view=archived" className="rounded-full bg-white px-5 py-3 font-semibold text-primary shadow-ambient transition-colors duration-200 hover:bg-primary/5">
            Archive ({overview.archivedCount})
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Today" value={todayTasks.length} />
        <StatCard label="Upcoming" value={upcomingTasks.length} />
        <StatCard label="Doing" value={overview.inProgressCount} />
        <StatCard label="Done" value={overview.doneCount} />
      </section>

      <SectionCard title="Today" count={todayTasks.length} description="Unscheduled work, today's work, and overdue work stay in one place so nothing urgent slips out of sight.">
        {todayTasks.length > 0 ? (
          todayTasks.map((task) => <ActiveTaskRow key={task.id} task={task} />)
        ) : (
          <div className="rounded-[1.6rem] border border-white/70 bg-white/82 px-4 py-5 text-sm text-foreground/60 shadow-ambient">
            Nothing urgent right now. Add the next task when you are ready.
          </div>
        )}
      </SectionCard>

      <SectionCard title="Upcoming" count={upcomingTasks.length} description="Scheduled work stays visible without taking over today's attention.">
        {upcomingTasks.length > 0 ? (
          upcomingTasks.map((task) => <ActiveTaskRow key={task.id} task={task} />)
        ) : (
          <div className="rounded-[1.6rem] border border-white/70 bg-white/82 px-4 py-5 text-sm text-foreground/60 shadow-ambient">
            No upcoming tasks yet.
          </div>
        )}
      </SectionCard>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <details>
          <summary className="flex cursor-pointer list-none flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-primary/75">List</p>
              <h2 className="mt-2 font-headline text-3xl text-foreground">Done</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/65">
                Recent wins stay nearby so you can review them or reopen them without hunting.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-foreground/55 shadow-ambient">{doneTasks.length}</span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                Expand
              </span>
            </div>
          </summary>
          <div className="mt-5 space-y-3">
            {doneTasks.length > 0 ? (
              doneTasks.map((task) => <DoneTaskRow key={task.id} task={task} />)
            ) : (
              <div className="rounded-[1.6rem] border border-white/70 bg-white/82 px-4 py-5 text-sm text-foreground/60 shadow-ambient">
                No completed tasks yet.
              </div>
            )}
          </div>
        </details>
      </section>
    </ShellLayout>
  );
}
