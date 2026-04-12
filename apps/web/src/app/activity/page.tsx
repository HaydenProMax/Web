export const dynamic = "force-dynamic";

import Link from "next/link";

import { ActivityFocusLink } from "@/components/activity/activity-focus-link";
import { ShellLayout } from "@/components/shell/shell-layout";
import { WorkspaceViewNav } from "@/components/shell/workspace-view-nav";
import { listRecentArchiveItems, listArchiveTimelineGroups } from "@/server/archive/service";
import { getPreferredActivityFocus } from "@/server/activity/preferences";
import { buildActivityHref, getActivityFocusNextStep, resolveActivityFocus } from "@/lib/activity-focus";
import { buildSearchModuleStackHref, getSearchModuleStackMeta } from "@/lib/search-module-stack";
import type { ActivityFocusKey } from "@/lib/activity-focus";
import { listKnowledgeNotes } from "@/server/knowledge/service";
import { listPlannerTasks } from "@/server/planner/service";
import { getRememberedWorkflowSummary } from "@/server/search/preferences";
import { listWritingDrafts, listPublishedWritingPosts } from "@/server/writing/service";

type ActivityItem = {
  id: string;
  kind: "task" | "note" | "draft" | "post" | "archive";
  title: string;
  href: string;
  summary: string;
  timestamp: string;
  badge: string;
};

type ActivityPageProps = {
  searchParams?: Promise<{ focus?: string }>;
};

type TimelineGroup = Awaited<ReturnType<typeof listArchiveTimelineGroups>>[number];
type LinkedTask = Awaited<ReturnType<typeof listPlannerTasks>>[number];
type NoteSummary = Awaited<ReturnType<typeof listKnowledgeNotes>>[number];
type DraftSummary = Awaited<ReturnType<typeof listWritingDrafts>>[number];
type PostSummary = Awaited<ReturnType<typeof listPublishedWritingPosts>>[number];
type ArchiveSummary = Awaited<ReturnType<typeof listRecentArchiveItems>>[number];

type LensSnapshot = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

type LensAction = {
  label: string;
  href: string;
  description: string;
};

const focusOptions: Array<{
  key: ActivityFocusKey;
  label: string;
  eyebrow: string;
  description: string;
}> = [
  {
    key: "all",
    label: "All",
    eyebrow: "Mixed",
    description: "See everything together."
  },
  {
    key: "planner",
    label: "Execution",
    eyebrow: "Planner",
    description: "Focus on tasks."
  },
  {
    key: "knowledge",
    label: "Thinking",
    eyebrow: "Knowledge",
    description: "Focus on notes."
  },
  {
    key: "writing",
    label: "Publishing",
    eyebrow: "Writing",
    description: "Focus on drafts and posts."
  },
  {
    key: "archive",
    label: "History",
    eyebrow: "Archive",
    description: "Focus on saved records."
  }
];

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
  return [
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
  ].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
}

function filterRecentActivity(items: ActivityItem[], focus: ActivityFocusKey) {
  if (focus === "planner") {
    return items.filter((item) => item.kind === "task");
  }

  if (focus === "knowledge") {
    return items.filter((item) => item.kind === "note");
  }

  if (focus === "writing") {
    return items.filter((item) => item.kind === "draft" || item.kind === "post");
  }

  if (focus === "archive") {
    return items.filter((item) => item.kind === "archive");
  }

  return items;
}

function filterLinkedTasks(tasks: LinkedTask[], focus: ActivityFocusKey) {
  if (focus === "knowledge") {
    return tasks.filter((task) => Boolean(task.relatedNoteTitle));
  }

  if (focus === "writing") {
    return tasks.filter((task) => Boolean(task.relatedDraftTitle));
  }

  if (focus === "archive") {
    return [] as LinkedTask[];
  }

  return tasks;
}

function filterTimelineGroups(groups: TimelineGroup[], focus: ActivityFocusKey) {
  if (focus === "planner") {
    return [] as TimelineGroup[];
  }

  return groups
    .map((group) => {
      let items = group.items;

      if (focus === "knowledge") {
        items = items.filter((item) => item.sourceType === "NOTE");
      } else if (focus === "writing") {
        items = items.filter((item) => item.sourceType === "POST");
      }

      return {
        ...group,
        items,
        itemCount: items.length
      };
    })
    .filter((group) => group.itemCount > 0);
}

