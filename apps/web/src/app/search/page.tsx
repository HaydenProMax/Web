import Link from "next/link";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import type { ArchiveItemSummary, KnowledgeNoteSummary, ModuleKey, PlannerTaskSummary, SearchResultGroup, SearchResultItem, WritingDraftSummary } from "@workspace/types/index";

import type { ActivityFocusKey } from "@/lib/activity-focus";
import { SEARCH_DENSITY_COOKIE, normalizeDeskDensity } from "@/lib/search-density";
import { buildClearSearchModuleStackHref, SEARCH_MODULE_STACK_COOKIE, parseSearchModuleStack } from "@/lib/search-module-stack";
import { ShellLayout } from "@/components/shell/shell-layout";
import { getPreferredActivityReentry } from "@/server/activity/preferences";
import { listRecentArchiveItems } from "@/server/archive/service";
import { listKnowledgeNotes } from "@/server/knowledge/service";
import { listPlannerTasks } from "@/server/planner/service";
import { searchWorkspace } from "@/server/search/service";
import { getSystemPostureSnapshot } from "@/server/settings/service";
import { listWritingDrafts } from "@/server/writing/service";

export const dynamic = "force-dynamic";

type CommandSections = ReturnType<typeof splitCommandItems>;
type ModuleCommandStack = {
  key: Extract<ModuleKey, "planner" | "knowledge" | "writing" | "archive">;
  title: string;
  description: string;
  items: SearchResultItem[];
  href: string;
};

type LiveSignalCard = {
  key: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  pills: string[];
};

type ThreadPickCard = {
  key: string;
  title: string;
  description: string;
  taskHref: string;
  taskCta: string;
  noteHref?: string;
  noteLabel?: string;
  draftHref?: string;
  draftLabel?: string;
  pills: string[];
};

function orderSearchGroupsByWorkflow(groups: SearchResultGroup[], rememberedStackKey?: ModuleCommandStack["key"]) {
  if (!rememberedStackKey) {
    return groups;
  }

  return [...groups].sort((left, right) => {
    const biasDiff = Number(right.module === rememberedStackKey) - Number(left.module === rememberedStackKey);
    if (biasDiff !== 0) {
      return biasDiff;
    }

    return 0;
  });
}

function getSearchPostureCopy(query: string, rememberedStack?: ModuleCommandStack, resultCount?: number) {
  if (!rememberedStack) {
    return `Search is scanning the full workstation for '${query}'.`;
  }

  return `Search is scanning the full workstation for '${query}', but ${rememberedStack.title} remains the remembered workflow lane${typeof resultCount === "number" ? ` with ${resultCount} visible module group${resultCount === 1 ? "" : "s"}` : ""}.`;
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const normalizedQuery = query.toLowerCase();
  const normalizedText = text.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const index = normalizedText.indexOf(normalizedQuery, cursor);
    if (index === -1) {
      parts.push(text.slice(cursor));
      break;
    }

    if (index > cursor) {
      parts.push(text.slice(cursor, index));
    }

    const match = text.slice(index, index + query.length);
    parts.push(
      <mark key={`${index}-${match}`} className="rounded bg-primary-container px-1 text-primary">
        {match}
      </mark>
    );

    cursor = index + query.length;
  }

  return <>{parts}</>;
}

function getDeskSectionCurationCopy(priority: number | null, label: string) {
  if (priority === 1) {
    return label + " should stay at the front of the desk right now.";
  }

  if (priority !== null && priority <= 3) {
    return label + " is part of the active reading lane for this replay lens.";
  }

  return label + " can stay in reserve until the higher-priority surfaces are exhausted.";
}

function buildSearchDensityHref(query: string, density: "comfortable" | "compact") {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("q", query);
  }
  if (density === "compact") {
    params.set("density", density);
  }

  const serialized = params.toString();
  const nextPath = serialized ? "/search?" + serialized : "/search";
  return "/search/density?value=" + density + "&next=" + encodeURIComponent(nextPath);
}

function splitCommandItems(items: SearchResultItem[]) {
  return {
    lens: items.filter((item) => item.meta === "Lens"),
    quickActions: items.filter((item) => item.meta === "Quick Action"),
    contextual: items.filter((item) => item.meta === "Contextual"),
    navigation: items.filter((item) => item.meta === "Navigation")
  };
}

function dedupeItems(items: SearchResultItem[]) {
  return items.filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index);
}

function dedupeItemsByHref(items: SearchResultItem[]) {
  return items.filter((item, index, array) => array.findIndex((candidate) => candidate.href === item.href) === index);
}

function matchByPrefix(items: SearchResultItem[], prefix: string) {
  return items.filter((item) => item.href.startsWith(prefix));
}

function buildThreadPicks(tasks: PlannerTaskSummary[]): ThreadPickCard[] {
  return tasks
    .filter((task) => task.relatedNoteTitle || task.relatedDraftTitle)
    .slice(0, 3)
    .map((task) => {
      const labels = [task.status, `${task.priority} priority`];
      if (task.relatedNoteTitle) {
        labels.push("linked note");
      }
      if (task.relatedDraftTitle) {
        labels.push("linked draft");
      }

      let description = task.description || "A cross-module work thread is live and ready to be moved forward.";
      if (task.relatedNoteTitle && task.relatedDraftTitle) {
        description = `This task is carrying '${task.relatedNoteTitle}' and '${task.relatedDraftTitle}' together. Push the thread before the execution and writing context drift apart.`;
      } else if (task.relatedNoteTitle) {
        description = `This task is still tied to note '${task.relatedNoteTitle}'. Use it to keep the thinking thread connected to execution.`;
      } else if (task.relatedDraftTitle) {
        description = `This task is still tied to draft '${task.relatedDraftTitle}'. Use it to keep writing and execution in the same lane.`;
      }

      return {
        key: task.id,
        title: task.title,
        description,
        taskHref: `/planner/${task.id}/edit`,
        taskCta: "Open thread task",
        noteHref: task.relatedNoteSlug ? `/knowledge/${task.relatedNoteSlug}` : undefined,
        noteLabel: task.relatedNoteTitle,
        draftHref: task.relatedDraftId ? `/writing/drafts/${task.relatedDraftId}` : undefined,
        draftLabel: task.relatedDraftTitle,
        pills: labels
      };
    });
}

