export const dynamic = "force-dynamic";

import Link from "next/link";

import { moduleRegistry } from "@workspace/config/src/modules";

import { ModuleCard } from "@/components/shell/module-card";
import { ShellLayout } from "@/components/shell/shell-layout";
import { SystemPostureSnapshotCard } from "@/components/shell/system-posture-snapshot";
import { WorkspaceViewNav } from "@/components/shell/workspace-view-nav";
import { getArchiveOverview, listRecentArchiveItems } from "@/server/archive/service";
import { getPreferredActivityFocus, getPreferredActivityHref, getPreferredActivityReentry } from "@/server/activity/preferences";
import { getActivityFocusLabel, getActivityFocusPostureHint } from "@/lib/activity-focus";
import { getKnowledgeOverview, listKnowledgeNotes } from "@/server/knowledge/service";
import { getPlannerOverview, listPlannerTasks } from "@/server/planner/service";
import { getRememberedWorkflowSummary } from "@/server/search/preferences";
import { getSettingsSnapshot, getSystemPostureSnapshot } from "@/server/settings/service";
import { getWritingOverview, listWritingDrafts, listPublishedWritingPosts } from "@/server/writing/service";

const dashboardHighlightKeys = new Set(["activity", "planner", "knowledge", "writing", "archive"]);

function taskMeta(task: { status: string; priority: string; scheduledFor?: string; dueAt?: string }) {
  if (task.status === "DONE") {
    return "Completed task";
  }

  if (task.dueAt) {
    return `Due ${new Date(task.dueAt).toLocaleString("zh-CN")}`;
  }

  if (task.scheduledFor) {
    return `Scheduled ${new Date(task.scheduledFor).toLocaleString("zh-CN")}`;
  }

  return `${task.priority} priority`;
}