function buildLensSnapshot(focus: ActivityFocusKey, counts: { activity: number; threads: number; timelineGroups: number; timelineRecords: number }): LensSnapshot {
  if (focus === "planner") {
    return {
      title: "Execution is carrying the lens",
      description: `You have ${counts.activity} visible task moves and ${counts.threads} linked thread${counts.threads === 1 ? "" : "s"} in view. This is the best mode for deciding what should move next.`,
      ctaLabel: "Open planner",
      ctaHref: "/planner"
    };
  }

  if (focus === "knowledge") {
    return {
      title: "Thinking traces are in focus",
      description: `This lens currently shows ${counts.activity} note updates, ${counts.threads} note-linked thread${counts.threads === 1 ? "" : "s"}, and ${counts.timelineRecords} knowledge archive record${counts.timelineRecords === 1 ? "" : "s"}.`,
      ctaLabel: "Open knowledge",
      ctaHref: "/knowledge"
    };
  }

  if (focus === "writing") {
    return {
      title: "Publishing work is surfaced",
      description: `The hub is tracking ${counts.activity} writing motions across drafts and published entries, plus ${counts.threads} draft-linked thread${counts.threads === 1 ? "" : "s"} feeding that stream.`,
      ctaLabel: "Open writing",
      ctaHref: "/writing"
    };
  }

  if (focus === "archive") {
    return {
      title: "Durable history is leading",
      description: `You currently have ${counts.activity} archive activity card${counts.activity === 1 ? "" : "s"} and ${counts.timelineRecords} replayable record${counts.timelineRecords === 1 ? "" : "s"} spread across ${counts.timelineGroups} day group${counts.timelineGroups === 1 ? "" : "s"}.`,
      ctaLabel: "Open archive",
      ctaHref: "/archive"
    };
  }

  return {
    title: "The whole workstation is visible",
    description: `This mixed lens currently surfaces ${counts.activity} activity cards, ${counts.threads} linked thread${counts.threads === 1 ? "" : "s"}, and ${counts.timelineRecords} archive record${counts.timelineRecords === 1 ? "" : "s"} across ${counts.timelineGroups} day group${counts.timelineGroups === 1 ? "" : "s"}.`,
    ctaLabel: "Open Command Center",
    ctaHref: "/search"
  };
}