function buildFocusQueue(input: {
  focus: ActivityFocusKey;
  tasks: PlannerTaskSummary[];
  notes: KnowledgeNoteSummary[];
  drafts: WritingDraftSummary[];
  archiveItems: ArchiveItemSummary[];
  threadPicks: ThreadPickCard[];
}): Array<{ key: string; eyebrow: string; title: string; description: string; href: string; cta: string; pills: string[] }> {
  if (input.focus === "planner") {
    return input.tasks.slice(0, 3).map((task) => ({
      key: `focus-task-${task.id}`,
      eyebrow: "Execution Queue",
      title: task.title,
      description: task.description || "Keep the next execution thread moving while the workstation is biased toward planner work.",
      href: `/planner/${task.id}/edit`,
      cta: "Open task",
      pills: [task.status, `${task.priority} priority`]
    }));
  }

  if (input.focus === "knowledge") {
    return input.notes.slice(0, 3).map((note) => ({
      key: `focus-note-${note.id}`,
      eyebrow: "Thinking Queue",
      title: note.title,
      description: note.summary || "Re-open this note while the workstation is tuned for synthesis and note-first movement.",
      href: `/knowledge/${note.slug}`,
      cta: "Open note",
      pills: [note.domainName ?? "Knowledge", `${note.contentBlockCount} blocks`]
    }));
  }

  if (input.focus === "writing") {
    return input.drafts.slice(0, 3).map((draft) => ({
      key: `focus-draft-${draft.id}`,
      eyebrow: "Publishing Queue",
      title: draft.title,
      description: draft.summary || "Re-enter this draft while the workstation is tuned to publishing momentum.",
      href: `/writing/drafts/${draft.id}`,
      cta: "Resume draft",
      pills: [draft.visibility, `${draft.contentBlockCount} blocks`]
    }));
  }

  if (input.focus === "archive") {
    return input.archiveItems.slice(0, 3).map((item) => ({
      key: `focus-archive-${item.id}`,
      eyebrow: "History Queue",
      title: item.title,
      description: item.summary || "Re-open this durable record while the workstation is tuned for slower replay.",
      href: item.href ?? "/archive",
      cta: item.href ? "Open source" : "Open archive",
      pills: [item.badge, item.isFavorite ? "Favorited" : "Recent"]
    }));
  }

  const threadQueue = input.threadPicks.map((thread) => ({
    key: `focus-thread-${thread.key}`,
    eyebrow: "Mixed Queue",
    title: thread.title,
    description: thread.description,
    href: thread.taskHref,
    cta: thread.taskCta,
    pills: thread.pills
  }));

  const noteQueue = input.notes.slice(0, 2).map((note) => ({
    key: `focus-note-${note.id}`,
    eyebrow: "Mixed Queue",
    title: note.title,
    description: note.summary || "Fresh note ready for synthesis or handoff.",
    href: `/knowledge/${note.slug}`,
    cta: "Open note",
    pills: [note.domainName ?? "Knowledge", `${note.contentBlockCount} blocks`]
  }));

  return [...threadQueue, ...noteQueue].slice(0, 3);
}
function getAlignedModuleRail(
  moduleKey: ModuleKey,
  sections: CommandSections,
  activityHref: string,
  rememberedStack?: ModuleCommandStack
) {
  const combined = [...sections.quickActions, ...sections.contextual, ...sections.navigation, ...sections.lens];
  const hrefMatchers: Record<ModuleKey, string[]> = {
    dashboard: ["/", "/activity"],
    activity: ["/activity"],
    planner: ["/planner"],
    knowledge: ["/knowledge"],
    writing: ["/writing"],
    archive: ["/archive"],
    modules: ["/modules"],
    settings: ["/settings"]
  };

  const titleMap: Record<ModuleKey, string> = {
    dashboard: "Dashboard Rail",
    activity: "Activity Rail",
    planner: "Execution Rail",
    knowledge: "Thinking Rail",
    writing: "Publishing Rail",
    archive: "History Rail",
    modules: "Registry Rail",
    settings: "Settings Rail"
  };

  const descriptionMap: Record<ModuleKey, string> = {
    dashboard: "Use the dashboard-aligned rail to return to broad workstation control before diving deeper.",
    activity: "Use the activity-aligned rail to move from command posture back into replay posture without losing momentum.",
    planner: "Use the execution-aligned rail to turn the desk into a task-moving surface instead of a generic search page.",
    knowledge: "Use the thinking-aligned rail to keep note capture, synthesis, and note-derived actions near the top of the desk.",
    writing: "Use the publishing-aligned rail to keep draft movement and article re-entry in front of the rest of the stack.",
    archive: "Use the history-aligned rail to move from records and replay back into the exact context worth reopening.",
    modules: "Use the registry-aligned rail to adjust the module layer without leaving the command desk posture.",
    settings: "Use the settings-aligned rail to tune shell behavior when posture refinement matters more than immediate execution."
  };

  let items = combined.filter((item) => hrefMatchers[moduleKey].some((prefix) => item.href.startsWith(prefix)));

  if (moduleKey === "activity") {
    items = [
      ...items,
      ...sections.lens.filter((item) => item.href === activityHref || item.title.toLowerCase().includes("resume"))
    ];
  }

  let description = descriptionMap[moduleKey];
  let rememberedItems: SearchResultItem[] = [];

  if (rememberedStack) {
    if (rememberedStack.key === moduleKey) {
      rememberedItems = rememberedStack.items.map((item) => ({
        ...item,
        id: `aligned-remembered-${item.id}`,
        meta: "Remembered Lane"
      }));
      description += ` This rail is also carrying ${rememberedStack.title}, so its warmest actions stay close to the front.`;
    } else {
      const rememberedLead = rememberedStack.items[0];
      if (rememberedLead) {
        rememberedItems = [{
          ...rememberedLead,
          id: `aligned-remembered-${rememberedLead.id}`,
          meta: "Remembered Lane",
          summary: `Your desk is aligned to ${titleMap[moduleKey].replace(' Rail', '')}, but ${rememberedStack.title} is still pinned as a deliberate re-entry lane.`
        }];
        description += ` The rail also keeps a return path into ${rememberedStack.title} so pinned workflow context does not get lost.`;
      }
    }
  }

  return {
    title: titleMap[moduleKey],
    description,
    items: dedupeItemsByHref([...rememberedItems, ...items]).slice(0, rememberedStack?.key === moduleKey ? 4 : 3)
  };
}

