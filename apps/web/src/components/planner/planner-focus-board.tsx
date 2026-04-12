"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import type { PlannerOverview, PlannerTaskSummary } from "@workspace/types/index";

import { archivePlannerTaskFromListAction, updatePlannerTaskStatusAction } from "@/app/planner/actions";
import { PlannerDoneSection } from "@/components/planner/planner-done-section";

type PlannerFocusFilter = "all" | "high" | "doing";

const segmentedGroupClassName = "flex flex-wrap items-center gap-1.5 rounded-full bg-white/88 p-1.5 shadow-ambient";
const segmentedButtonBaseClassName = "inline-flex h-11 min-w-[5.75rem] items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors duration-200";
const segmentedButtonPrimaryClassName = `${segmentedButtonBaseClassName} bg-primary text-white shadow-ambient`;
const segmentedButtonSecondaryClassName = `${segmentedButtonBaseClassName} bg-surface-container-low text-primary hover:bg-primary/5`;

const focusFilters: Array<{ key: PlannerFocusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "high", label: "High" },
  { key: "doing", label: "Doing" }
];

function matchesFocusFilter(task: PlannerTaskSummary, filter: PlannerFocusFilter) {
  if (filter === "high") {
    return task.priority === "HIGH";
  }

  if (filter === "doing") {
    return task.status === "IN_PROGRESS";
  }


  return true;
}

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

function emphasisBadges(task: PlannerTaskSummary) {
  const badges: Array<{ label: string; className: string }> = [];

  if (task.status === "IN_PROGRESS") {
    badges.push({ label: "Doing", className: "bg-primary/8 text-primary" });
  }

  if (task.priority === "HIGH") {
    badges.push({ label: "High", className: "bg-fuchsia-50 text-fuchsia-700" });
  }

  if (task.dueAt && new Date(task.dueAt).getTime() < Date.now()) {
    badges.push({ label: "Overdue", className: "bg-rose-50 text-rose-700" });
  }

  return badges;
}

function secondaryTaskMeta(task: PlannerTaskSummary) {
  if (task.priority === "HIGH") {
    return "High priority";
  }

  if (task.priority === "LOW") {
    return "Low priority";
  }

  if (task.relatedNoteTitle || task.relatedDraftTitle) {
    return "Has reference";
  }

  return null;
}

