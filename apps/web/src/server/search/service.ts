import type { RichTextNode, SearchResultGroup, SearchResultItem, SearchResults } from "@workspace/types/index";

import { getPreferredActivityFocus, getPreferredActivityHref } from "@/server/activity/preferences";
import { getActivityFocusLabel } from "@/lib/activity-focus";
import { getCurrentUserId } from "@/server/auth/current-user";
import { getDb } from "@/server/db";

const RESULT_LIMIT = 5;

type SearchSortableItem = SearchResultItem & { sortDate: number };

type ArchiveSearchRecord = {
  id: string;
  title: string;
  summary: string | null;
  sourceType: string;
  isFavorite: boolean;
  updatedAt: Date;
  post: { slug: string } | null;
  note: { slug: string } | null;
};

function normalizeQuery(query: string) {
  return query.trim();
}

function hasQuery(query: string) {
  return normalizeQuery(query).length > 0;
}

function buildContains(value: string) {
  return {
    contains: value,
    mode: "insensitive" as const
  };
}

function normalizeRichTextContent(content: unknown): RichTextNode[] {
  return Array.isArray(content) ? (content as RichTextNode[]) : [];
}

function extractContentText(content: unknown) {
  return normalizeRichTextContent(content)
    .map((node) => node.content?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

function buildExcerpt(text: string | null | undefined, query: string) {
  const source = (text ?? "").replace(/\s+/g, " ").trim();
  if (!source) {
    return "No summary yet.";
  }

  if (!query.trim()) {
    return source.length > 180 ? `${source.slice(0, 177)}...` : source;
  }

  const normalizedSource = source.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const matchIndex = normalizedSource.indexOf(normalizedQuery);

  if (matchIndex === -1) {
    return source.length > 180 ? `${source.slice(0, 177)}...` : source;
  }

  const start = Math.max(0, matchIndex - 48);
  const end = Math.min(source.length, matchIndex + normalizedQuery.length + 92);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < source.length ? "..." : "";
  return `${prefix}${source.slice(start, end).trim()}${suffix}`;
}

function buildPreferredExcerpt(
  query: string,
  options: Array<string | null | undefined>
) {
  const normalizedQuery = query.toLowerCase();

  if (!normalizedQuery) {
    return buildExcerpt(options.find((option) => Boolean(option?.trim())) ?? null, query);
  }

  for (const option of options) {
    const source = (option ?? "").replace(/\s+/g, " ").trim();
    if (source && source.toLowerCase().includes(normalizedQuery)) {
      return buildExcerpt(source, query);
    }
  }

  return buildExcerpt(options.find((option) => Boolean(option?.trim())) ?? null, query);
}

function plannerMeta(status: string, priority: string) {
  return `${status} | ${priority}`;
}

function writingMeta(kind: "draft" | "post", detail: { visibility?: string; publishedAt?: Date | null; updatedAt?: Date | null }) {
  if (kind === "draft") {
    return `Draft | ${detail.visibility ?? "PRIVATE"}`;
  }

  return detail.publishedAt ? `Published ${detail.publishedAt.toLocaleDateString("zh-CN")}` : `Updated ${detail.updatedAt?.toLocaleDateString("zh-CN") ?? "recently"}`;
}

function archiveSourceLabel(sourceType: string) {
  if (sourceType === "POST") {
    return "Writing";
  }

  if (sourceType === "NOTE") {
    return "Knowledge";
  }

  return sourceType;
}

function archiveMeta(sourceType: string, isFavorite: boolean) {
  const label = archiveSourceLabel(sourceType);
  return isFavorite ? `${label} | Favorited` : label;
}

function archiveHref(item: ArchiveSearchRecord) {
  if (item.post?.slug) {
    return `/writing/${item.post.slug}`;
  }

  if (item.note?.slug) {
    return `/knowledge/${item.note.slug}`;
  }

  return "/archive";
}

function scoreText(text: string | null | undefined, query: string) {
  if (!text) {
    return 0;
  }

  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (normalizedText === normalizedQuery) {
    return 120;
  }

  if (normalizedText.startsWith(normalizedQuery)) {
    return 80;
  }

  if (normalizedText.includes(normalizedQuery)) {
    return 40;
  }

  return 0;
}

function sortByScore<T>(
  items: T[],
  getScore: (item: T) => number,
  getDate: (item: T) => number
) {
  return [...items].sort((left, right) => {
    const scoreDiff = getScore(right) - getScore(left);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return getDate(right) - getDate(left);
  });
}

function buildLensCommands(input: {
  focus: Awaited<ReturnType<typeof getPreferredActivityFocus>>;
  preferredActivityHref: string;
  latestNote: { slug: string; title: string } | null;
  latestDraft: { id: string; title: string } | null;
  latestTask: { id: string; title: string } | null;
}): SearchSortableItem[] {
  if (input.focus === "planner") {
    return [
      {
        id: "command-lens-execution",
        module: "command",
        title: "Review execution flow",
        summary: "Open Planner or jump back into the execution lens to keep active work moving.",
        href: "/planner",
        meta: "Lens",
        sortDate: 110
      },
      {
        id: "command-lens-resume-execution",
        module: "command",
        title: "Resume execution lens",
        summary: "Re-open the activity hub in execution mode and continue the current replay lane.",
        href: input.preferredActivityHref,
        meta: "Lens",
        sortDate: 109
      }
    ];
  }

  if (input.focus === "knowledge") {
    return [
      {
        id: "command-lens-thinking",
        module: "command",
        title: "Open knowledge library",
        summary: "Return to the note system and continue the current thinking-heavy phase.",
        href: "/knowledge",
        meta: "Lens",
        sortDate: 110
      },
      input.latestNote
        ? {
            id: "command-lens-draft-from-note",
            module: "command",
            title: "Draft from latest note",
            summary: "Carry the freshest note into writing while the thinking lens is still active.",
            href: `/writing/new?sourceNote=${input.latestNote.slug}`,
            meta: "Lens",
            sortDate: 109
          }
        : {
            id: "command-lens-capture-note",
            module: "command",
            title: "Capture note in thinking mode",
            summary: "Start a new note without leaving the knowledge-oriented replay context.",
            href: "/knowledge/new",
            meta: "Lens",
            sortDate: 109
          }
    ];
  }

  if (input.focus === "writing") {
    return [
      {
        id: "command-lens-writing",
        module: "command",
        title: "Open writing stream",
        summary: "Return to drafts and published entries while the publishing lens is in focus.",
        href: "/writing",
        meta: "Lens",
        sortDate: 110
      },
      input.latestDraft
        ? {
            id: "command-lens-latest-draft",
            module: "command",
            title: "Continue latest draft",
            summary: "Re-enter the most recent draft directly from the publishing-oriented command view.",
            href: `/writing/drafts/${input.latestDraft.id}`,
            meta: "Lens",
            sortDate: 109
          }
        : {
            id: "command-lens-new-draft",
            module: "command",
            title: "Start draft in publishing mode",
            summary: "Open a fresh draft while your replay context is already tuned to writing work.",
            href: "/writing/new",
            meta: "Lens",
            sortDate: 109
          }
    ];
  }

  if (input.focus === "archive") {
    return [
      {
        id: "command-lens-history",
        module: "command",
        title: "Open archive history",
        summary: "Step into the durable record layer while the history lens is active.",
        href: "/archive",
        meta: "Lens",
        sortDate: 110
      },
      {
        id: "command-lens-resume-history",
        module: "command",
        title: "Resume history timeline",
        summary: "Return to the archive-oriented replay surface and continue the slower review lane.",
        href: input.preferredActivityHref,
        meta: "Lens",
        sortDate: 109
      }
    ];
  }

  return [
    {
      id: "command-lens-mixed",
      module: "command",
      title: "Resume mixed replay",
      summary: "Return to the full workstation view and decide what deserves the next unit of attention.",
      href: input.preferredActivityHref,
      meta: "Lens",
      sortDate: 110
    },
    input.latestTask
      ? {
          id: "command-lens-refine-task",
          module: "command",
          title: "Refine latest task",
          summary: "Jump back into the most recently touched task from the mixed command surface.",
          href: `/planner/${input.latestTask.id}/edit`,
          meta: "Lens",
          sortDate: 109
        }
      : {
          id: "command-lens-plan-task",
          module: "command",
          title: "Plan next task",
          summary: "Create a new execution thread from the all-motion view.",
          href: "/planner/new",
          meta: "Lens",
          sortDate: 109
        }
  ];
}

async function buildCommandItems(query: string, ownerId: string): Promise<SearchResultItem[]> {
  const db = getDb();
  const preferredActivityFocus = await getPreferredActivityFocus();
  const preferredActivityHref = await getPreferredActivityHref();
  const [latestNote, latestDraft, latestTask] = await Promise.all([
    db.knowledgeNote.findFirst({
      where: { ownerId, isArchived: false },
      orderBy: { updatedAt: "desc" },
      select: { slug: true, title: true }
    }),
    db.writingDraft.findFirst({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true }
    }),
    db.plannerTask.findFirst({
      where: { ownerId, status: { not: "ARCHIVED" } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true }
    })
  ]);

  const commands: SearchSortableItem[] = [
    ...buildLensCommands({
      focus: preferredActivityFocus,
      preferredActivityHref,
      latestNote,
      latestDraft,
      latestTask
    }),
    {
      id: "command-new-task",
      module: "command",
      title: "Create new task",
      summary: "Open the planner capture flow and add a new execution item.",
      href: "/planner/new",
      meta: "Quick Action",
      sortDate: 100
    },
    {
      id: "command-new-draft",
      module: "command",
      title: "Create new draft",
      summary: "Open a fresh writing draft and start shaping a new piece.",
      href: "/writing/new",
      meta: "Quick Action",
      sortDate: 99
    },
    {
      id: "command-new-note",
      module: "command",
      title: "Capture new note",
      summary: "Open the knowledge form and save a new structured note.",
      href: "/knowledge/new",
      meta: "Quick Action",
      sortDate: 98
    },
    {
      id: "command-open-activity-hub",
      module: "command",
      title: preferredActivityFocus === "all" ? "Open activity hub" : "Resume " + getActivityFocusLabel(preferredActivityFocus) + " lens",
      summary: preferredActivityFocus === "all"
        ? "Review recent motion, work threads, and archive history from one replay surface."
        : "Re-open the activity hub in your last-used " + getActivityFocusLabel(preferredActivityFocus).toLowerCase() + " lens.",
      href: preferredActivityHref,
      meta: "Navigation",
      sortDate: 97
    },
    {
      id: "command-open-archive",
      module: "command",
      title: "Open archive",
      summary: "Review cross-module records, favorites, and recent history.",
      href: "/archive",
      meta: "Navigation",
      sortDate: 96
    },
    {
      id: "command-open-settings",
      module: "command",
      title: "Open settings",
      summary: "Adjust theme, module visibility, and workstation preferences.",
      href: "/settings",
      meta: "Navigation",
      sortDate: 95
    }
  ];

  if (latestNote) {
    commands.push({
      id: "command-task-from-note",
      module: "command",
      title: `Create task from '${latestNote.title}'`,
      summary: "Jump straight into Planner with the latest knowledge note preselected.",
      href: `/planner/new?note=${latestNote.slug}`,
      meta: "Contextual",
      sortDate: 95
    });
  }

  if (latestDraft) {
    commands.push({
      id: "command-task-from-draft",
      module: "command",
      title: `Create task from '${latestDraft.title}'`,
      summary: "Turn the latest draft into concrete execution work inside Planner.",
      href: `/planner/new?draft=${latestDraft.id}`,
      meta: "Contextual",
      sortDate: 94
    });
  }

  if (latestTask) {
    commands.push({
      id: "command-refine-latest-task",
      module: "command",
      title: `Refine '${latestTask.title}'`,
      summary: "Jump back into the most recently touched planner task.",
      href: `/planner/${latestTask.id}/edit`,
      meta: "Contextual",
      sortDate: 93
    });
  }

  const filtered = query.trim()
    ? commands.filter((item) => scoreText(item.title, query) > 0 || scoreText(item.summary, query) > 0 || scoreText(item.meta, query) > 0)
    : commands;

  return sortByScore(
    filtered,
    (item) => scoreText(item.title, query) * 2 + scoreText(item.summary, query) + scoreText(item.meta, query),
    (item) => item.sortDate
  ).slice(0, RESULT_LIMIT + 2).map(({ sortDate, ...item }) => item);
}

export async function searchWorkspace(query: string): Promise<SearchResults> {
  const normalized = normalizeQuery(query);
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const groups: SearchResultGroup[] = [];

  const commandItems = await buildCommandItems(normalized, ownerId);
  if (commandItems.length > 0) {
    groups.push({
      module: "command",
      title: normalized ? "Commands" : "Command Center",
      count: commandItems.length,
      items: commandItems
    });
  }

  if (!hasQuery(normalized)) {
    return {
      query: normalized,
      totalCount: groups.reduce((total, group) => total + group.count, 0),
      groups
    };
  }

  const [tasks, notes, drafts, posts, archiveItems] = await Promise.all([
    db.plannerTask.findMany({
      where: {
        ownerId,
        status: { not: "ARCHIVED" },
        OR: [
          { title: buildContains(normalized) },
          { description: buildContains(normalized) }
        ]
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        updatedAt: true
      }
    }),
    db.knowledgeNote.findMany({
      where: {
        ownerId,
        isArchived: false
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        contentJson: true,
        updatedAt: true,
        domain: {
          select: {
            name: true
          }
        },
        tags: {
          include: {
            tag: {
              select: {
                name: true
              }
            }
          }
        }
      }
    }),
    db.writingDraft.findMany({
      where: {
        ownerId
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        summary: true,
        contentJson: true,
        visibility: true,
        updatedAt: true
      }
    }),
    db.writingPost.findMany({
      where: {
        ownerId,
        status: "PUBLISHED"
      },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        contentJson: true,
        publishedAt: true,
        updatedAt: true
      }
    }),
    db.archiveItem.findMany({
      where: {
        ownerId,
        OR: [
          { title: buildContains(normalized) },
          { summary: buildContains(normalized) }
        ]
      },
      select: {
        id: true,
        title: true,
        summary: true,
        sourceType: true,
        isFavorite: true,
        updatedAt: true,
        post: {
          select: {
            slug: true
          }
        },
        note: {
          select: {
            slug: true
          }
        }
      }
    })
  ]);

  const allPlannerItems = sortByScore(
    tasks,
    (task: (typeof tasks)[number]) => scoreText(task.title, normalized) * 2 + scoreText(task.description, normalized),
    (task: (typeof tasks)[number]) => task.updatedAt.getTime()
  ).map((task: (typeof tasks)[number]) => ({
    id: task.id,
    module: "planner",
    title: task.title,
    summary: task.description ?? "No description yet.",
    href: `/planner/${task.id}/edit`,
    meta: plannerMeta(task.status, task.priority)
  } satisfies SearchResultItem));
  if (allPlannerItems.length > 0) {
    groups.push({ module: "planner", title: "Planner", count: allPlannerItems.length, items: allPlannerItems.slice(0, RESULT_LIMIT) });
  }

  const allKnowledgeItems = sortByScore(
    notes.filter((note: (typeof notes)[number]) => {
      const contentText = extractContentText(note.contentJson);
      const tagScore = note.tags.reduce((total: number, tag: (typeof note.tags)[number]) => total + scoreText(tag.tag.name, normalized), 0);
      return scoreText(note.title, normalized) > 0
        || scoreText(note.summary, normalized) > 0
        || scoreText(note.domain?.name, normalized) > 0
        || tagScore > 0
        || scoreText(contentText, normalized) > 0;
    }),
    (note: (typeof notes)[number]) => {
      const contentText = extractContentText(note.contentJson);
      const tagScore = note.tags.reduce((total: number, tag: (typeof note.tags)[number]) => total + scoreText(tag.tag.name, normalized), 0);
      return scoreText(note.title, normalized) * 2
        + scoreText(note.summary, normalized)
        + scoreText(note.domain?.name, normalized)
        + tagScore
        + Math.floor(scoreText(contentText, normalized) / 2);
    },
    (note: (typeof notes)[number]) => note.updatedAt.getTime()
  ).map((note: (typeof notes)[number]) => {
    const contentText = extractContentText(note.contentJson);
    return {
      id: note.id,
      module: "knowledge",
      title: note.title,
      summary: buildPreferredExcerpt(normalized, [note.summary, contentText]),
      href: `/knowledge/${note.slug}`,
      meta: note.domain?.name ?? "Knowledge note"
    } satisfies SearchResultItem;
  });
  if (allKnowledgeItems.length > 0) {
    groups.push({ module: "knowledge", title: "Knowledge", count: allKnowledgeItems.length, items: allKnowledgeItems.slice(0, RESULT_LIMIT) });
  }

  const draftItems: SearchSortableItem[] = sortByScore(
    drafts.filter((draft: (typeof drafts)[number]) => {
      const contentText = extractContentText(draft.contentJson);
      return scoreText(draft.title, normalized) > 0
        || scoreText(draft.summary, normalized) > 0
        || scoreText(contentText, normalized) > 0;
    }),
    (draft: (typeof drafts)[number]) => {
      const contentText = extractContentText(draft.contentJson);
      return scoreText(draft.title, normalized) * 2
        + scoreText(draft.summary, normalized)
        + Math.floor(scoreText(contentText, normalized) / 2);
    },
    (draft: (typeof drafts)[number]) => draft.updatedAt.getTime()
  ).map((draft: (typeof drafts)[number]) => {
    const contentText = extractContentText(draft.contentJson);
    return {
      id: `draft-${draft.id}`,
      module: "writing",
      title: draft.title,
      summary: buildPreferredExcerpt(normalized, [draft.summary, contentText]),
      href: `/writing/drafts/${draft.id}`,
      meta: writingMeta("draft", { visibility: draft.visibility, updatedAt: draft.updatedAt }),
      sortDate: draft.updatedAt.getTime()
    } satisfies SearchSortableItem;
  });

  const writingPostItems: SearchSortableItem[] = sortByScore(
    posts.filter((post: (typeof posts)[number]) => {
      const contentText = extractContentText(post.contentJson);
      return scoreText(post.title, normalized) > 0
        || scoreText(post.summary, normalized) > 0
        || scoreText(contentText, normalized) > 0;
    }),
    (post: (typeof posts)[number]) => {
      const contentText = extractContentText(post.contentJson);
      return scoreText(post.title, normalized) * 2
        + scoreText(post.summary, normalized)
        + Math.floor(scoreText(contentText, normalized) / 2);
    },
    (post: (typeof posts)[number]) => (post.publishedAt ?? post.updatedAt).getTime()
  ).map((post: (typeof posts)[number]) => {
    const contentText = extractContentText(post.contentJson);
    return {
      id: `post-${post.id}`,
      module: "writing",
      title: post.title,
      summary: buildPreferredExcerpt(normalized, [post.summary, contentText]),
      href: `/writing/${post.slug}`,
      meta: writingMeta("post", { publishedAt: post.publishedAt, updatedAt: post.updatedAt }),
      sortDate: (post.publishedAt ?? post.updatedAt).getTime()
    } satisfies SearchSortableItem;
  });

  const allWritingItems: SearchResultItem[] = sortByScore(
    [...draftItems, ...writingPostItems],
    (item: SearchSortableItem) => scoreText(item.title, normalized) * 2 + scoreText(item.summary, normalized),
    (item: SearchSortableItem) => item.sortDate
  ).map(({ sortDate, ...item }) => item);
  if (allWritingItems.length > 0) {
    groups.push({ module: "writing", title: "Writing", count: allWritingItems.length, items: allWritingItems.slice(0, RESULT_LIMIT) });
  }

  const allArchiveItems = sortByScore(
    archiveItems,
    (item: ArchiveSearchRecord) => scoreText(item.title, normalized) * 2 + scoreText(item.summary, normalized),
    (item: ArchiveSearchRecord) => item.updatedAt.getTime()
  ).map((item: ArchiveSearchRecord) => ({
    id: item.id,
    module: "archive",
    title: item.title,
    summary: buildExcerpt(item.summary, normalized),
    href: archiveHref(item),
    meta: archiveMeta(item.sourceType, item.isFavorite)
  } satisfies SearchResultItem));
  if (allArchiveItems.length > 0) {
    groups.push({ module: "archive", title: "Archive", count: allArchiveItems.length, items: allArchiveItems.slice(0, RESULT_LIMIT) });
  }

  return {
    query: normalized,
    totalCount: groups.reduce((total, group) => total + group.count, 0),
    groups
  };
}