function getModuleCommandStacks(sections: CommandSections): ModuleCommandStack[] {
  const combined = [...sections.quickActions, ...sections.contextual, ...sections.navigation, ...sections.lens];

  const stackDefs: Array<Pick<ModuleCommandStack, "key" | "title" | "description"> & { prefixes: string[] }> = [
    {
      key: "planner",
      title: "Planner Stack",
      description: "Turn the desk into an execution surface with task capture, active-task refinement, and note-to-task bridges.",
      prefixes: ["/planner"]
    },
    {
      key: "knowledge",
      title: "Knowledge Stack",
      description: "Keep note capture, note review, and knowledge-driven drafting paths grouped together while the desk stays open.",
      prefixes: ["/knowledge"]
    },
    {
      key: "writing",
      title: "Writing Stack",
      description: "Keep draft creation, draft continuation, and publishing re-entry together so writing remains warm.",
      prefixes: ["/writing"]
    },
    {
      key: "archive",
      title: "Archive Stack",
      description: "Move from durable records and replay history back into the exact surface worth reopening.",
      prefixes: ["/archive", "/activity"]
    }
  ];

  return stackDefs.map((definition) => {
    const prefixItems = definition.prefixes.flatMap((prefix) => matchByPrefix(combined, prefix));
    const filteredActivityItems = definition.key === "archive"
      ? prefixItems.filter((item) => item.href.startsWith("/archive") || item.title.toLowerCase().includes("history") || item.title.toLowerCase().includes("replay"))
      : prefixItems;

    return {
      key: definition.key,
      title: definition.title,
      description: definition.description,
      items: dedupeItems(filteredActivityItems).slice(0, 3),
      href: `/${definition.key}`
    };
  });
}

function buildLiveSignals(input: {
  tasks: PlannerTaskSummary[];
  notes: KnowledgeNoteSummary[];
  drafts: WritingDraftSummary[];
  archiveItems: ArchiveItemSummary[];
}): LiveSignalCard[] {
  const signals: LiveSignalCard[] = [];

  if (input.tasks.length > 0) {
    const topTask = input.tasks[0];
    signals.push({
      key: "planner",
      eyebrow: "Execution Signal",
      title: `${input.tasks.length} live task${input.tasks.length === 1 ? "" : "s"}`,
      description: `The hottest task right now is '${topTask.title}'. Use the desk to keep execution moving before the queue fragments again.`,
      href: `/planner/${topTask.id}/edit`,
      cta: "Open hottest task",
      pills: [`${topTask.status}`, `${topTask.priority} priority`]
    });
  }

  if (input.notes.length > 0) {
    const topNote = input.notes[0];
    signals.push({
      key: "knowledge",
      eyebrow: "Thinking Signal",
      title: `${input.notes.length} warm note${input.notes.length === 1 ? "" : "s"}`,
      description: `The freshest note is '${topNote.title}'. Re-enter it while the thinking thread is still coherent.`,
      href: `/knowledge/${topNote.slug}`,
      cta: "Open freshest note",
      pills: [topNote.domainName ?? "Knowledge", `${topNote.contentBlockCount} blocks`]
    });
  }

  if (input.drafts.length > 0) {
    const topDraft = input.drafts[0];
    signals.push({
      key: "writing",
      eyebrow: "Publishing Signal",
      title: `${input.drafts.length} active draft${input.drafts.length === 1 ? "" : "s"}`,
      description: `The latest draft is '${topDraft.title}'. A short pass now could keep the publishing lane warm.`,
      href: `/writing/drafts/${topDraft.id}`,
      cta: "Resume latest draft",
      pills: [topDraft.visibility, `${topDraft.contentBlockCount} blocks`]
    });
  }

  if (input.archiveItems.length > 0) {
    const topArchive = input.archiveItems[0];
    signals.push({
      key: "archive",
      eyebrow: "History Signal",
      title: `${input.archiveItems.length} recent archive record${input.archiveItems.length === 1 ? "" : "s"}`,
      description: `The latest durable record is '${topArchive.title}'. Use it when you want to replay before acting.`,
      href: topArchive.href ?? "/archive",
      cta: topArchive.href ? "Open archive source" : "Open archive",
      pills: [topArchive.badge, topArchive.isFavorite ? "Favorited" : "Recent"]
    });
  }

  return signals;
}

function getSectionPriorityIndex(ladder: string[], label: string) {
  const index = ladder.indexOf(label);
  return index === -1 ? null : index + 1;
}