function isSameLocalDay(value: string, now: Date) {
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function linkedTaskSummary(task: { relatedNoteTitle?: string; relatedDraftTitle?: string }) {
  if (task.relatedNoteTitle && task.relatedDraftTitle) {
    return `Linked to note '${task.relatedNoteTitle}' and draft '${task.relatedDraftTitle}'.`;
  }

  if (task.relatedNoteTitle) {
    return `Linked to note '${task.relatedNoteTitle}'.`;
  }

  if (task.relatedDraftTitle) {
    return `Linked to draft '${task.relatedDraftTitle}'.`;
  }

  return "Standalone task.";
}

type ActivityItem = {
  id: string;
  kind: "task" | "note" | "draft" | "post" | "archive";
  title: string;
  href: string;
  summary: string;
  timestamp: string;
  badge: string;
};

type DashboardQuickAction = {
  id: string;
  title: string;
  href: string;
  emphasized?: boolean;
};

type DashboardHighlightCard = {
  key: string;
  name: string;
  description: string;
  href: string;
  eyebrow: string;
};

type DashboardStreamKey = "planner" | "writing-drafts" | "knowledge" | "writing-posts" | "archive";

const dashboardStreamOrderMap: Record<DashboardStreamKey, Record<"planner" | "knowledge" | "writing" | "archive", string>> = {
  planner: {
    planner: "xl:order-1",
    knowledge: "xl:order-3",
    writing: "xl:order-3",
    archive: "xl:order-4"
  },
  "writing-drafts": {
    planner: "xl:order-3",
    knowledge: "xl:order-4",
    writing: "xl:order-1",
    archive: "xl:order-4"
  },
  knowledge: {
    planner: "xl:order-2",
    knowledge: "xl:order-1",
    writing: "xl:order-4",
    archive: "xl:order-3"
  },
  "writing-posts": {
    planner: "xl:order-4",
    knowledge: "xl:order-2",
    writing: "xl:order-2",
    archive: "xl:order-5"
  },
  archive: {
    planner: "xl:order-5",
    knowledge: "xl:order-5",
    writing: "xl:order-5",
    archive: "xl:order-1"
  }
};

function getDashboardStreamOrderClass(streamKey: DashboardStreamKey, rememberedWorkflowKey?: "planner" | "knowledge" | "writing" | "archive") {
  if (!rememberedWorkflowKey) {
    return "xl:order-none";
  }

  return dashboardStreamOrderMap[streamKey][rememberedWorkflowKey] ?? "xl:order-none";
}

function isWorkflowBiasedStream(streamKey: DashboardStreamKey, rememberedWorkflowKey?: "planner" | "knowledge" | "writing" | "archive") {
  if (!rememberedWorkflowKey) {
    return false;
  }
  if (rememberedWorkflowKey === "writing") {
    return streamKey === "writing-drafts" || streamKey === "writing-posts";
  }

  if (rememberedWorkflowKey === "knowledge") {
    return streamKey === "knowledge";
  }

  if (rememberedWorkflowKey === "archive") {
    return streamKey === "archive";
  }

  return streamKey === "planner";
}
function formatActivityTimestamp(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function buildRecentActivity(input: {
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    updatedAt: string;
    relatedNoteTitle?: string;
    relatedDraftTitle?: string;
  }>;
  notes: Array<{ id: string; slug: string; title: string; summary: string; updatedAt: string; domainName?: string }>;
  drafts: Array<{ id: string; title: string; summary: string; updatedAt: string; visibility: string }>;
  posts: Array<{ id: string; slug: string; title: string; summary: string; publishedAt: string; category: string }>;
  archiveItems: Array<{ id: string; title: string; summary: string; updatedAt: string; badge: string; href?: string }>;
}) {
  const items: ActivityItem[] = [
    ...input.tasks.map((task) => ({
      id: `task-${task.id}`,
      kind: "task" as const,
      title: task.title,
      href: `/planner/${task.id}/edit`,
      summary: task.description || linkedTaskSummary(task),
      timestamp: task.updatedAt,
      badge: `Planner | ${task.status}`
    })),
    ...input.notes.map((note) => ({
      id: `note-${note.id}`,
      kind: "note" as const,
      title: note.title,
      href: `/knowledge/${note.slug}`,
      summary: note.summary || (note.domainName ? `Knowledge note in ${note.domainName}.` : "Knowledge note updated."),
      timestamp: note.updatedAt,
      badge: note.domainName ? `Knowledge | ${note.domainName}` : "Knowledge"
    })),
    ...input.drafts.map((draft) => ({
      id: `draft-${draft.id}`,
      kind: "draft" as const,
      title: draft.title,
      href: `/writing/drafts/${draft.id}`,
      summary: draft.summary || "Writing draft updated.",
      timestamp: draft.updatedAt,
      badge: `Writing Draft | ${draft.visibility}`
    })),
    ...input.posts.map((post) => ({
      id: `post-${post.id}`,
      kind: "post" as const,
      title: post.title,
      href: `/writing/${post.slug}`,
      summary: post.summary || "Published writing entry.",
      timestamp: post.publishedAt,
      badge: `Published | ${post.category}`
    })),
    ...input.archiveItems
      .filter((item) => item.href)
      .map((item) => ({
        id: `archive-${item.id}`,
        kind: "archive" as const,
        title: item.title,
        href: item.href as string,
        summary: item.summary || "Archive record refreshed.",
        timestamp: item.updatedAt,
        badge: `Archive | ${item.badge}`
      }))
  ];

  return items
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 8);
}

