import Link from "next/link";

import { ModuleCard } from "@/components/shell/module-card";
import { ShellLayout } from "@/components/shell/shell-layout";
import { WorkspaceViewNav } from "@/components/shell/workspace-view-nav";
import { getPreferredActivityHref, getPreferredActivityReentry } from "@/server/activity/preferences";
import { getPlannerOverview, getPlannerPlanningView, listPlannerTasks } from "@/server/planner/service";

import { archivePlannerTaskFromListAction, deleteArchivedPlannerTaskFromListAction, restorePlannerTaskFromListAction, updatePlannerTaskStatusAction } from "./actions";

export const dynamic = "force-dynamic";

function taskMeta(task: { status: string; priority: string; scheduledFor?: string; dueAt?: string; completedAt?: string }) {
  if (task.status === "DONE") {
    return task.completedAt ? `Completed ${new Date(task.completedAt).toLocaleString("zh-CN")}` : "Completed task";
  }

  if (task.dueAt) {
    return `Due ${new Date(task.dueAt).toLocaleString("zh-CN")}`;
  }

  if (task.scheduledFor) {
    return `Scheduled ${new Date(task.scheduledFor).toLocaleString("zh-CN")}`;
  }

  return `${task.priority} priority`;
}

function nextAction(task: { id: string; status: string }) {
  if (task.status === "TODO") {
    return { label: "Start Task", status: "IN_PROGRESS" };
  }

  if (task.status === "IN_PROGRESS") {
    return { label: "Mark Done", status: "DONE" };
  }

  if (task.status === "DONE") {
    return { label: "Reopen", status: "TODO" };
  }

  return null;
}