function buildRememberedStackShortcuts(stack?: ModuleCommandStack): SearchResultItem[] {
  if (!stack) {
    return [];
  }

  const rememberedLead = stack.items[1] ?? stack.items[0];

  return dedupeItemsByHref([
    {
      id: `remembered-stack-open-${stack.key}`,
      module: stack.key,
      title: `Open ${stack.title}`,
      summary: `Jump straight back into the remembered ${stack.title.toLowerCase()} before the wider desk starts pulling your attention sideways.`,
      href: stack.href,
      meta: "Remembered Stack"
    },
    ...(rememberedLead
      ? [
          {
            ...rememberedLead,
            id: `remembered-stack-shortcut-${rememberedLead.id}`,
            meta: "Remembered Stack"
          }
        ]
      : [])
  ]);
}
function buildDeskPriorityLadder(
  focus: ActivityFocusKey,
  rememberedStackKey?: ModuleCommandStack["key"],
  alignedModuleKey?: ModuleKey
) {
  const ladder = focus === "planner"
    ? ["Focus Queue", "Cross-Module Thread Picks", "Live Workspace Signals", "Aligned Module Rail", "Module Command Stacks"]
    : focus === "knowledge"
      ? ["Focus Queue", "Live Workspace Signals", "Cross-Module Thread Picks", "Module Command Stacks", "Aligned Module Rail"]
      : focus === "writing"
        ? ["Focus Queue", "Live Workspace Signals", "Module Command Stacks", "Cross-Module Thread Picks", "Aligned Module Rail"]
        : focus === "archive"
          ? ["Focus Queue", "Aligned Module Rail", "Live Workspace Signals", "Cross-Module Thread Picks", "Module Command Stacks"]
          : ["Focus Queue", "Cross-Module Thread Picks", "Live Workspace Signals", "Aligned Module Rail", "Module Command Stacks"];

  if (!rememberedStackKey) {
    return ladder;
  }

  const promote = (label: string, targetIndex: number) => {
    const currentIndex = ladder.indexOf(label);
    if (currentIndex === -1 || currentIndex === targetIndex) {
      return;
    }

    const [item] = ladder.splice(currentIndex, 1);
    ladder.splice(targetIndex, 0, item);
  };

  if (alignedModuleKey === rememberedStackKey) {
    promote("Aligned Module Rail", 1);
    promote("Module Command Stacks", 2);
    return ladder;
  }

  promote("Module Command Stacks", 1);
  return ladder;
}
function buildDeskBriefing(input: {
  focus: ActivityFocusKey;
  focusLabel: string;
  alignedModuleName: string;
  alignedModuleHref: string;
  focusQueue: Array<{ title: string }>;
  liveSignals: LiveSignalCard[];
  threadPicks: ThreadPickCard[];
  nextStep: { href: string; label: string; description: string };
  rememberedStackTitle?: string;
  rememberedStackItemTitle?: string;
  rememberedStackCount?: number;
  rememberedStackHref?: string;
}) {
  const topQueueTitle = input.focusQueue[0]?.title;
  const topThreadTitle = input.threadPicks[0]?.title;

  const title = input.focus === "all"
    ? "The desk is balanced, but not neutral"
    : `The desk is leaning toward ${input.focusLabel}`;

  const rememberedClause = input.rememberedStackTitle
    ? ` The desk still remembers ${input.rememberedStackTitle}${input.rememberedStackItemTitle ? ` via '${input.rememberedStackItemTitle}'.` : "."}`
    : "";

  const description = topQueueTitle
    ? `Your current posture is aligned to ${input.alignedModuleName}, and the shortest useful queue starts with '${topQueueTitle}'. ${topThreadTitle ? `The warmest linked thread is '${topThreadTitle}'.` : "Use the queue before the wider desk fragments your attention."}${rememberedClause}`
    : `Your current posture is aligned to ${input.alignedModuleName}. Use the next-step control to re-enter the strongest lane before you scan the full desk.${rememberedClause}`;

  return {
    title,
    description,
    pills: [
      `${input.focusQueue.length} queued`,
      `${input.liveSignals.length} live signals`,
      `${input.threadPicks.length} linked threads`,
      `Aligned ${input.alignedModuleName}`,
      ...(input.rememberedStackTitle ? [`Remembered ${input.rememberedStackTitle}`] : [])
    ],
    primaryHref: input.nextStep.href,
    primaryLabel: input.nextStep.label,
    secondaryHref: input.alignedModuleHref,
    secondaryLabel: `Open ${input.alignedModuleName}`,
    rememberedStackCount: input.rememberedStackCount ?? 0,
    rememberedStackTitle: input.rememberedStackTitle,
    rememberedStackItemTitle: input.rememberedStackItemTitle,
    rememberedStackHref: input.rememberedStackHref
  };
}
function CommandCard({
  item,
  query,
  compact = false
}: {
  item: SearchResultItem;
  query: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`rounded-[1.5rem] bg-surface-container-low shadow-ambient transition hover:-translate-y-0.5 ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-primary">{item.meta}</p>
      <h4 className={`mt-3 font-headline text-foreground ${compact ? "text-xl" : "text-2xl"}`}>
        <HighlightText text={item.title} query={query} />
      </h4>
      <p className="mt-3 text-sm leading-6 text-foreground/70">
        <HighlightText text={item.summary} query={query} />
      </p>
    </Link>
  );
}

export default async function SearchPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; density?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const cookieStore = await cookies();
  const query = resolvedSearchParams?.q ?? "";
  const deskDensity = normalizeDeskDensity(resolvedSearchParams?.density ?? cookieStore.get(SEARCH_DENSITY_COOKIE)?.value);
  const rememberedModuleStack = parseSearchModuleStack(cookieStore.get(SEARCH_MODULE_STACK_COOKIE)?.value);
  const compactDesk = deskDensity === "compact";
  const [results, activityReentry, postureSnapshot, tasks, notes, drafts, archiveItems] = await Promise.all([
    searchWorkspace(query),
    getPreferredActivityReentry(),
    getSystemPostureSnapshot(),
    listPlannerTasks(6),
    listKnowledgeNotes(3),
    listWritingDrafts(3),
    listRecentArchiveItems(3)
  ]);
  const commandGroup = results.groups.find((group) => group.module === "command");
  const resultGroups = results.groups.filter((group) => group.module !== "command");
  const commandSections = splitCommandItems(commandGroup?.items ?? []);
  const primaryLensCommand = commandSections.lens[0];
  const moduleCommandStacks = getModuleCommandStacks(commandSections);
  const liveSignals = buildLiveSignals({ tasks, notes, drafts, archiveItems });
  const threadPicks = buildThreadPicks(tasks);
  const focusQueue = buildFocusQueue({
    focus: activityReentry.focus,
    tasks,
    notes,
    drafts,
    archiveItems,
    threadPicks
  });
  const rememberedStackRegistry = rememberedModuleStack ? moduleCommandStacks.find((stack) => stack.key === rememberedModuleStack) : undefined;
  const alignedModuleRail = getAlignedModuleRail(postureSnapshot.alignedModuleKey, commandSections, activityReentry.href, rememberedStackRegistry);
  const rememberedStackPrimary = rememberedStackRegistry?.items[0];
  const primaryLaunchCommand = rememberedStackPrimary ?? primaryLensCommand;

  const deskBriefing = buildDeskBriefing({
    focus: activityReentry.focus,
    focusLabel: activityReentry.label,
    alignedModuleName: postureSnapshot.alignedModuleName,
    alignedModuleHref: postureSnapshot.alignedModuleHref,
    focusQueue,
    liveSignals,
    threadPicks,
    nextStep: activityReentry.nextStep,
    rememberedStackTitle: rememberedStackRegistry?.title,
    rememberedStackItemTitle: rememberedStackPrimary?.title,
    rememberedStackCount: rememberedStackRegistry?.items.length,
    rememberedStackHref: rememberedStackRegistry?.href
  });
  const deskPriorityLadder = buildDeskPriorityLadder(activityReentry.focus, rememberedStackRegistry?.key, postureSnapshot.alignedModuleKey);
  const focusQueuePriority = getSectionPriorityIndex(deskPriorityLadder, "Focus Queue");
  const liveSignalsPriority = getSectionPriorityIndex(deskPriorityLadder, "Live Workspace Signals");
  const threadPicksPriority = getSectionPriorityIndex(deskPriorityLadder, "Cross-Module Thread Picks");
  const alignedModulePriority = getSectionPriorityIndex(deskPriorityLadder, "Aligned Module Rail");
  const moduleStacksPriority = getSectionPriorityIndex(deskPriorityLadder, "Module Command Stacks");
  const densityOptions = [
    { key: "comfortable", label: "Comfortable" },
    { key: "compact", label: "Compact" }
  ] as const;
  const densityCopy = rememberedStackRegistry
    ? compactDesk
      ? `Compact density keeps the desk tighter while holding ${rememberedStackRegistry.title} closer than the rest.`
      : `Comfortable density leaves the wider desk visible while keeping ${rememberedStackRegistry.title} expanded.`
    : compactDesk
      ? "Compact density keeps the desk tighter and trims secondary surfaces."
      : "Comfortable density leaves the full desk open for broader scanning.";
  const focusQueueDisplay = focusQueue.slice(0, compactDesk ? 2 : 3);
  const liveSignalsDisplay = liveSignals.slice(0, compactDesk ? 3 : 4);
  const threadPicksDisplay = threadPicks.slice(0, compactDesk ? 2 : 3);
  const alignedModuleRailItems = alignedModuleRail.items.slice(0, compactDesk ? 2 : 3);
  const moduleCommandStacksDisplay = [...moduleCommandStacks]
    .sort((left, right) => Number(right.key === rememberedModuleStack) - Number(left.key === rememberedModuleStack))
    .map((stack) => ({
      ...stack,
      items: stack.items.slice(0, rememberedModuleStack
        ? stack.key === rememberedModuleStack
          ? compactDesk ? 3 : 4
          : compactDesk ? 1 : 2
        : compactDesk ? 2 : 3)
    }));
  const rememberedStackShortcuts = buildRememberedStackShortcuts(rememberedStackRegistry);
  const quickActionsDisplay = commandSections.quickActions.slice(0, compactDesk ? 2 : 3);
  const contextualDisplay = commandSections.contextual.slice(0, compactDesk ? 2 : 4);
  const rememberedStack = rememberedModuleStack ? moduleCommandStacksDisplay.find((stack) => stack.key === rememberedModuleStack) : undefined;
  const orderedResultGroups = orderSearchGroupsByWorkflow(resultGroups, rememberedStackRegistry?.key);
  const deskShortcutsDisplay = dedupeItemsByHref([...rememberedStackShortcuts, ...quickActionsDisplay]).slice(0, rememberedStackRegistry ? (compactDesk ? 4 : 5) : (compactDesk ? 3 : 4));

  return (
    <ShellLayout
      title="Command Center"
      description="Use this workspace entry point to jump into creation flows, reopen active work, or search across planner, knowledge, writing, and archive from one place."
    >
      <section className="rounded-[2rem] bg-surface-container-low p-8 shadow-ambient">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
            Last Replay Lens: {activityReentry.label}
          </span>
          <span className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
            Aligned Module: {postureSnapshot.alignedModuleName}
          </span>
          <Link href={activityReentry.href} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
            Resume Lens
          </Link>
        </div>
        {!results.query ? (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[1.5rem] bg-white/75 px-4 py-4 shadow-ambient">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Desk Density</span>
            {densityOptions.map((option) => {
              const active = option.key === deskDensity;
              return (
                <Link
                  key={option.key}
                  href={buildSearchDensityHref(query, option.key)}
                  className={active ? "rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-ambient" : "rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient"}
                >
                  {option.label}
                </Link>
              );
            })}
            <span className="text-xs uppercase tracking-[0.16em] text-foreground/55">
              {densityCopy}
            </span>
          </div>
        ) : null}
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Workspace Command + Search</p>
        <h2 className="mt-3 font-headline text-3xl text-foreground">
          {results.query ? `Results for "${results.query}"` : "Jump, create, or reopen work"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-foreground/70">
          {results.query
            ? `${results.totalCount} total matches across commands and live module data.`
            : "Start with a command like 'new task', or search for a note, draft, article, tag, domain, or archive record."}
        </p>
      </section>

      {!results.query ? (
        <section className="space-y-6">
          {!rememberedStackRegistry ? (
            <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Workflow Suggestion</p>
                  <h3 className="mt-3 font-headline text-3xl text-foreground">Pin a lane before the desk goes fully neutral</h3>
                </div>
                {postureSnapshot.alignedModuleKey !== "activity" && postureSnapshot.alignedModuleKey !== "dashboard" && postureSnapshot.alignedModuleKey !== "modules" && postureSnapshot.alignedModuleKey !== "settings" ? (
                  <Link href={`/search/stack?value=${postureSnapshot.alignedModuleKey}&next=${encodeURIComponent("/search")}`} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
                    Pin {postureSnapshot.alignedModuleName}
                  </Link>
                ) : (
                  <Link href="/search#module-command-stacks" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
                    Pick a stack below
                  </Link>
                )}
              </div>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-foreground/70">The command desk is currently posture-led. Pinning a stack will keep one lane shaping shortcuts, highlights, launch order, and workflow memory across the workstation.</p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold text-primary">
                <Link href="/search/stack?value=planner&next=%2Fsearch">Pin Planner Stack</Link>
                <Link href="/search/stack?value=knowledge&next=%2Fsearch">Pin Knowledge Stack</Link>
                <Link href="/search/stack?value=writing&next=%2Fsearch">Pin Writing Stack</Link>
                <Link href="/search/stack?value=archive&next=%2Fsearch">Pin Archive Stack</Link>
              </div>
            </section>
          ) : null}
          {rememberedStackRegistry ? (
            <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-primary">Remembered Workflow</p>
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient">
                      {rememberedStackRegistry.title}
                    </span>
                  </div>
                  <h3 className="mt-3 font-headline text-3xl text-foreground">Re-enter the workflow you pinned on purpose</h3>
                </div>
                <Link href={rememberedStackRegistry.href} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                  Open {rememberedStackRegistry.title}
                </Link>
              </div>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-foreground/70">
                The desk still has {rememberedStackRegistry.title} pinned, so you can reopen that lane before the wider workstation pulls you into a different posture.
                {rememberedStackPrimary ? ` The warmest move in that stack is '${rememberedStackPrimary.title}'.` : ""}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {rememberedStackPrimary ? (
                  <Link href={rememberedStackPrimary.href} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
                    Open {rememberedStackPrimary.title}
                  </Link>
                ) : null}
                <Link href={buildClearSearchModuleStackHref("/search")} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
                  Clear workflow
                </Link>
              </div>
            </section>
          ) : null}

          <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Desk Briefing</p>
                <h3 className="mt-3 font-headline text-3xl text-foreground">{deskBriefing.title}</h3>
              </div>
              <Link href={deskBriefing.secondaryHref} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                {deskBriefing.secondaryLabel}
              </Link>
            </div>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-foreground/70">{deskBriefing.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {deskBriefing.pills.map((pill) => (
                <span key={pill} className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary shadow-ambient">
                  {pill}
                </span>
              ))}
            </div>
            {deskBriefing.rememberedStackTitle ? (
              <div className="mt-5 rounded-[1.5rem] bg-white/90 p-5 shadow-ambient">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-primary">Workflow Memory</p>
                    <h4 className="mt-3 font-headline text-2xl text-foreground">{deskBriefing.rememberedStackTitle} is still pinned into the desk briefing</h4>
                  </div>
                  <span className="rounded-full bg-surface-container px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    {deskBriefing.rememberedStackCount} warm actions
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-foreground/70">
                  {deskBriefing.rememberedStackItemTitle
                    ? `The quickest way back into that workflow is '${deskBriefing.rememberedStackItemTitle}'. Keep it visible here while the rest of the desk fans out around you.`
                    : 'This remembered workflow stays visible here so your desk posture does not erase the lane you pinned on purpose.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-primary">
                  {deskBriefing.rememberedStackHref ? <Link href={deskBriefing.rememberedStackHref}>Open {deskBriefing.rememberedStackTitle}</Link> : null}
                  {deskBriefing.rememberedStackItemTitle && deskBriefing.primaryHref ? <Link href={deskBriefing.primaryHref}>Resume warm action</Link> : null}
                </div>
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={deskBriefing.primaryHref} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
                {deskBriefing.primaryLabel}
              </Link>
              <Link href={activityReentry.href} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
                Resume {activityReentry.label}
              </Link>
            </div>
          </section>

          <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Desk Priority Ladder</p>
                <h3 className="mt-3 font-headline text-3xl text-foreground">Read the desk in this order</h3>
              </div>
              <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                {activityReentry.label} order
              </span>
            </div>
            <div className="mt-6 grid gap-3 xl:grid-cols-4">
              {deskPriorityLadder.map((item, index) => (
                <div key={item} className="rounded-[1.5rem] bg-white/90 p-5 shadow-ambient">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Priority {index + 1}</p>
                  <h4 className="mt-3 font-headline text-2xl text-foreground">{item}</h4>
                  <p className="mt-3 text-sm leading-6 text-foreground/70">
                    {index === 0 ? "Start here before scanning the rest of the desk." : index === 1 ? "Use this next if the first surface does not immediately produce a move." : "Keep this in reserve while you work down the desk."}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">From Current Lens</p>
                <h3 className="mt-3 font-headline text-3xl text-foreground">Make the next move from {activityReentry.label}</h3>
              </div>
              <Link href={activityReentry.nextStep.href} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
                {activityReentry.nextStep.label}
              </Link>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/70">{activityReentry.nextStep.description}</p>
          </div>

          <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Focus Queue</p>
                  {focusQueuePriority ? (
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient">
                      Priority {focusQueuePriority}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 font-headline text-3xl text-foreground">The shortest queue that matches {activityReentry.label}</h3>
              </div>
              <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                {focusQueueDisplay.length} queued picks
              </span>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-foreground/55">{getDeskSectionCurationCopy(focusQueuePriority, "Focus Queue")}</p>
            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              {focusQueueDisplay.map((item) => (
                <article key={item.key} className="rounded-[1.75rem] bg-white/90 p-5 shadow-ambient">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">{item.eyebrow}</p>
                  <h4 className="mt-3 font-headline text-2xl text-foreground">{item.title}</h4>
                  <p className="mt-3 text-sm leading-7 text-foreground/70">{item.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.pills.map((pill) => (
                      <span key={pill} className="rounded-full bg-surface-container px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                        {pill}
                      </span>
                    ))}
                  </div>
                  <Link href={item.href} className="mt-5 inline-flex text-sm font-semibold text-primary">
                    {item.cta}
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Live Workspace Signals</p>
                  {liveSignalsPriority ? (
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient">
                      Priority {liveSignalsPriority}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 font-headline text-3xl text-foreground">Read the workstation heat before choosing a lane</h3>
              </div>
              <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                {liveSignalsDisplay.length} live channels
              </span>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-foreground/55">{getDeskSectionCurationCopy(liveSignalsPriority, "Live Workspace Signals")}</p>
            <div className="mt-6 grid gap-4 xl:grid-cols-4">
              {liveSignalsDisplay.map((signal) => (
                <article key={signal.key} className="rounded-[1.75rem] bg-white/90 p-5 shadow-ambient">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">{signal.eyebrow}</p>
                  <h4 className="mt-3 font-headline text-2xl text-foreground">{signal.title}</h4>
                  <p className="mt-3 text-sm leading-7 text-foreground/70">{signal.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {signal.pills.map((pill) => (
                      <span key={pill} className="rounded-full bg-surface-container px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                        {pill}
                      </span>
                    ))}
                  </div>
                  <Link href={signal.href} className="mt-5 inline-flex text-sm font-semibold text-primary">
                    {signal.cta}
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Cross-Module Thread Picks</p>
                  {threadPicksPriority ? (
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient">
                      Priority {threadPicksPriority}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 font-headline text-3xl text-foreground">Resume the work threads already carrying context</h3>
              </div>
              <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                {threadPicksDisplay.length} linked threads
              </span>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-foreground/55">{getDeskSectionCurationCopy(threadPicksPriority, "Cross-Module Thread Picks")}</p>
            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              {threadPicksDisplay.length > 0 ? threadPicksDisplay.map((thread) => (
                <article key={thread.key} className="rounded-[1.75rem] bg-white/90 p-5 shadow-ambient">
                  <h4 className="font-headline text-2xl text-foreground">{thread.title}</h4>
                  <p className="mt-3 text-sm leading-7 text-foreground/70">{thread.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {thread.pills.map((pill) => (
                      <span key={pill} className="rounded-full bg-surface-container px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                        {pill}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold text-primary">
                    <Link href={thread.taskHref}>{thread.taskCta}</Link>
                    {thread.noteHref && thread.noteLabel ? <Link href={thread.noteHref}>Note: {thread.noteLabel}</Link> : null}
                    {thread.draftHref && thread.draftLabel ? <Link href={thread.draftHref}>Draft: {thread.draftLabel}</Link> : null}
                  </div>
                </article>
              )) : (
                <div className="rounded-[1.75rem] bg-white/90 p-5 text-sm leading-7 text-foreground/65 shadow-ambient xl:col-span-3">
                  As you create tasks from notes and drafts, the desk will start surfacing the richest cross-module threads here.
                </div>
              )}
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.35fr,0.95fr]">
            <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Desktop Workbench</p>
                  <h3 className="mt-3 font-headline text-3xl text-foreground">Launch from the command desk</h3>
                </div>
                <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                  {commandGroup?.count ?? 0} ready moves
                </span>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
                {primaryLaunchCommand ? (
                  <div className="rounded-[1.75rem] bg-white/90 p-6 shadow-ambient">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-primary">Primary Launch</p>
                      {!rememberedStackRegistry && postureSnapshot.alignedModuleKey !== "activity" && postureSnapshot.alignedModuleKey !== "dashboard" && postureSnapshot.alignedModuleKey !== "modules" && postureSnapshot.alignedModuleKey !== "settings" ? (
                        <span className="rounded-full bg-surface-container px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                          Aligned lane: {postureSnapshot.alignedModuleName}
                        </span>
                      ) : null}
                      {rememberedStackRegistry ? (
                        <span className="rounded-full bg-surface-container px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">From {rememberedStackRegistry.title}</span>
                      ) : null}
                    </div>
                    <h4 className="mt-3 font-headline text-3xl text-foreground">{primaryLaunchCommand.title}</h4>
                    <p className="mt-4 text-sm leading-7 text-foreground/70">{primaryLaunchCommand.summary}</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link href={primaryLaunchCommand.href} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
                        Open lane
                      </Link>
                      <Link href={activityReentry.href} className="rounded-full bg-surface-container px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
                        Resume {activityReentry.label}
                      </Link>
                      
                      {rememberedStackRegistry ? (
                        <Link href={rememberedStackRegistry.href} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
                          Open {rememberedStackRegistry.title}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[1.75rem] bg-white/90 p-6 shadow-ambient">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-primary">Desk Shortcuts</p>
                    {!rememberedStackRegistry && postureSnapshot.alignedModuleKey !== "activity" && postureSnapshot.alignedModuleKey !== "dashboard" && postureSnapshot.alignedModuleKey !== "modules" && postureSnapshot.alignedModuleKey !== "settings" ? (
                      <span className="rounded-full bg-surface-container px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                        Aligned lane: {postureSnapshot.alignedModuleName}
                      </span>
                    ) : null}
                      {rememberedStackRegistry ? (
                      <span className="rounded-full bg-surface-container px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                        Guided by {rememberedStackRegistry.title}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 space-y-3">
                    {deskShortcutsDisplay.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="block rounded-[1.25rem] bg-surface-container px-4 py-4 transition hover:-translate-y-0.5"
                      >
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-foreground/65">{item.summary}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Context Rails</p>
              <h3 className="mt-3 font-headline text-3xl text-foreground">Keep live context close</h3>
              <p className="mt-4 text-sm leading-7 text-foreground/70">
                These shortcuts stay anchored to the freshest task, note, draft, and replay lane so the desktop shell can carry you back into warm work quickly.
              </p>
              <div className="mt-6 space-y-4">
                {contextualDisplay.length > 0 ? (
                  contextualDisplay.map((item) => <CommandCard key={item.id} item={item} query={results.query} compact={compactDesk} />)
                ) : (
                  <div className="rounded-[1.5rem] bg-white/90 p-5 text-sm leading-7 text-foreground/65 shadow-ambient">
                    As you create notes, drafts, and tasks, the desk will start pinning contextual return paths here.
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
            <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Aligned Module Rail</p>
                {alignedModulePriority ? (
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient">
                    Priority {alignedModulePriority}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-3 font-headline text-3xl text-foreground">Start from {postureSnapshot.alignedModuleName}</h3>
              <p className="mt-4 text-sm leading-7 text-foreground/70">{alignedModuleRail.description}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                  {alignedModuleRail.title}
                </span>
                <Link href={postureSnapshot.alignedModuleHref} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                  Open {postureSnapshot.alignedModuleName}
                </Link>
                {rememberedStackRegistry && rememberedStackRegistry.key !== postureSnapshot.alignedModuleKey ? (
                  <Link href={rememberedStackRegistry.href} className="rounded-full bg-surface-container px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                    Re-enter {rememberedStackRegistry.title}
                  </Link>
                ) : null}
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-foreground/55">{getDeskSectionCurationCopy(alignedModulePriority, "Aligned Module Rail")}</p>
              <div className="mt-6 space-y-4">
                {alignedModuleRailItems.length > 0 ? (
                  alignedModuleRailItems.map((item) => <CommandCard key={item.id} item={item} query={results.query} compact={compactDesk} />)
                ) : (
                  <div className="rounded-[1.5rem] bg-white/90 p-5 text-sm leading-7 text-foreground/65 shadow-ambient">
                    This rail will pick up more module-specific launch paths as the workstation accumulates richer aligned context.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Replay Surface</p>
              <h3 className="mt-3 font-headline text-3xl text-foreground">Move between command posture and replay posture</h3>
              <div className="mt-5 space-y-4">
                {commandSections.lens.slice(1).map((item) => (
                  <CommandCard key={item.id} item={item} query={results.query} compact />
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Module Command Stacks</p>
                  {moduleStacksPriority ? (
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient">
                      Priority {moduleStacksPriority}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 font-headline text-3xl text-foreground">Launch by module, not just by global command</h3>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                  4 active stacks
                </span>
                {rememberedStack ? (
                  <Link
                    href={buildClearSearchModuleStackHref("/search")}
                    className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient"
                  >
                    Clear pinned stack
                  </Link>
                ) : null}
              </div>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-foreground/55">{getDeskSectionCurationCopy(moduleStacksPriority, "Module Command Stacks")}</p>
            {!rememberedStackRegistry && postureSnapshot.alignedModuleKey !== "activity" && postureSnapshot.alignedModuleKey !== "dashboard" && postureSnapshot.alignedModuleKey !== "modules" && postureSnapshot.alignedModuleKey !== "settings" ? (
              <span className="rounded-full bg-surface-container px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Aligned lane: {postureSnapshot.alignedModuleName}
              </span>
            ) : null}
                      {rememberedStackRegistry ? (
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-primary/80">
                {compactDesk
                  ? `Compact mode keeps ${rememberedStackRegistry.title} expanded while compressing the rest of the stack lane.`
                  : `Comfortable mode lets ${rememberedStackRegistry.title} breathe while the other stacks remain visible for scan-back.`}
              </p>
            ) : null}
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {moduleCommandStacksDisplay.map((stack) => (
                <div key={stack.key} className="rounded-[1.75rem] bg-white/90 p-5 shadow-ambient">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-primary">{stack.title}</p>
                    {rememberedModuleStack && stack.key === rememberedModuleStack ? (
                      <span className="rounded-full bg-surface-container px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Remembered Stack</span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-foreground/70">{stack.description}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    <Link href={stack.href}>Open {stack.title}</Link>
                    <Link href={`/search/stack?value=${stack.key}&next=${encodeURIComponent("/search")}`}>Remember this stack</Link>
                  </div>
                  <div className="mt-5 space-y-3">
                    {stack.items.length > 0 ? (
                      stack.items.map((item) => <CommandCard key={item.id} item={item} query={results.query} compact={compactDesk} />)
                    ) : (
                      <div className="rounded-[1.25rem] bg-surface-container px-4 py-4 text-sm leading-6 text-foreground/65">
                        This stack will become denser as more module-specific context builds up in the workstation.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Workspace Navigation</p>
                <h3 className="mt-3 font-headline text-3xl text-foreground">Open durable surfaces without losing the desk</h3>
              </div>
              <Link href={activityReentry.href} className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                {activityReentry.focus === "all" ? "Open Hub" : `Resume ${activityReentry.label}`}
              </Link>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {commandSections.navigation.map((item) => (
                <CommandCard key={item.id} item={item} query={results.query} />)
              )}
            </div>
          </section>
        </section>
      ) : null}

      {results.query ? (
        <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Search Posture</p>
              <h3 className="mt-3 font-headline text-3xl text-foreground">Keep query results grounded in the remembered workflow</h3>
            </div>
            {!rememberedStackRegistry && postureSnapshot.alignedModuleKey !== "activity" && postureSnapshot.alignedModuleKey !== "dashboard" && postureSnapshot.alignedModuleKey !== "modules" && postureSnapshot.alignedModuleKey !== "settings" ? (
              <span className="rounded-full bg-surface-container px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Aligned lane: {postureSnapshot.alignedModuleName}
              </span>
            ) : null}
                      {rememberedStackRegistry ? (
              <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                Workflow {rememberedStackRegistry.title}
              </span>
            ) : null}
          </div>
          <p className="mt-4 text-sm leading-7 text-foreground/70">{getSearchPostureCopy(results.query, rememberedStackRegistry, resultGroups.length)}</p>
        </section>
      ) : null}

      {commandGroup ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-2xl text-foreground">{commandGroup.title}</h3>
            <span className="text-sm text-foreground/50">{commandGroup.count} available</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {commandGroup.items.map((item) => (
              <CommandCard key={item.id} item={item} query={results.query} />
            ))}
          </div>
        </section>
      ) : null}

      {results.query && resultGroups.length > 0 ? (
        <section className="space-y-8">
          {orderedResultGroups.map((group) => (
            <div key={group.module} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-headline text-2xl text-foreground">{group.title}</h3>
                  {group.module === rememberedStackRegistry?.key ? (
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient">Workflow Bias</span>
                  ) : null}
                </div>
                <span className="text-sm text-foreground/50">Showing {group.items.length} of {group.count} hits</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((item) => (
                  <CommandCard key={`${group.module}-${item.id}`} item={item} query={results.query} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : results.query && resultGroups.length === 0 ? (
        <section className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
          No module matches yet. Try a broader keyword or use one of the command cards above.
        </section>
      ) : null}
    </ShellLayout>
  );
}





