function buildDashboardHighlights(input: {
  rememberedWorkflowKey?: "planner" | "knowledge" | "writing" | "archive";
  enabledModules: typeof moduleRegistry;
}) {
  return input.enabledModules
    .filter((module) => dashboardHighlightKeys.has(module.key))
    .map((module): DashboardHighlightCard => ({
      key: module.key,
      name: module.name,
      description: module.key === input.rememberedWorkflowKey
        ? `${module.description} This module is currently leading the remembered workflow lane.`
        : module.description,
      href: module.href,
      eyebrow: module.key === input.rememberedWorkflowKey ? 'Workflow Bias' : 'Core Module'
    }))
    .sort((left, right) => Number(right.key === input.rememberedWorkflowKey) - Number(left.key === input.rememberedWorkflowKey));
}
function buildDashboardQuickActions(input: {
  rememberedWorkflowKey?: "planner" | "knowledge" | "writing" | "archive";
  latestNoteSlug?: string;
  latestDraftId?: string;
}) {
  const actions: DashboardQuickAction[] = [
    { id: "planner", title: "Plan New Task", href: "/planner/new", emphasized: input.rememberedWorkflowKey === "planner" },
    { id: "writing", title: "Create New Draft", href: "/writing/new", emphasized: input.rememberedWorkflowKey === "writing" },
    { id: "knowledge", title: "Capture New Note", href: "/knowledge/new", emphasized: input.rememberedWorkflowKey === "knowledge" },
    ...(input.latestNoteSlug ? [{ id: "task-from-note", title: "Task from Latest Note", href: `/planner/new?note=${input.latestNoteSlug}`, emphasized: input.rememberedWorkflowKey === "planner" || input.rememberedWorkflowKey === "knowledge" }] : []),
    ...(input.latestDraftId ? [{ id: "task-from-draft", title: "Task from Latest Draft", href: `/planner/new?draft=${input.latestDraftId}`, emphasized: input.rememberedWorkflowKey === "planner" || input.rememberedWorkflowKey === "writing" }] : []),
    { id: "archive", title: "Review Archive Records", href: "/archive", emphasized: input.rememberedWorkflowKey === "archive" }
  ];

  return [...actions].sort((left, right) => Number(Boolean(right.emphasized)) - Number(Boolean(left.emphasized)));
}
function buildTodayFocus(input: {
  tasks: Array<{ title: string; status: string; priority: string; scheduledFor?: string; dueAt?: string; relatedNoteTitle?: string; relatedDraftTitle?: string }>;
  drafts: Array<{ title: string; updatedAt: string }>;
  notes: Array<{ title: string; updatedAt: string; slug: string }>;
  plannerOverview: { inProgressCount: number; todoCount: number; doneCount: number };
  knowledgeOverview: { noteCount: number };
  writingOverview: { draftCount: number; publishedCount: number };
  archiveOverview: { totalCount: number };
}) {
  const now = new Date();
  const linkedInProgressTask = input.tasks.find((task) => task.status === "IN_PROGRESS" && (task.relatedNoteTitle || task.relatedDraftTitle));
  const inProgressTask = input.tasks.find((task) => task.status === "IN_PROGRESS");
  const dueToday = input.tasks.filter((task) => task.dueAt && isSameLocalDay(task.dueAt, now));
  const scheduledToday = input.tasks.filter((task) => task.scheduledFor && isSameLocalDay(task.scheduledFor, now));
  const noteTouchedToday = input.notes.find((note) => isSameLocalDay(note.updatedAt, now));
  const draftTouchedToday = input.drafts.find((draft) => isSameLocalDay(draft.updatedAt, now));

  if (linkedInProgressTask) {
    return {
      title: `Move '${linkedInProgressTask.title}' across modules`,
      description: `${linkedTaskSummary(linkedInProgressTask)} Keep the connected work moving before the note, task, and draft drift apart again.`,
      chips: [
        `${input.plannerOverview.inProgressCount} in progress`,
        linkedInProgressTask.relatedNoteTitle ? "linked note" : "",
        linkedInProgressTask.relatedDraftTitle ? "linked draft" : ""
      ].filter(Boolean)
    };
  }

  if (inProgressTask) {
    return {
      title: `Keep '${inProgressTask.title}' moving`,
      description: `You already have ${input.plannerOverview.inProgressCount} task${input.plannerOverview.inProgressCount === 1 ? "" : "s"} in progress. Protect momentum before adding more open loops.`,
      chips: [
        `${input.plannerOverview.inProgressCount} in progress`,
        `${dueToday.length} due today`,
        `${input.writingOverview.draftCount} active drafts`
      ]
    };
  }

  if (dueToday.length > 0) {
    return {
      title: `${dueToday.length} task${dueToday.length === 1 ? "" : "s"} need attention today`,
      description: `The nearest deadline is '${dueToday[0].title}'. Clearing today's planner pressure will make the rest of the workstation feel lighter.`,
      chips: [
        `${dueToday.length} due today`,
        `${scheduledToday.length} scheduled today`,
        `${input.plannerOverview.todoCount} waiting in queue`
      ]
    };
  }

  if (noteTouchedToday) {
    return {
      title: `Re-enter '${noteTouchedToday.title}'`,
      description: `A knowledge note was touched today. Turning that fresh thinking into a task, draft, or polished note is probably the highest leverage next step.`,
      chips: [
        `${input.knowledgeOverview.noteCount} total notes`,
        `${input.writingOverview.publishedCount} published entries`,
        `${input.archiveOverview.totalCount} archive records`
      ]
    };
  }

  if (draftTouchedToday) {
    return {
      title: `Finish the thread in '${draftTouchedToday.title}'`,
      description: `Your most recently updated draft is still warm. A small pass now could turn it into a publishable piece instead of another lingering fragment.`,
      chips: [
        `${input.writingOverview.draftCount} active drafts`,
        `${input.writingOverview.publishedCount} published entries`,
        `${input.plannerOverview.doneCount} tasks done`
      ]
    };
  }

  return {
    title: "Shape today before it fragments",
    description: "Planner, writing, knowledge, and archive are all live now. Use the shell to choose one concrete task, one note worth deepening, and one draft worth finishing.",
    chips: [
      `${input.plannerOverview.todoCount} todo`,
      `${input.knowledgeOverview.noteCount} notes`,
      `${input.writingOverview.draftCount} drafts`
    ]
  };
}