function buildLensActions(input: {
  focus: ActivityFocusKey;
  tasks: LinkedTask[];
  notes: NoteSummary[];
  drafts: DraftSummary[];
  posts: PostSummary[];
  archiveItems: ArchiveSummary[];
}): LensAction[] {
  const latestTask = input.tasks[0];
  const latestNote = input.notes[0];
  const latestDraft = input.drafts[0];
  const latestPost = input.posts[0];
  const latestArchive = input.archiveItems.find((item) => item.href);

  if (input.focus === "planner") {
    return [
      { label: "Create task", href: "/planner/new", description: "Start a fresh execution thread from the planner." },
      latestTask
        ? { label: "Refine latest task", href: `/planner/${latestTask.id}/edit`, description: `Re-enter '${latestTask.title}' while its execution context is still fresh.` }
        : { label: "Open planner", href: "/planner", description: "Review the full execution queue." },
      latestNote
        ? { label: "Task from latest note", href: `/planner/new?note=${latestNote.slug}`, description: `Turn '${latestNote.title}' into an actionable thread.` }
        : { label: "Capture note first", href: "/knowledge/new", description: "Seed the planner from a new knowledge note." }
    ];
  }

  if (input.focus === "knowledge") {
    return [
      { label: "Capture note", href: "/knowledge/new", description: "Start a new note while this thinking lens is active." },
      latestNote
        ? { label: "Re-open latest note", href: `/knowledge/${latestNote.slug}`, description: `Continue shaping '${latestNote.title}'.` }
        : { label: "Open knowledge", href: "/knowledge", description: "Browse the full note library." },
      latestDraft && latestNote
        ? { label: "Thread note into draft", href: `/writing/new?sourceNote=${latestNote.slug}`, description: `Carry '${latestNote.title}' forward into the writing stream.` }
        : { label: "Open writing", href: "/writing", description: "Move recent thinking toward writing when you're ready." }
    ];
  }

  if (input.focus === "writing") {
    return [
      { label: "Create draft", href: "/writing/new", description: "Start a new draft directly from the publishing lens." },
      latestDraft
        ? { label: "Continue latest draft", href: `/writing/drafts/${latestDraft.id}`, description: `Keep '${latestDraft.title}' moving toward publish.` }
        : { label: "Open writing", href: "/writing", description: "Review all drafts and published writing." },
      latestPost
        ? { label: "Read latest post", href: `/writing/${latestPost.slug}`, description: `Revisit '${latestPost.title}' from the published stream.` }
        : { label: "Publish next piece", href: "/writing", description: "Open the writing feed and push a draft across the line." }
    ];
  }

  if (input.focus === "archive") {
    return [
      { label: "Open archive", href: "/archive", description: "Step into the full record layer with filters and favorites." },
      latestArchive?.href
        ? { label: "Re-open latest record", href: latestArchive.href, description: `Return to '${latestArchive.title}' from the archive stream.` }
        : { label: "Open archive", href: "/archive", description: "Open the archive now and let records accumulate into a stronger replay surface over time." },
      { label: "Review history timeline", href: "/activity?focus=archive#history-timeline", description: "Jump straight to the slower day-grouped replay lane." }
    ];
  }

  return [
    { label: "Open Command Center", href: "/search", description: "Switch from replay into a search-or-command flow." },
    latestTask
      ? { label: "Refine latest task", href: `/planner/${latestTask.id}/edit`, description: `Move '${latestTask.title}' while the whole workstation is visible.` }
      : { label: "Plan new task", href: "/planner/new", description: "Create the next unit of work from the mixed lens." },
    latestDraft
      ? { label: "Continue latest draft", href: `/writing/drafts/${latestDraft.id}`, description: `Re-enter '${latestDraft.title}' without leaving the hub.` }
      : latestNote
        ? { label: "Draft from latest note", href: `/writing/new?sourceNote=${latestNote.slug}`, description: `Turn '${latestNote.title}' into a fresh draft.` }
        : { label: "Capture note", href: "/knowledge/new", description: "Seed the workstation with a new note." }
  ];
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
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

function focusEmptyState(focus: ActivityFocusKey, section: "activity" | "threads" | "timeline") {
  if (section === "threads") {
    if (focus === "archive") {
      return "Archive focus hides live task threads. Switch back to All Motion, Execution, Knowledge, or Publishing to see linked work.";
    }

    if (focus === "knowledge") {
      return "No note-linked task threads yet. Create tasks from notes to build a thinking-to-execution trail.";
    }

    if (focus === "writing") {
      return "No draft-linked task threads yet. Create tasks from drafts to make writing work easier to re-enter.";
    }

    return "No linked work threads yet. Create tasks from notes or drafts to make this hub more useful.";
  }

  if (section === "timeline") {
    if (focus === "planner") {
      return "Planner focus does not have a durable archive stream yet. Switch to another lens to re-enter the record layer.";
    }

    if (focus === "knowledge") {
      return "No knowledge-backed archive history yet. Updating notes will start to build this replay lane.";
    }

    if (focus === "writing") {
      return "No published-writing archive history yet. Publish a draft to start building this slower replay lane.";
    }

    return "No archive history yet. As the workstation accumulates more notes and posts, the day-grouped replay will appear here.";
  }

  if (focus === "planner") {
    return "No planner motion yet. As tasks are created and updated, the execution stream will begin to form here.";
  }

  if (focus === "knowledge") {
    return "No knowledge movement yet. Capture or revise a note to begin the thinking stream.";
  }

  if (focus === "writing") {
    return "No writing movement yet. Update a draft or publish an entry to begin this lens.";
  }

  if (focus === "archive") {
    return "No archive activity yet. The record layer will begin to form here as notes and posts are preserved.";
  }

  return "No recent activity yet. As the workstation accumulates more movement, the hub will begin to show a shared replay stream here.";
}

export default async function ActivityHubPage({ searchParams }: ActivityPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const storedFocus = await getPreferredActivityFocus();
  const requestedFocus = resolvedSearchParams?.focus;
  const focus = requestedFocus === "all" || requestedFocus === "planner" || requestedFocus === "knowledge" || requestedFocus === "writing" || requestedFocus === "archive"
    ? resolveActivityFocus(requestedFocus)
    : storedFocus;

  const [tasks, notes, drafts, posts, archiveItems, timelineGroups, rememberedWorkflow] = await Promise.all([
    listPlannerTasks(12),
    listKnowledgeNotes(8),
    listWritingDrafts(8),
    listPublishedWritingPosts(),
    listRecentArchiveItems(12),
    listArchiveTimelineGroups(24),
    getRememberedWorkflowSummary()
  ]);

  const recentActivity = filterRecentActivity(buildRecentActivity({ tasks, notes, drafts, posts, archiveItems }), focus).slice(0, 12);
  const linkedTasks = filterLinkedTasks(tasks.filter((task) => task.relatedNoteTitle || task.relatedDraftTitle), focus).slice(0, 6);
  const filteredTimelineGroups = filterTimelineGroups(timelineGroups, focus);
  const activeFocus = focusOptions.find((item) => item.key === focus) ?? focusOptions[0];
  const timelineRecordCount = filteredTimelineGroups.reduce((total, group) => total + group.itemCount, 0);
  const lensSnapshot = buildLensSnapshot(focus, {
    activity: recentActivity.length,
    threads: linkedTasks.length,
    timelineGroups: filteredTimelineGroups.length,
    timelineRecords: timelineRecordCount
  });
  const lensActions = buildLensActions({
    focus,
    tasks,
    notes,
    drafts,
    posts,
    archiveItems
  });
  const primaryLaunch = getActivityFocusNextStep(focus);
  const secondaryLaunches = lensActions.filter((action) => action.href !== primaryLaunch.href).slice(0, 2);
  const suggestedWorkflowKey = focus === "planner" || focus === "knowledge" || focus === "writing" || focus === "archive" ? focus : null;
  const suggestedWorkflow = suggestedWorkflowKey ? getSearchModuleStackMeta(suggestedWorkflowKey) : null;

  return (
    <ShellLayout
      title="Activity Hub"
      description="Recent activity, linked tasks, and archive history."
    >
      <WorkspaceViewNav
        eyebrow="Sections"
        title="Jump to a section"
        items={[
          {
            label: "Recent Activity",
            href: buildActivityHref(focus, "#recent-activity"),
            description: "See the latest updates."
          },
          {
            label: "Work Threads",
            href: buildActivityHref(focus, "#work-threads"),
            description: "Open linked tasks."
          },
          {
            label: "History Timeline",
            href: buildActivityHref(focus, "#history-timeline"),
            description: "Browse archive history by day."
          }
        ]}
      />

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Focus</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">Choose what to show</h2>
          </div>
          <span className="text-sm text-foreground/50">Current: {activeFocus.label}</span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {focusOptions.map((option) => {
            const isActive = option.key === focus;

            return (
              <ActivityFocusLink
                key={option.key}
                href={buildActivityHref(option.key)}
                focus={option.key}
                className={`rounded-[1.5rem] p-5 shadow-ambient transition ${
                  isActive ? "bg-primary text-white" : "bg-white/80 text-foreground hover:translate-y-[-1px]"
                }`}
              >
                <p className={`text-xs uppercase tracking-[0.2em] ${isActive ? "text-white/80" : "text-primary"}`}>{option.eyebrow}</p>
                <h3 className="mt-3 font-headline text-2xl">{option.label}</h3>
                <p className={`mt-3 text-sm leading-6 ${isActive ? "text-white/80" : "text-foreground/70"}`}>{option.description}</p>
              </ActivityFocusLink>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Pinned Focus</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">{rememberedWorkflow.active ? rememberedWorkflow.title : "No pinned focus"}</h2>
          </div>
          <Link href={rememberedWorkflow.href} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
            {rememberedWorkflow.active ? "Open Focus" : "Open Search"}
          </Link>
        </div>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-foreground/70">{rememberedWorkflow.summary}</p>
      </section>

      {!rememberedWorkflow.active && suggestedWorkflow ? (
        <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Suggestion</p>
              <h2 className="mt-3 font-headline text-3xl text-foreground">Pin {suggestedWorkflow.title}</h2>
            </div>
            <Link href={buildSearchModuleStackHref(suggestedWorkflowKey!, "/activity")} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
              Pin {suggestedWorkflow.title}
            </Link>
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-foreground/70">{suggestedWorkflow.summary}</p>
        </section>
      ) : null}
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Summary</p>
          <h2 className="mt-3 font-headline text-3xl text-foreground">{lensSnapshot.title}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/70">{lensSnapshot.description}</p>
          <Link href={lensSnapshot.ctaHref} className="mt-5 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
            {lensSnapshot.ctaLabel}
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          <div className="rounded-[1.5rem] bg-surface-container-low p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Activity</p>
            <p className="mt-3 font-headline text-3xl text-foreground">{recentActivity.length}</p>
            <p className="mt-2 text-sm text-foreground/60">Items shown</p>
          </div>
          <div className="rounded-[1.5rem] bg-surface-container-low p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Threads</p>
            <p className="mt-3 font-headline text-3xl text-foreground">{linkedTasks.length}</p>
            <p className="mt-2 text-sm text-foreground/60">Linked tasks</p>
          </div>
          <div className="rounded-[1.5rem] bg-surface-container-low p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Days</p>
            <p className="mt-3 font-headline text-3xl text-foreground">{filteredTimelineGroups.length}</p>
            <p className="mt-2 text-sm text-foreground/60">Days shown</p>
          </div>
          <div className="rounded-[1.5rem] bg-surface-container-low p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Records</p>
            <p className="mt-3 font-headline text-3xl text-foreground">{timelineRecordCount}</p>
            <p className="mt-2 text-sm text-foreground/60">Archive records</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Next Step</p>
          <h2 className="mt-3 font-headline text-3xl text-foreground">Start from {activeFocus.label}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/70">{primaryLaunch.description}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {rememberedWorkflow.active ? (
              <>
                <span className="rounded-full bg-white px-3 py-1 text-[10px] shadow-ambient">Pinned {rememberedWorkflow.title}</span>
                <Link href={rememberedWorkflow.href}>Open focus</Link>
              </>
            ) : (
              <span className="rounded-full bg-white px-3 py-1 text-[10px] shadow-ambient">No pinned focus</span>
            )}
          </div>
          <Link href={primaryLaunch.href} className="mt-5 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
            {primaryLaunch.label}
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          {secondaryLaunches.map((action) => (
            <Link key={action.label + action.href} href={action.href} className="rounded-[1.5rem] bg-surface-container-low p-5 shadow-ambient transition hover:translate-y-[-1px]">
              <p className="text-sm font-semibold text-primary">{action.label}</p>
              <p className="mt-3 text-sm leading-6 text-foreground/70">{action.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Actions</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">Quick actions</h2>
          </div>
          <span className="text-sm text-foreground/50">{lensActions.length} actions available</span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {lensActions.map((action) => (
            <Link key={`${action.label}-${action.href}`} href={action.href} className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient transition hover:translate-y-[-1px]">
              <p className="text-sm font-semibold text-primary">{action.label}</p>
              <p className="mt-3 text-sm leading-6 text-foreground/70">{action.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="recent-activity" className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Recent Activity</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">Latest updates</h2>
          </div>
          <span className="text-sm text-foreground/50">{recentActivity.length} visible activity cards</span>
        </div>
        {recentActivity.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recentActivity.map((item) => (
              <article key={item.id} className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">{item.badge}</p>
                  <p className="text-xs text-foreground/50">{formatTimestamp(item.timestamp)}</p>
                </div>
                <h3 className="mt-3 font-headline text-2xl text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-foreground/70">{item.summary}</p>
                <Link href={item.href} className="mt-4 inline-flex text-sm font-semibold text-primary">
                  Re-open item
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.5rem] bg-white/80 p-4 text-sm text-foreground/60">
            {focusEmptyState(focus, "activity")}
          </div>
        )}
      </section>

      <section id="work-threads" className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Work Threads</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">Linked tasks</h2>
          </div>
          <span className="text-sm text-foreground/50">{linkedTasks.length} linked tasks</span>
        </div>
        {linkedTasks.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {linkedTasks.map((task) => (
              <article key={task.id} className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">{task.status} | {task.priority}</p>
                  <p className="text-xs text-foreground/50">{formatTimestamp(task.updatedAt)}</p>
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
            {focusEmptyState(focus, "threads")}
          </div>
        )}
      </section>

      <section id="history-timeline" className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">History Timeline</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">Archive by day</h2>
          </div>
          <span className="text-sm text-foreground/50">{filteredTimelineGroups.length} day groups</span>
        </div>
        {filteredTimelineGroups.length > 0 ? (
          <div className="space-y-6">
            {filteredTimelineGroups.map((group) => (
              <section key={group.key} className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-primary">Timeline Group</p>
                    <h3 className="mt-2 font-headline text-2xl text-foreground">{group.label}</h3>
                  </div>
                  <span className="text-sm text-foreground/50">{group.itemCount} records</span>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((item) => (
                    <article key={item.id} className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-primary">{item.badge}</p>
                        <p className="text-xs text-foreground/50">{new Date(item.updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <h4 className="mt-3 font-headline text-xl text-foreground">{item.title}</h4>
                      <p className="mt-3 text-sm leading-6 text-foreground/70">{item.summary || "No summary stored for this archive record yet."}</p>
                      {item.href ? (
                        <Link href={item.href} className="mt-4 inline-flex text-sm font-semibold text-primary">
                          Re-open record
                        </Link>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
            {focusEmptyState(focus, "timeline")}
          </div>
        )}
      </section>
    </ShellLayout>
  );
}











