export const dynamic = "force-dynamic";

import Link from "next/link";

import { ActivityFocusLink } from "@/components/activity/activity-focus-link";
import { ShellLayout } from "@/components/shell/shell-layout";
import { WorkspaceViewNav } from "@/components/shell/workspace-view-nav";
import { listRecentArchiveItems, listArchiveTimelineGroups } from "@/server/archive/service";
import { getPreferredActivityFocus } from "@/server/activity/preferences";
import { buildActivityHref, getActivityFocusLabel, getActivityFocusNextStep, resolveActivityFocus } from "@/lib/activity-focus";
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
    label: "All Motion",
    eyebrow: "Mixed Lens",
    description: "See the full workstation replay with execution, thinking, publishing, and archive history mixed together."
  },
  {
    key: "planner",
    label: "Execution",
    eyebrow: "Planner Lens",
    description: "Bias the hub toward active task motion and the threads that still need execution context."
  },
  {
    key: "knowledge",
    label: "Thinking",
    eyebrow: "Knowledge Lens",
    description: "Follow note updates, note-linked tasks, and knowledge records entering the archive."
  },
  {
    key: "writing",
    label: "Publishing",
    eyebrow: "Writing Lens",
    description: "Focus on draft movement, published entries, and the task threads feeding writing work."
  },
  {
    key: "archive",
    label: "History",
    eyebrow: "Archive Lens",
    description: "Slow the view down and re-enter the durable record layer without the live execution noise."
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
      ctaLabel: "打开规划",
      ctaHref: "/planner"
    };
  }

  if (focus === "knowledge") {
    return {
      title: "Thinking traces are in focus",
      description: `当前视角下有 ${counts.activity} 条笔记动态、${counts.threads} 条与笔记关联的线程，以及 ${counts.timelineRecords} 条知识归档记录可供回看。`,
      ctaLabel: "打开知识库",
      ctaHref: "/knowledge"
    };
  }

  if (focus === "writing") {
    return {
      title: "Publishing work is surfaced",
      description: `The hub is tracking ${counts.activity} writing motions across drafts and published entries, plus ${counts.threads} draft-linked thread${counts.threads === 1 ? "" : "s"} feeding that stream.`,
      ctaLabel: "打开写作",
      ctaHref: "/writing"
    };
  }

  if (focus === "archive") {
    return {
      title: "Durable history is leading",
      description: `当前视角下有 ${counts.activity} 条归档动态、${counts.timelineRecords} 条可回放记录，分布在 ${counts.timelineGroups} 个时间分组中。`,
      ctaLabel: "打开归档",
      ctaHref: "/archive"
    };
  }

  return {
    title: "The whole workstation is visible",
    description: `当前混合视角下有 ${counts.activity} 条活动卡片、${counts.threads} 条关联线程，以及 ${counts.timelineRecords} 条归档记录，分布在 ${counts.timelineGroups} 个时间分组中。`,
    ctaLabel: "打开指令中心",
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
        : { label: "打开规划", href: "/planner", description: "查看完整执行队列。" },
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
        : { label: "打开知识库", href: "/knowledge", description: "查看完整笔记库。" },
      latestDraft && latestNote
        ? { label: "Thread note into draft", href: `/writing/new?sourceNote=${latestNote.slug}`, description: `Carry '${latestNote.title}' forward into the writing stream.` }
        : { label: "打开写作", href: "/writing", description: "在准备好时把近期思路推进到写作线。" }
    ];
  }

  if (input.focus === "writing") {
    return [
      { label: "Create draft", href: "/writing/new", description: "Start a new draft directly from the publishing lens." },
      latestDraft
        ? { label: "Continue latest draft", href: `/writing/drafts/${latestDraft.id}`, description: `Keep '${latestDraft.title}' moving toward publish.` }
        : { label: "打开写作", href: "/writing", description: "查看全部草稿和已发布内容。" },
      latestPost
        ? { label: "Read latest post", href: `/writing/${latestPost.slug}`, description: `Revisit '${latestPost.title}' from the published stream.` }
        : { label: "推进下一篇发布", href: "/writing", description: "打开写作面板，把一篇草稿推过发布线。" }
    ];
  }

  if (input.focus === "archive") {
    return [
      { label: "打开归档", href: "/archive", description: "进入完整记录层，查看筛选和收藏。" },
      latestArchive?.href
        ? { label: "Re-open latest record", href: latestArchive.href, description: `Return to '${latestArchive.title}' from the archive stream.` }
        : { label: "打开归档", href: "/archive", description: "回到归档层，让记录逐步沉淀成更稳的回放界面。" },
      { label: "Review history timeline", href: "/activity?focus=archive#history-timeline", description: "Jump straight to the slower day-grouped replay lane." }
    ];
  }

  return [
    { label: "打开指令中心", href: "/search", description: "从回放切换到搜索与指令流。" },
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
  const focus = resolvedSearchParams?.focus ? resolveActivityFocus(resolvedSearchParams.focus) : storedFocus;

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
  const suggestedWorkflow = focus === "planner" ? getSearchModuleStackMeta("planner") : focus === "knowledge" ? getSearchModuleStackMeta("knowledge") : focus === "writing" ? getSearchModuleStackMeta("writing") : focus === "archive" ? getSearchModuleStackMeta("archive") : null;

  return (
    <ShellLayout
      title="活动中心"
      description="这是工作站的专用回放界面，把跨模块动态、关联工作线程和归档历史汇总到同一个入口。"
    >
      <WorkspaceViewNav
        eyebrow="回放视图"
        title="在实时动态、关联工作和历史沉淀之间切换"
        items={[
          {
            label: "近期活动",
            href: buildActivityHref(focus, "#recent-activity"),
            description: "从最近发生变化的跨模块总流开始回看。"
          },
          {
            label: "关联线程",
            href: buildActivityHref(focus, "#work-threads"),
            description: "直接进入仍然带有笔记与草稿上下文的任务线程。"
          },
          {
            label: "历史时间线",
            href: buildActivityHref(focus, "#history-timeline"),
            description: "当你需要更慢节奏的上下文时，回到按天分组的归档时间线。"
          }
        ]}
      />

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">视角切换</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">Tune the replay surface without leaving the hub</h2>
          </div>
          <span className="text-sm text-foreground/50">当前视角：{activeFocus.label} {focus === storedFocus ? "| 已保存为回到入口" : "| 之前的恢复目标是 " + getActivityFocusLabel(storedFocus)}</span>
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
            <p className="text-xs uppercase tracking-[0.2em] text-primary">记忆工作流</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">{rememberedWorkflow.active ? `${rememberedWorkflow.title} is still riding underneath this replay` : "This replay is currently running without a pinned workflow"}</h2>
          </div>
          <Link href={rememberedWorkflow.href} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
            {rememberedWorkflow.active ? "打开工作流" : "打开指令台"}
          </Link>
        </div>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-foreground/70">{rememberedWorkflow.summary} {rememberedWorkflow.active ? "The hub keeps that workflow visible so the active lens never fully erases the lane you pinned on purpose." : "Without a pinned workflow, the hub will follow the active lens and replay habit more directly."}</p>
      </section>

      {!rememberedWorkflow.active && suggestedWorkflow ? (
        <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary">工作流建议</p>
              <h2 className="mt-3 font-headline text-3xl text-foreground">Pin {suggestedWorkflow.title} if this lens should keep shaping the desk</h2>
            </div>
            <Link href={buildSearchModuleStackHref(focus, "/activity")} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
              Pin {suggestedWorkflow.title}
            </Link>
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-foreground/70">{suggestedWorkflow.summary} 当前你已经位于 {activeFocus.label} 视角，固定这条工作流后，整张桌面会持续保留这条通道的热度，而不只是依赖回放姿态自行推断。</p>
        </section>
      ) : null}
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">视角快照</p>
          <h2 className="mt-3 font-headline text-3xl text-foreground">{lensSnapshot.title}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/70">{lensSnapshot.description} {rememberedWorkflow.active ? `${rememberedWorkflow.title} 仍在这条视角下持续影响回放顺序。` : "当前没有固定工作流覆盖这条视角。"}</p>
          <Link href={lensSnapshot.ctaHref} className="mt-5 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
            {lensSnapshot.ctaLabel}
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          <div className="rounded-[1.5rem] bg-surface-container-low p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">动态</p>
            <p className="mt-3 font-headline text-3xl text-foreground">{recentActivity.length}</p>
            <p className="mt-2 text-sm text-foreground/60">当前视角下可见的活动卡片数。</p>
          </div>
          <div className="rounded-[1.5rem] bg-surface-container-low p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">线程</p>
            <p className="mt-3 font-headline text-3xl text-foreground">{linkedTasks.length}</p>
            <p className="mt-2 text-sm text-foreground/60">Linked tasks still carrying upstream context.</p>
          </div>
          <div className="rounded-[1.5rem] bg-surface-container-low p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Days</p>
            <p className="mt-3 font-headline text-3xl text-foreground">{filteredTimelineGroups.length}</p>
            <p className="mt-2 text-sm text-foreground/60">Timeline day groups visible right now.</p>
          </div>
          <div className="rounded-[1.5rem] bg-surface-container-low p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">记录</p>
            <p className="mt-3 font-headline text-3xl text-foreground">{timelineRecordCount}</p>
            <p className="mt-2 text-sm text-foreground/60">Replayable archive records in this lens.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">视角启动面</p>
          <h2 className="mt-3 font-headline text-3xl text-foreground">从 {activeFocus.label} 视角继续</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/70">{primaryLaunch.description}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {rememberedWorkflow.active ? (
              <>
                <span className="rounded-full bg-white px-3 py-1 text-[10px] shadow-ambient">固定 {rememberedWorkflow.title}</span>
                <Link href={rememberedWorkflow.href}>返回工作流</Link>
              </>
            ) : (
              <span className="rounded-full bg-white px-3 py-1 text-[10px] shadow-ambient">当前未固定工作流</span>
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
            <p className="text-xs uppercase tracking-[0.2em] text-primary">From This Lens</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">Start the next move without leaving the hub</h2>
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
            <p className="text-xs uppercase tracking-[0.2em] text-primary">近期活动</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">The latest movement across the workstation</h2>
          </div>
          <span className="text-sm text-foreground/50">{recentActivity.length} 条可见活动</span>
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
            <p className="text-xs uppercase tracking-[0.2em] text-primary">关联线程</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">Tasks that still remember where they came from</h2>
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
                  打开线程任务
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
            <p className="text-xs uppercase tracking-[0.2em] text-primary">历史时间线</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">Archive history grouped by day</h2>
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