export default async function DashboardPage() {
  const [writingOverview, knowledgeOverview, plannerOverview, archiveOverview, drafts, posts, archiveItems, notes, tasks, settingsSnapshot, postureSnapshot, preferredActivityFocus, preferredActivityHref, recentActivityHref, workThreadsHref, historyTimelineHref, activityReentry, rememberedWorkflow] = await Promise.all([
    getWritingOverview(),
    getKnowledgeOverview(),
    getPlannerOverview(),
    getArchiveOverview(),
    listWritingDrafts(6),
    listPublishedWritingPosts(),
    listRecentArchiveItems(6),
    listKnowledgeNotes(6),
    listPlannerTasks(6),
    getSettingsSnapshot(),
    getSystemPostureSnapshot(),
    getPreferredActivityFocus(),
    getPreferredActivityHref(),
    getPreferredActivityHref("#recent-activity"),
    getPreferredActivityHref("#work-threads"),
    getPreferredActivityHref("#history-timeline"),
    getPreferredActivityReentry(),
    getRememberedWorkflowSummary()
  ]);

  const enabledModules = moduleRegistry.filter((module) =>
    settingsSnapshot.modules.some((item) => item.key === module.key && item.enabled)
  );
  const dashboardHighlights = buildDashboardHighlights({
    rememberedWorkflowKey: rememberedWorkflow.key,
    enabledModules
  });
  const latestPost = posts[0];
  const recentPosts = posts.slice(1, 4);
  const linkedTasks = tasks.filter((task) => task.relatedNoteTitle || task.relatedDraftTitle).slice(0, 3);
  const knowledgeArchiveItems = archiveItems.filter((item) => item.sourceType === "NOTE").slice(0, 3);
  const recentActivity = buildRecentActivity({
    tasks,
    notes,
    drafts,
    posts,
    archiveItems
  });
  const focus = buildTodayFocus({
    tasks,
    drafts,
    notes,
    plannerOverview,
    knowledgeOverview,
    writingOverview,
    archiveOverview
  });
  const quickActions = buildDashboardQuickActions({
    rememberedWorkflowKey: rememberedWorkflow.key,
    latestNoteSlug: notes[0]?.slug,
    latestDraftId: drafts[0]?.id
  });

  return (
    <ShellLayout
      title="Dashboard"
      description="The workstation home view now surfaces live module activity plus the links between tasks, notes, drafts, and archive records, so the shell starts to feel like one connected system."
    >
      <WorkspaceViewNav
        title="Follow the workstation flow"
        items={[
          {
            label: "Recent Activity",
            href: recentActivityHref,
            description: "Replay the latest cross-module motion from one shared dashboard timeline."
          },
          {
            label: "Planner Threads",
            href: workThreadsHref,
            description: "Re-enter tasks that are tied to notes and drafts before their context drifts."
          },
          {
            label: "Archive Timeline",
            href: historyTimelineHref,
            description: "Walk back through the archive by day when you want the broader historical view."
          }
        ]}
      />

      <SystemPostureSnapshotCard
        snapshot={postureSnapshot}
        title="Read the current workstation posture"
        description="The dashboard now surfaces the same replay and shell posture that drives settings and modules, so you can see the current lens, default habit, and aligned module before choosing where to move next."
        primaryHref={activityReentry.href}
        primaryLabel={preferredActivityFocus === "all" ? "Open Activity Hub" : `Resume ${activityReentry.label} Lens`}
        secondaryHref="/settings#replay-habit"
        secondaryLabel="Tune Replay Habit"
        hint={getActivityFocusPostureHint(postureSnapshot.currentLens, "dashboard")}
      />

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] bg-surface-container-low p-8 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Today Focus</p>
          <h2 className="mt-3 font-headline text-4xl text-foreground">{focus.title}</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-foreground/70">{focus.description}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            {focus.chips.map((chip) => (
              <span key={chip} className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-primary shadow-ambient">
                {chip}
              </span>
            ))}
          </div>

          <div className="mt-6 rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Today Focus Action</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">Move from focus into {activityReentry.label}</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">{activityReentry.nextStep.description}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={activityReentry.nextStep.href} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
                {activityReentry.nextStep.label}
              </Link>
              <Link href={preferredActivityHref} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
                {preferredActivityFocus === "all" ? "Open Activity Hub" : "Resume " + getActivityFocusLabel(preferredActivityFocus) + " Lens"}
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-5">
            <div className="rounded-[1.5rem] bg-white/80 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Tasks</p>
              <p className="mt-3 font-headline text-3xl text-foreground">{plannerOverview.totalCount}</p>
              <p className="mt-2 text-sm text-foreground/60">Active planner tasks</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/80 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Drafts</p>
              <p className="mt-3 font-headline text-3xl text-foreground">{writingOverview.draftCount}</p>
              <p className="mt-2 text-sm text-foreground/60">Active writing drafts</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/80 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Notes</p>
              <p className="mt-3 font-headline text-3xl text-foreground">{knowledgeOverview.noteCount}</p>
              <p className="mt-2 text-sm text-foreground/60">Live knowledge notes</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/80 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Published</p>
              <p className="mt-3 font-headline text-3xl text-foreground">{writingOverview.publishedCount}</p>
              <p className="mt-2 text-sm text-foreground/60">Available reading entries</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/80 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Archive</p>
              <p className="mt-3 font-headline text-3xl text-foreground">{archiveOverview.totalCount}</p>
              <p className="mt-2 text-sm text-foreground/60">Cross-module records</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] bg-surface-container-low p-8 shadow-ambient">
          <section className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Remembered Workflow</p>
                <h3 className="mt-3 font-headline text-2xl text-foreground">{rememberedWorkflow.active ? `${rememberedWorkflow.title} is still shaping the desk` : "The desk is currently following live posture"}</h3>
              </div>
              <Link href={rememberedWorkflow.href} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                {rememberedWorkflow.active ? "Open Workflow" : "Open Command Desk"}
              </Link>
            </div>
            <p className="mt-4 text-sm leading-7 text-foreground/70">{rememberedWorkflow.summary} {rememberedWorkflow.active ? "The dashboard keeps this lane visible so your next move is not decided only by whatever updated most recently." : "Until you pin a workflow again, the dashboard will lean on replay posture and the freshest workspace signals."}</p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold text-primary">
              <Link href="/search">Open Command Center</Link>
              <Link href={rememberedWorkflow.href}>{rememberedWorkflow.active ? `Re-enter ${rememberedWorkflow.title}` : "Open Command Desk"}</Link>
            </div>
          </section>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Quick Actions</p>
            {rememberedWorkflow.active ? (
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient">
                Biased to {rememberedWorkflow.title}
              </span>
            ) : (
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient">
                Following live posture
              </span>
            )}
          </div>
          <h2 className="mt-3 font-headline text-3xl text-foreground">Start from here</h2>
          <div className="mt-6 flex flex-col gap-3">
            {quickActions.map((action, index) => (
              <Link
                key={action.id}
                href={action.href}
                className={action.emphasized && index === 0
                  ? "rounded-full bg-primary px-5 py-3 text-center text-sm font-semibold text-white"
                  : "rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-primary shadow-ambient"}
              >
                {action.title}
              </Link>
            ))}
          </div>

          {latestPost ? (
            <div className="mt-8 rounded-[1.5rem] bg-white/80 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Latest Published</p>
              <h3 className="mt-3 font-headline text-2xl text-foreground">{latestPost.title}</h3>
              <p className="mt-3 text-sm leading-6 text-foreground/70">{latestPost.summary || "No summary yet."}</p>
              <Link href={`/writing/${latestPost.slug}`} className="mt-4 inline-flex text-sm font-semibold text-primary">
                Open article
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section id="recent-activity" className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Recent Activity</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">A shared timeline across the workstation</h2>
          </div>
          <Link href="/search" className="text-sm font-semibold text-primary">Open Command Center</Link>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {recentActivity.length > 0 ? recentActivity.map((item) => (
            <article key={item.id} className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{item.badge}</p>
                <p className="text-xs text-foreground/50">{formatActivityTimestamp(item.timestamp)}</p>
              </div>
              <h3 className="mt-3 font-headline text-2xl text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-foreground/70">{item.summary}</p>
              <Link href={item.href} className="mt-4 inline-flex text-sm font-semibold text-primary">
                {item.kind === "task"
                  ? "Open task"
                  : item.kind === "note"
                    ? "Open note"
                    : item.kind === "draft"
                      ? "Open draft"
                      : item.kind === "post"
                        ? "Read entry"
                        : "Open archive source"}
              </Link>
            </article>
          )) : (
            <div className="rounded-[1.5rem] bg-white/80 p-4 text-sm text-foreground/60">
              No recent activity yet. As you move through notes, tasks, drafts, and archive records, the workstation will start to show a shared timeline here.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Cross-Module Threads</p>
              <h2 className="mt-3 font-headline text-3xl text-foreground">Tasks linked to notes and drafts</h2>
            </div>
            <Link href="/planner" className="text-sm font-semibold text-primary">Open planner</Link>
          </div>
          <div className="mt-6 space-y-4">
            {linkedTasks.length > 0 ? linkedTasks.map((task) => (
              <article key={task.id} className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-primary">{task.status} | {task.priority}</p>
                    <h3 className="mt-3 font-headline text-2xl text-foreground">{task.title}</h3>
                  </div>
                  <Link href={`/planner/${task.id}/edit`} className="text-sm font-semibold text-primary">
                    Refine task
                  </Link>
                </div>
                <p className="mt-3 text-sm leading-6 text-foreground/70">{task.description || linkedTaskSummary(task)}</p>
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
                <p className="mt-4 text-xs text-foreground/50">{taskMeta(task)}</p>
              </article>
            )) : (
              <div className="rounded-[1.5rem] bg-white/80 p-4 text-sm text-foreground/60">
                No linked tasks yet. Create tasks from notes or drafts to turn the dashboard into a true coordination layer.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Archive Signals</p>
              <h2 className="mt-3 font-headline text-3xl text-foreground">Knowledge records entering the archive</h2>
            </div>
            <Link href="/archive" className="text-sm font-semibold text-primary">Open archive</Link>
          </div>
          <div className="mt-6 space-y-4">
            {knowledgeArchiveItems.length > 0 ? knowledgeArchiveItems.map((item) => (
              <article key={item.id} className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{item.badge}</p>
                <h3 className="mt-3 font-headline text-2xl text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-foreground/70">{item.summary || "No summary stored yet."}</p>
                {item.href ? (
                  <Link href={item.href} className="mt-4 inline-flex text-sm font-semibold text-primary">
                    Re-open note
                  </Link>
                ) : null}
              </article>
            )) : (
              <div className="rounded-[1.5rem] bg-white/80 p-4 text-sm text-foreground/60">
                No knowledge archive records yet. Creating or refining notes will begin this archive signal.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {dashboardHighlights.map((item) => (
          <ModuleCard
            key={item.key}
            title={item.name}
            description={item.description}
            href={item.href}
            eyebrow={item.eyebrow}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-5">
        <div className={`rounded-[2rem] bg-surface-container-low p-6 shadow-ambient ${getDashboardStreamOrderClass("planner", rememberedWorkflow.key)}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-headline text-2xl text-foreground">Recent Tasks</h2>
              {isWorkflowBiasedStream("planner", rememberedWorkflow.key) ? (
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient">
                  Workflow Bias
                </span>
              ) : null}
            </div>
            <Link href="/planner" className="text-sm font-semibold text-primary">Open planner</Link>
          </div>
          <div className="mt-6 space-y-4">
            {tasks.length > 0 ? tasks.map((task) => (
              <article key={task.id} className="rounded-[1.5rem] bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{task.status} | {task.priority}</p>
                <h3 className="mt-3 font-headline text-xl text-foreground">{task.title}</h3>
                <p className="mt-2 text-sm leading-6 text-foreground/70">{task.description || "No description yet."}</p>
                <p className="mt-3 text-xs text-foreground/50">{taskMeta(task)}</p>
              </article>
            )) : (
              <div className="rounded-[1.5rem] bg-white/80 p-4 text-sm text-foreground/60">
                No tasks yet. Create one to start the planning stream.
              </div>
            )}
          </div>
        </div>

        <div className={`rounded-[2rem] bg-surface-container-low p-6 shadow-ambient ${getDashboardStreamOrderClass("writing-drafts", rememberedWorkflow.key)}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-headline text-2xl text-foreground">Recent Drafts</h2>
              {isWorkflowBiasedStream("writing-drafts", rememberedWorkflow.key) ? (
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient">
                  Workflow Bias
                </span>
              ) : null}
            </div>
            <Link href="/writing" className="text-sm font-semibold text-primary">View all</Link>
          </div>
          <div className="mt-6 space-y-4">
            {drafts.length > 0 ? drafts.map((draft) => (
              <article key={draft.id} className="rounded-[1.5rem] bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{draft.visibility} | {draft.contentBlockCount} blocks</p>
                <h3 className="mt-3 font-headline text-xl text-foreground">{draft.title}</h3>
                <p className="mt-2 text-sm leading-6 text-foreground/70">{draft.summary || "No summary yet."}</p>
                <Link href={`/writing/drafts/${draft.id}`} className="mt-3 inline-flex text-sm font-semibold text-primary">
                  Continue editing
                </Link>
              </article>
            )) : (
              <div className="rounded-[1.5rem] bg-white/80 p-4 text-sm text-foreground/60">
                No drafts yet. Start a new piece to begin the writing stream.
              </div>
            )}
          </div>
        </div>

        <div className={`rounded-[2rem] bg-surface-container-low p-6 shadow-ambient ${getDashboardStreamOrderClass("knowledge", rememberedWorkflow.key)}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-headline text-2xl text-foreground">Recent Notes</h2>
              {isWorkflowBiasedStream("knowledge", rememberedWorkflow.key) ? (
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient">
                  Workflow Bias
                </span>
              ) : null}
            </div>
            <Link href="/knowledge" className="text-sm font-semibold text-primary">Open library</Link>
          </div>
          <div className="mt-6 space-y-4">
            {notes.length > 0 ? notes.map((note) => (
              <article key={note.id} className="rounded-[1.5rem] bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{note.domainName ?? "Knowledge"} | {note.contentBlockCount} blocks</p>
                <h3 className="mt-3 font-headline text-xl text-foreground">{note.title}</h3>
                <p className="mt-2 text-sm leading-6 text-foreground/70">{note.summary || "No summary yet."}</p>
                <Link href={`/knowledge/${note.slug}`} className="mt-3 inline-flex text-sm font-semibold text-primary">
                  Open note
                </Link>
              </article>
            )) : (
              <div className="rounded-[1.5rem] bg-white/80 p-4 text-sm text-foreground/60">
                No notes yet. Capture one to begin the knowledge stream.
              </div>
            )}
          </div>
        </div>

        <div className={`rounded-[2rem] bg-surface-container-low p-6 shadow-ambient ${getDashboardStreamOrderClass("writing-posts", rememberedWorkflow.key)}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-headline text-2xl text-foreground">Recent Writing</h2>
              {isWorkflowBiasedStream("writing-posts", rememberedWorkflow.key) ? (
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient">
                  Workflow Bias
                </span>
              ) : null}
            </div>
            <Link href="/writing" className="text-sm font-semibold text-primary">Open feed</Link>
          </div>
          <div className="mt-6 space-y-4">
            {recentPosts.length > 0 ? recentPosts.map((post) => (
              <article key={post.id} className="rounded-[1.5rem] bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{post.category} | {post.readMinutes} min read</p>
                <h3 className="mt-3 font-headline text-xl text-foreground">{post.title}</h3>
                <p className="mt-2 text-sm leading-6 text-foreground/70">{post.summary || "No summary yet."}</p>
                <Link href={`/writing/${post.slug}`} className="mt-3 inline-flex text-sm font-semibold text-primary">
                  Read entry
                </Link>
              </article>
            )) : (
              <div className="rounded-[1.5rem] bg-white/80 p-4 text-sm text-foreground/60">
                {latestPost
                  ? "Only one published entry exists so far. Publish another draft to expand the reading stream."
                  : "No published entries yet. Publish a draft to begin the reading stream."}
              </div>
            )}
          </div>
        </div>

        <div className={`rounded-[2rem] bg-surface-container-low p-6 shadow-ambient ${getDashboardStreamOrderClass("archive", rememberedWorkflow.key)}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-headline text-2xl text-foreground">Recent Archive</h2>
              {isWorkflowBiasedStream("archive", rememberedWorkflow.key) ? (
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient">
                  Workflow Bias
                </span>
              ) : null}
            </div>
            <Link href="/archive" className="text-sm font-semibold text-primary">Open archive</Link>
          </div>
          <div className="mt-6 space-y-4">
            {archiveItems.length > 0 ? archiveItems.map((item) => (
              <article key={item.id} className="rounded-[1.5rem] bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{item.badge}</p>
                <h3 className="mt-3 font-headline text-xl text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-foreground/70">{item.summary || "No summary stored yet."}</p>
                {item.href ? (
                  <Link href={item.href} className="mt-3 inline-flex text-sm font-semibold text-primary">
                    Open source item
                  </Link>
                ) : null}
              </article>
            )) : (
              <div className="rounded-[1.5rem] bg-white/80 p-4 text-sm text-foreground/60">
                No archive records yet. Published writing and knowledge notes will appear here automatically.
              </div>
            )}
          </div>
        </div>
      </section>    </ShellLayout>
  );
}







