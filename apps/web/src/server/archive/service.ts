import type { Prisma, PrismaClient } from "@prisma/client";
import type { ArchiveCollectionSummary, ArchiveFilterKey, ArchiveItemSummary, ArchiveTimelineGroup } from "@workspace/types/index";

import { getCurrentUserId } from "@/server/auth/current-user";
import { getDb } from "@/server/db";
import { isUniqueConstraintError } from "@/server/db/prisma-errors";

type DbClient = PrismaClient | Prisma.TransactionClient;

function mapArchiveItem(item: {
  id: string;
  title: string;
  summary: string | null;
  sourceType: "NOTE" | "POST" | "MEDIA" | "RESOURCE";
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
  note: { slug: string } | null;
  post: { slug: string } | null;
}): ArchiveItemSummary {
  const href = item.post
    ? `/writing/${item.post.slug}`
    : item.note
      ? `/knowledge/${item.note.slug}`
      : undefined;

  return {
    id: item.id,
    title: item.title,
    summary: item.summary ?? "",
    sourceType: item.sourceType,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    href,
    badge: item.sourceType === "POST" ? "Writing" : item.sourceType === "NOTE" ? "Knowledge" : item.sourceType,
    isFavorite: item.isFavorite
  };
}

export async function upsertArchiveItemForPost(
  input: { postId: string; title: string; summary?: string | null },
  dbClient?: DbClient
) {
  const db = dbClient ?? getDb();
  const ownerId = await getCurrentUserId();

  const existing = await db.archiveItem.findFirst({
    where: {
      ownerId,
      sourceType: "POST",
      postId: input.postId
    },
    select: { id: true }
  });

  if (existing) {
    return db.archiveItem.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        summary: input.summary ?? null
      }
    });
  }

  try {
    return await db.archiveItem.create({
      data: {
        ownerId,
        sourceType: "POST",
        postId: input.postId,
        title: input.title,
        summary: input.summary ?? null
      }
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const createdByConcurrentRequest = await db.archiveItem.findFirstOrThrow({
      where: {
        ownerId,
        sourceType: "POST",
        postId: input.postId
      },
      select: { id: true }
    });

    return db.archiveItem.update({
      where: { id: createdByConcurrentRequest.id },
      data: {
        title: input.title,
        summary: input.summary ?? null
      }
    });
  }
}

export async function upsertArchiveItemForNote(
  input: { noteId: string; title: string; summary?: string | null },
  dbClient?: DbClient
) {
  const db = dbClient ?? getDb();
  const ownerId = await getCurrentUserId();

  const existing = await db.archiveItem.findFirst({
    where: {
      ownerId,
      sourceType: "NOTE",
      noteId: input.noteId
    },
    select: { id: true }
  });

  if (existing) {
    return db.archiveItem.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        summary: input.summary ?? null
      }
    });
  }

  try {
    return await db.archiveItem.create({
      data: {
        ownerId,
        sourceType: "NOTE",
        noteId: input.noteId,
        title: input.title,
        summary: input.summary ?? null
      }
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const createdByConcurrentRequest = await db.archiveItem.findFirstOrThrow({
      where: {
        ownerId,
        sourceType: "NOTE",
        noteId: input.noteId
      },
      select: { id: true }
    });

    return db.archiveItem.update({
      where: { id: createdByConcurrentRequest.id },
      data: {
        title: input.title,
        summary: input.summary ?? null
      }
    });
  }
}

export async function listArchiveCollectionSummaries(): Promise<ArchiveCollectionSummary[]> {
  const db = getDb();
  const ownerId = await getCurrentUserId();

  const [totalCount, favoriteCount, resourceCount] = await Promise.all([
    db.archiveItem.count({ where: { ownerId } }),
    db.archiveItem.count({ where: { ownerId, isFavorite: true } }),
    db.archiveItem.count({ where: { ownerId, sourceType: "RESOURCE" } })
  ]);

  return [
    {
      key: "favorites",
      title: "Favorites",
      description: "Pin important writing, notes, and resources.",
      count: favoriteCount,
      href: "/archive?collection=favorites",
      eyebrow: "Collection"
    },
    {
      key: "all",
      title: "History",
      description: "Preserve cross-module records and snapshots.",
      count: totalCount,
      href: "/archive",
      eyebrow: "Record"
    },
    {
      key: "resources",
      title: "Resources",
      description: "Saved references and future library assets.",
      count: resourceCount,
      href: "/archive?collection=resources",
      eyebrow: "Planned"
    }
  ];
}

export async function getArchiveOverview() {
  const collections = await listArchiveCollectionSummaries();
  const allCollection = collections.find((collection) => collection.key === "all");

  return {
    totalCount: allCollection?.count ?? 0,
    favoriteCount: collections.find((collection) => collection.key === "favorites")?.count ?? 0,
    resourceCount: collections.find((collection) => collection.key === "resources")?.count ?? 0
  };
}

function buildArchiveFilterWhere(ownerId: string, filter: ArchiveFilterKey): Prisma.ArchiveItemWhereInput {
  if (filter === "favorites") {
    return { ownerId, isFavorite: true };
  }

  if (filter === "resources") {
    return { ownerId, sourceType: "RESOURCE" };
  }

  return { ownerId };
}

export async function listRecentArchiveItems(
  limit = 12,
  filter: ArchiveFilterKey = "all"
): Promise<ArchiveItemSummary[]> {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const items = await db.archiveItem.findMany({
    where: buildArchiveFilterWhere(ownerId, filter),
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      note: {
        select: { slug: true }
      },
      post: {
        select: { slug: true }
      }
    }
  });

  return items.map(mapArchiveItem);
}

export async function setArchiveItemFavorite(itemId: string, isFavorite: boolean) {
  const db = getDb();
  const ownerId = await getCurrentUserId();

  const existing = await db.archiveItem.findFirst({
    where: {
      id: itemId,
      ownerId
    },
    select: { id: true }
  });

  if (!existing) {
    throw new Error("Archive item not found");
  }

  return db.archiveItem.update({
    where: { id: existing.id },
    data: { isFavorite }
  });
}


function timelineGroupLabel(date: Date) {
  return date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short"
  });
}

export async function listArchiveTimelineGroups(
  limit = 24,
  filter: ArchiveFilterKey = "all"
): Promise<ArchiveTimelineGroup[]> {
  const items = await listRecentArchiveItems(limit, filter);
  const groups = new Map<string, ArchiveTimelineGroup>();

  for (const item of items) {
    const date = new Date(item.updatedAt);
    const key = date.toISOString().slice(0, 10);
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(item);
      existing.itemCount += 1;
      continue;
    }

    groups.set(key, {
      key,
      label: timelineGroupLabel(date),
      itemCount: 1,
      items: [item]
    });
  }

  return Array.from(groups.values()).sort((left, right) => right.key.localeCompare(left.key));
}