function workThreadSummary(task: { relatedNoteTitle?: string; relatedDraftTitle?: string; description: string }) {
  if (task.description) {
    return task.description;
  }

  if (task.relatedNoteTitle && task.relatedDraftTitle) {
    return `Threading note '${task.relatedNoteTitle}' through draft '${task.relatedDraftTitle}'.`;
  }

  if (task.relatedNoteTitle) {
    return `Thread anchored to note '${task.relatedNoteTitle}'.`;
  }

  if (task.relatedDraftTitle) {
    return `Thread anchored to draft '${task.relatedDraftTitle}'.`;
  }

  return "Standalone task.";
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
    return "No planning anchor yet";
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
                  Note: {task.relatedNoteTitle}
                </Link>
              ) : null}
              {task.relatedDraftId && task.relatedDraftTitle ? (
                <Link href={`/writing/drafts/${task.relatedDraftId}`} className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-ambient">
                  Draft: {task.relatedDraftTitle}
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

export default async function PlannerPage({
  searchParams
}: {
  searchParams?: Promise<{ created?: string; updated?: string; edited?: string; deleted?: string; restored?: string; destroyed?: string; error?: string; view?: string; confirmDelete?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const archivedView = resolvedSearchParams?.view === "archived";

  const [overview, tasks, planningView, recentActivityHref, workThreadsHref, historyTimelineHref, activityReentry] = await Promise.all([
    getPlannerOverview(),
    listPlannerTasks(9, { archived: archivedView }),
    archivedView ? Promise.resolve({ todayTasks: [], weekTasks: [], overdueTasks: [] }) : getPlannerPlanningView(4),
    getPreferredActivityHref("#recent-activity"),
    getPreferredActivityHref("#work-threads"),
    getPreferredActivityHref("#history-timeline"),
    getPreferredActivityReentry()
  ]);

  const linkedTasks = archivedView ? [] : tasks.filter((task) => task.relatedNoteTitle || task.relatedDraftTitle);
  const hasDeleteTargetQuery = archivedView && Boolean(resolvedSearchParams?.confirmDelete);
  const confirmDeleteTaskId = archivedView && tasks.some((task) => task.id === resolvedSearchParams?.confirmDelete) ? resolvedSearchParams?.confirmDelete : undefined;
  const taskPendingDelete = confirmDeleteTaskId ? tasks.find((task) => task.id === confirmDeleteTaskId) : undefined;
  const invalidDeleteTarget = hasDeleteTargetQuery && !taskPendingDelete;
  const feedbackMessage =
    resolvedSearchParams?.created === "1"
      ? "Task created successfully. The planner list has been updated with the new task."
      : resolvedSearchParams?.edited === "1"
        ? "Task details updated successfully."
        : resolvedSearchParams?.updated === "1"
          ? "Task status updated successfully."
          : resolvedSearchParams?.deleted === "1"
            ? "Task archived successfully."
            : resolvedSearchParams?.restored === "1"
              ? "Task restored successfully."
              : resolvedSearchParams?.destroyed === "1"
                ? "Archived task deleted permanently."
                : resolvedSearchParams?.error === "update-failed"
                  ? "Task status update failed."
                  : resolvedSearchParams?.error === "delete-failed"
                    ? "Task archive failed."
                    : resolvedSearchParams?.error === "restore-failed"
                      ? "Task restore failed."
                      : resolvedSearchParams?.error === "permanent-delete-failed"
                        ? "Permanent delete failed."
                        : resolvedSearchParams?.error === "confirm-delete-required"
                          ? "Permanent delete requires a confirmation step."
                          : invalidDeleteTarget
                            ? "The archived task selected for permanent delete is no longer available."
                            : resolvedSearchParams?.error === "missing-task"
                              ? "Planner task is missing."
                              : null;

  return (
    <ShellLayout
      title="Planner"
      description="Planner now carries durable status, priority, scheduling data, and cross-module links back to the notes and drafts that generated the work."
    >
      <WorkspaceViewNav
        eyebrow="Re-entry Views"
        title="Re-enter linked work"
        items={[
          {
            label: "Work Threads",
            href: workThreadsHref,
            description: "Focus on tasks that still carry note or draft context."
          },
          {
            label: "Dashboard Activity",
            href: recentActivityHref,
            description: "Step back to the shared workstation timeline when you need wider context."
          },
          {
            label: "Archive Timeline",
            href: historyTimelineHref,
            description: "Jump from execution to the longer-lived record of what already landed."
          }
        ]}
      />

      {!archivedView ? (
        <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Replay Context</p>
          <h2 className="mt-3 font-headline text-3xl text-foreground">Planner can return to {activityReentry.label}</h2>
          <p className="mt-3 text-sm leading-6 text-foreground/70">Execution does not have to stay isolated. The current replay lens can pull you back into the wider workstation motion whenever you need context.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={activityReentry.nextStep.href} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
              {activityReentry.nextStep.label}
            </Link>
            <p className="text-sm leading-6 text-foreground/60">{activityReentry.nextStep.description}</p>
          </div>
        </section>
      ) : null}

      {feedbackMessage ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          {feedbackMessage}
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href={archivedView ? "/planner" : "/planner?view=archived"} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
          {archivedView ? "View Live Tasks" : "View Archived Tasks"}
        </Link>
        {!archivedView ? (
          <Link href="/planner/new" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
            New Task
          </Link>
        ) : null}
      </div>


      {taskPendingDelete ? (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-700">Delete Confirmation</p>
          <h2 className="mt-3 font-headline text-3xl text-foreground">Delete archived task permanently?</h2>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            <strong>{taskPendingDelete.title}</strong> will be removed permanently. This action cannot be undone.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <form action={deleteArchivedPlannerTaskFromListAction}>
              <input type="hidden" name="taskId" value={taskPendingDelete.id} />
              <input type="hidden" name="confirmed" value="true" />
              <button type="submit" className="rounded-full bg-rose-700 px-5 py-3 text-sm font-semibold text-white shadow-ambient">
                Confirm Permanent Delete
              </button>
            </form>
            <Link href="/planner?view=archived" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
              Cancel
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-3 xl:grid-cols-5">
        <ModuleCard title={archivedView ? "Archived Tasks" : "Tasks"} description={archivedView ? `${overview.archivedCount} archived planner tasks can be restored.` : `${overview.totalCount} active planner tasks are now being tracked.`} eyebrow="Domain" />
        <ModuleCard title="Todo" description={`${overview.todoCount} tasks are waiting to be started.`} eyebrow="Queue" />
        <ModuleCard title="In Progress" description={`${overview.inProgressCount} tasks are currently moving.`} eyebrow="Momentum" />
        <ModuleCard title="Done" description={`${overview.doneCount} tasks have already been completed.`} eyebrow="History" />
        <ModuleCard title="Archive Pool" description={`${overview.archivedCount} tasks currently live in the archive state.`} eyebrow="State" />
      </section>

      {!archivedView ? (
        <>
          <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Planning View</p>
                <h2 className="mt-3 font-headline text-3xl text-foreground">Shape execution across today, the next week, and overdue pressure</h2>
              </div>
              <span className="text-sm text-foreground/50">{planningView.todayTasks.length + planningView.weekTasks.length + planningView.overdueTasks.length} planned anchors</span>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              <PlanningLane
                eyebrow="Today"
                title="Today pull"
                description="Tasks already scheduled or due today so you can decide what must move before the day closes."
                tasks={planningView.todayTasks}
                emptyMessage="Nothing is anchored to today yet. Pull one of the active tasks into today's lane when you are ready to commit."
              />
              <PlanningLane
                eyebrow="This Week"
                title="Weekly horizon"
                description="Work that is already on the near horizon, but does not need immediate attention today."
                tasks={planningView.weekTasks}
                emptyMessage="The near horizon is clear right now. Add scheduled dates to start shaping a real week plan."
              />
              <PlanningLane
                eyebrow="Overdue"
                title="Pressure points"
                description="Tasks with deadlines already behind you, kept visible so they can be consciously rescheduled or finished."
                tasks={planningView.overdueTasks}
                emptyMessage="No overdue pressure points right now. The plan is still ahead of the clock."
              />
            </div>
          </section>

          <section id="work-threads" className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Work Threads</p>
                <h2 className="mt-3 font-headline text-3xl text-foreground">Connected tasks grouped by their upstream context</h2>
              </div>
              <span className="text-sm text-foreground/50">{linkedTasks.length} linked threads</span>
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
                          Note: {task.relatedNoteTitle}
                        </Link>
                      ) : null}
                      {task.relatedDraftTitle && task.relatedDraftId ? (
                        <Link href={`/writing/drafts/${task.relatedDraftId}`} className="rounded-full bg-surface-container-low px-3 py-1.5 font-semibold text-primary">
                          Draft: {task.relatedDraftTitle}
                        </Link>
                      ) : null}
                    </div>
                    <Link href={`/planner/${task.id}/edit`} className="mt-4 inline-flex text-sm font-semibold text-primary">
                      Open thread task
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.5rem] bg-white/80 p-4 text-sm text-foreground/60">
                No linked work threads yet. Create tasks from notes or drafts to turn the planner into a real coordination layer.
              </div>
            )}
          </section>
        </>
      ) : null}

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-3xl">{archivedView ? "Archived Tasks" : "Recent Tasks"}</h2>
          <span className="text-sm text-foreground/50">Showing {tasks.length} of {archivedView ? overview.archivedCount : overview.totalCount} {archivedView ? "archived" : "task"} records</span>
        </div>

        {tasks.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => {
              const action = archivedView ? null : nextAction(task);

              return (
                <article key={task.id} className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
                  <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-primary">
                    <span>{task.status}</span>
                    <span>{task.priority}</span>
                  </div>
                  <h3 className="mt-3 font-headline text-2xl text-foreground">{task.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-foreground/70">{task.description || (archivedView ? "Archived task with no additional description." : "No description yet.")}</p>
                  <p className="mt-4 text-xs text-foreground/50">{taskMeta(task)}</p>
                  <p className="mt-2 text-xs text-foreground/50">Updated {new Date(task.updatedAt).toLocaleString("zh-CN")}</p>

                  {task.relatedNoteTitle || task.relatedDraftTitle ? (
                    <div className="mt-4 flex flex-wrap gap-3 text-xs">
                      {task.relatedNoteTitle && task.relatedNoteSlug ? (
                        <Link href={`/knowledge/${task.relatedNoteSlug}`} className="rounded-full bg-white px-3 py-1.5 font-semibold text-primary shadow-ambient">
                          Note: {task.relatedNoteTitle}
                        </Link>
                      ) : null}
                      {task.relatedDraftTitle && task.relatedDraftId ? (
                        <Link href={`/writing/drafts/${task.relatedDraftId}`} className="rounded-full bg-white px-3 py-1.5 font-semibold text-primary shadow-ambient">
                          Draft: {task.relatedDraftTitle}
                        </Link>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {!archivedView ? (
                      <>
                        <Link href={`/planner/${task.id}/edit`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-ambient">
                          Edit Task
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
                        <form action={archivePlannerTaskFromListAction}>
                          <input type="hidden" name="taskId" value={task.id} />
                          <button type="submit" className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-ambient">
                            Archive Task
                          </button>
                        </form>
                      </>
                    ) : (
                      <>
                        <form action={restorePlannerTaskFromListAction}>
                          <input type="hidden" name="taskId" value={task.id} />
                          <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-ambient">
                            Restore Task
                          </button>
                        </form>
                        <Link href={`/planner?view=archived&confirmDelete=${task.id}`} className="rounded-full bg-rose-700 px-4 py-2 text-sm font-semibold text-white shadow-ambient">
                          Delete Permanently
                        </Link>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
            {archivedView ? "No archived planner tasks yet." : "No planner tasks yet. Create one to start shaping the execution layer."}
          </div>
        )}
      </section>
    </ShellLayout>
  );
}
