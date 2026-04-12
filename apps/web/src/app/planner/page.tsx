import Link from "next/link";

import { PlannerFocusBoard } from "@/components/planner/planner-focus-board";
import { PlannerQuickAdd } from "@/components/planner/planner-quick-add";
import { ShellLayout } from "@/components/shell/shell-layout";
import { getPlannerOverview, getPlannerTodoView, listPlannerTasks } from "@/server/planner/service";

import {
  deleteArchivedPlannerTaskFromListAction,
  restorePlannerTaskFromListAction
} from "./actions";

export const dynamic = "force-dynamic";

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
              <p className="text-xs uppercase tracking-[0.22em] text-primary/75">Archived tasks</p>
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

        <PlannerQuickAdd />

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
          <Link href="/planner/new" className="rounded-full bg-white px-5 py-3 font-semibold text-primary shadow-ambient transition-colors duration-200 hover:bg-primary/5">
            Full editor
          </Link>
          <Link href="/planner?view=archived" className="rounded-full bg-white px-5 py-3 font-semibold text-primary shadow-ambient transition-colors duration-200 hover:bg-primary/5">
            Archived tasks ({overview.archivedCount})
          </Link>
        </div>
      </section>

      <PlannerFocusBoard
        overview={overview}
        todayTasks={todoView?.todayTasks ?? []}
        upcomingTasks={todoView?.upcomingTasks ?? []}
        doneTasks={todoView?.doneTasks ?? []}
      />
    </ShellLayout>
  );
}