function nextFlowAction(task: PlannerTaskSummary) {
  if (task.status === "TODO") {
    return { label: "Start", status: "IN_PROGRESS" as const };
  }

  if (task.status === "IN_PROGRESS") {
    return { label: "Pause", status: "TODO" as const };
  }

  if (task.status === "DONE") {
    return { label: "Reopen", status: "TODO" as const };
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
  const badges = emphasisBadges(task);
  const secondaryMeta = secondaryTaskMeta(task);

  return (
    <article className="rounded-[1.6rem] border border-white/70 bg-white/92 p-4 shadow-ambient transition-transform duration-200 hover:translate-y-[-1px]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {badges.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {badges.map((badge) => (
                <span key={badge.label} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${badge.className}`}>
                  {badge.label}
                </span>
              ))}
            </div>
          ) : null}
          <h3 className="mt-3 text-lg font-semibold tracking-[-0.01em] text-foreground">{task.title}</h3>
          {task.description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/68">{task.description}</p> : null}
          <p className="mt-3 text-sm text-foreground/55">
            {formatTaskTimeLabel(task)}
            {secondaryMeta ? ` ? ${secondaryMeta}` : ""}
          </p>
          <TaskLinks task={task} />
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 lg:max-w-[30rem]">
          <div className={`${segmentedGroupClassName} justify-end`}>
            <form action={updatePlannerTaskStatusAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="status" value="DONE" />
              <button type="submit" className={segmentedButtonPrimaryClassName}>
                Done
              </button>
            </form>
            {flowAction ? (
              <form action={updatePlannerTaskStatusAction}>
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="status" value={flowAction.status} />
                <button type="submit" className={segmentedButtonSecondaryClassName}>
                  {flowAction.label}
                </button>
              </form>
            ) : null}
            <Link href={`/planner/${task.id}/edit`} className={segmentedButtonSecondaryClassName}>
              Edit
            </Link>
          </div>
          <form action={archivePlannerTaskFromListAction}>
            <input type="hidden" name="taskId" value={task.id} />
            <button type="submit" className="inline-flex h-11 items-center justify-center rounded-full px-3 text-sm font-semibold text-rose-700 transition-colors duration-200 hover:bg-rose-50">
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
    <article className="rounded-[1.4rem] border border-white/60 bg-white/72 px-4 py-3 shadow-ambient">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Done
            </span>
            <p className="text-sm text-foreground/45">{formatTaskTimeLabel(task)}</p>
          </div>
          <h3 className="mt-2 text-base font-semibold tracking-[-0.01em] text-foreground/70 line-through decoration-primary/30">{task.title}</h3>
          {task.description ? <p className="mt-1 line-clamp-1 text-sm text-foreground/48">{task.description}</p> : null}
          <TaskLinks task={task} />
        </div>

        <div className={`${segmentedGroupClassName} shrink-0 justify-end`}>
          <Link href={`/planner/${task.id}/edit`} className={segmentedButtonSecondaryClassName}>
            Edit
          </Link>
          <form action={updatePlannerTaskStatusAction}>
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="status" value="TODO" />
            <button type="submit" className={segmentedButtonSecondaryClassName}>
              Reopen
            </button>
          </form>
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
        <div className="flex min-w-[4rem] justify-end">
          <span className="inline-flex min-w-[3rem] justify-center rounded-full bg-white px-3 py-1 text-sm font-semibold text-foreground/55 shadow-ambient">{count}</span>
        </div>
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

type PlannerFocusBoardProps = {
  overview: PlannerOverview;
  todayTasks: PlannerTaskSummary[];
  upcomingTasks: PlannerTaskSummary[];
  doneTasks: PlannerTaskSummary[];
};

export function PlannerFocusBoard({ overview, todayTasks, upcomingTasks, doneTasks }: PlannerFocusBoardProps) {
  const [activeFocus, setActiveFocus] = useState<PlannerFocusFilter>("all");

  const filteredTodayTasks = useMemo(
    () => todayTasks.filter((task) => matchesFocusFilter(task, activeFocus)),
    [activeFocus, todayTasks]
  );
  const filteredUpcomingTasks = useMemo(
    () => upcomingTasks.filter((task) => matchesFocusFilter(task, activeFocus)),
    [activeFocus, upcomingTasks]
  );
  const focusTaskCount = filteredTodayTasks.length + filteredUpcomingTasks.length;

  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Today" value={filteredTodayTasks.length} />
        <StatCard label="Upcoming" value={filteredUpcomingTasks.length} />
        <StatCard label="Doing" value={overview.inProgressCount} />
        <StatCard label="Done" value={overview.doneCount} />
      </section>

      <section className="rounded-[1.8rem] bg-surface-container-low p-4 shadow-ambient">
        <div className="rounded-[1.6rem] border border-white/70 bg-white/92 p-4 shadow-ambient">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-primary/75">Focus</p>
              <p className="mt-1 text-sm text-foreground/65">
                {activeFocus === "all" ? "Showing every active task." : `Showing ${focusTaskCount} tasks for ${activeFocus}.`}
              </p>
            </div>
            <div className={`${segmentedGroupClassName} justify-end`}>
              {focusFilters.map((filter) => {
                const active = activeFocus === filter.key;

                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFocus(filter.key)}
                    className={active ? segmentedButtonPrimaryClassName : segmentedButtonSecondaryClassName}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <SectionCard title="Today" count={filteredTodayTasks.length} description="Unscheduled work, today's work, and overdue work stay in one place so nothing urgent slips out of sight.">
        {filteredTodayTasks.length > 0 ? (
          filteredTodayTasks.map((task) => <ActiveTaskRow key={task.id} task={task} />)
        ) : (
          <div className="rounded-[1.6rem] border border-white/70 bg-white/82 px-4 py-5 text-sm text-foreground/60 shadow-ambient">
            {activeFocus === "all" ? "Nothing urgent right now. Add the next task when you are ready." : "No tasks match this focus right now."}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Upcoming" count={filteredUpcomingTasks.length} description="Scheduled work stays visible without taking over today's attention.">
        {filteredUpcomingTasks.length > 0 ? (
          filteredUpcomingTasks.map((task) => <ActiveTaskRow key={task.id} task={task} />)
        ) : (
          <div className="rounded-[1.6rem] border border-white/70 bg-white/82 px-4 py-5 text-sm text-foreground/60 shadow-ambient">
            {activeFocus === "all" ? "No upcoming tasks yet." : "No upcoming tasks match this focus."}
          </div>
        )}
      </SectionCard>

      <PlannerDoneSection count={doneTasks.length}>
        {doneTasks.length > 0 ? (
          doneTasks.map((task) => <DoneTaskRow key={task.id} task={task} />)
        ) : (
          <div className="rounded-[1.6rem] border border-white/70 bg-white/82 px-4 py-5 text-sm text-foreground/60 shadow-ambient">
            No completed tasks yet.
          </div>
        )}
      </PlannerDoneSection>
    </>
  );
}
