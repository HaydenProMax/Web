import type { Prisma } from "@prisma/client";
import type {
  KnowledgeFilterOption,
  KnowledgeLibrarySummary,
  KnowledgeNoteDetail,
  KnowledgeNoteSummary,
  KnowledgeOverview,
  RelatedWritingLink,
  RichTextNode
} from "@workspace/types/index";

import { upsertArchiveItemForNote } from "@/server/archive/service";
import { getCurrentUserId } from "@/server/auth/current-user";
import { getDb } from "@/server/db";
import { isUniqueConstraintError } from "@/server/db/prisma-errors";
import { knowledgeNoteInputSchema } from "@/server/knowledge/schema";

const MAX_SLUG_ATTEMPTS = 5;

function normalizeRichTextContent(content: unknown): RichTextNode[] {
  return Array.isArray(content) ? (content as RichTextNode[]) : [];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "note";
}

function buildKnowledgeWhere(ownerId: string, filters?: { domain?: string; tag?: string }, archived = false): Prisma.KnowledgeNoteWhereInput {
  return {
    ownerId,
    isArchived: archived,
    ...(filters?.domain
      ? {
          domain: {
            slug: filters.domain
          }
        }
      : {}),
    ...(filters?.tag
      ? {
          tags: {
            some: {
              tag: {
                slug: filters.tag
              }
            }
          }
        }
      : {})
  };
}

async function generateUniqueNoteSlug(ownerId: string, title: string, existingNoteId?: string | null) {
  const db = getDb();
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await db.knowledgeNote.findFirst({
      where: {
        ownerId,
        slug,
        ...(existingNoteId ? { NOT: { id: existingNoteId } } : {})
      },
      select: { id: true }
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

function mapKnowledgeSummary(note: {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  contentJson: unknown;
  createdAt: Date;
  updatedAt: Date;
  domain: { name: string; slug: string } | null;
  tags: { tag: { name: string; slug: string } }[];
}): KnowledgeNoteSummary {
  const content = normalizeRichTextContent(note.contentJson);

  return {
    id: note.id,
    slug: note.slug,
    title: note.title,
    summary: note.summary ?? "",
    domainName: note.domain?.name ?? undefined,
    domainSlug: note.domain?.slug ?? undefined,
    tags: note.tags.map((entry) => entry.tag.name),
    tagLinks: note.tags.map((entry) => ({
      label: entry.tag.name,
      slug: entry.tag.slug
    })),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    contentBlockCount: content.length
  };
}

function mapRelatedWritingLink(item: {
  id: string;
  title: string;
  slug?: string;
  updatedAt: Date;
  publishedAt?: Date | null;
}, kind: "draft" | "post"): RelatedWritingLink {
  return {
    id: item.id,
    title: item.title,
    href: kind === "draft" ? `/writing/drafts/${item.id}` : `/writing/${item.slug}`,
    kind,
    updatedAt: item.updatedAt.toISOString(),
    publishedAt: item.publishedAt?.toISOString()
  };
}

async function syncKnowledgeNoteTaxonomy(
  tx: Prisma.TransactionClient,
  ownerId: string,
  noteId: string,
  domainName: string,
  tags: string[]
) {
  let domainId: string | null = null;
  const normalizedDomainName = domainName.trim();

  if (normalizedDomainName) {
    const domainSlug = slugify(normalizedDomainName);
    const domain = await tx.knowledgeDomain.upsert({
      where: {
        ownerId_slug: {
          ownerId,
          slug: domainSlug
        }
      },
      update: {
        name: normalizedDomainName
      },
      create: {
        ownerId,
        name: normalizedDomainName,
        slug: domainSlug
      },
      select: { id: true }
    });

    domainId = domain.id;
  }

  await tx.knowledgeNote.update({
    where: { id: noteId },
    data: { domainId }
  });

  const normalizedTags = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
  await tx.knowledgeNoteTag.deleteMany({ where: { noteId } });

  for (const tagName of normalizedTags) {
    const tagSlug = slugify(tagName);
    const tag = await tx.knowledgeTag.upsert({
      where: {
        ownerId_slug: {
          ownerId,
          slug: tagSlug
        }
      },
      update: {
        name: tagName
      },
      create: {
        ownerId,
        name: tagName,
        slug: tagSlug
      },
      select: { id: true }
    });

    await tx.knowledgeNoteTag.create({
      data: {
        noteId,
        tagId: tag.id
      }
    });
  }
}

export async function listKnowledgeNotes(
  limit = 12,
  filters?: { domain?: string; tag?: string },
  archived = false
): Promise<KnowledgeNoteSummary[]> {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const notes = await db.knowledgeNote.findMany({
    where: buildKnowledgeWhere(ownerId, filters, archived),
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      domain: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true, slug: true } } } }
    }
  });

  return notes.map(mapKnowledgeSummary);
}

export async function getKnowledgeNoteBySlug(slug: string): Promise<KnowledgeNoteDetail | undefined> {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const note = await db.knowledgeNote.findFirst({
    where: { ownerId, slug, isArchived: false },
    include: {
      domain: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true, slug: true } } } }
    }
  });

  if (!note) {
    return undefined;
  }

  const [relatedDrafts, relatedPosts] = await Promise.all([
    db.writingDraft.findMany({
      where: {
        ownerId,
        sourceNoteId: note.id
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true
      },
      take: 6
    }),
    db.writingPost.findMany({
      where: {
        ownerId,
        sourceNoteId: note.id,
        status: "PUBLISHED"
      },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        updatedAt: true,
        publishedAt: true
      },
      take: 6
    })
  ]);

  const relatedWriting = [
    ...relatedDrafts.map((draft: (typeof relatedDrafts)[number]) => mapRelatedWritingLink(draft, "draft")),
    ...relatedPosts.map((post: (typeof relatedPosts)[number]) => mapRelatedWritingLink(post, "post"))
  ].sort((left, right) => {
    const leftTime = new Date(left.publishedAt ?? left.updatedAt ?? 0).getTime();
    const rightTime = new Date(right.publishedAt ?? right.updatedAt ?? 0).getTime();
    return rightTime - leftTime;
  });

  return {
    ...mapKnowledgeSummary(note),
    content: normalizeRichTextContent(note.contentJson),
    relatedWriting
  };
}

export async function createKnowledgeNote(input: unknown) {
  const parsed = knowledgeNoteInputSchema.parse(input);
  const db = getDb();
  const ownerId = await getCurrentUserId();

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const slug = await generateUniqueNoteSlug(ownerId, parsed.title);

    try {
      const note = await db.$transaction(async (tx: Prisma.TransactionClient) => {
        const created = await tx.knowledgeNote.create({
          data: {
            ownerId,
            title: parsed.title,
            slug,
            summary: parsed.summary,
            contentJson: parsed.content,
            contentHtml: null,
            isArchived: false
          }
        });

        await syncKnowledgeNoteTaxonomy(tx, ownerId, created.id, parsed.domainName, parsed.tags);
        await upsertArchiveItemForNote({ noteId: created.id, title: created.title, summary: created.summary }, tx);

        return tx.knowledgeNote.findUniqueOrThrow({
          where: { id: created.id },
          include: {
            domain: { select: { name: true, slug: true } },
            tags: { include: { tag: { select: { name: true, slug: true } } } }
          }
        });
      });

      return {
        ...mapKnowledgeSummary(note),
        content: normalizeRichTextContent(note.contentJson),
        relatedWriting: []
      } satisfies KnowledgeNoteDetail;
    } catch (error) {
      if (isUniqueConstraintError(error) && attempt < MAX_SLUG_ATTEMPTS - 1) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to reserve a unique note slug.");
}

export async function updateKnowledgeNote(slug: string, input: unknown) {
  const parsed = knowledgeNoteInputSchema.parse(input);
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const existing = await db.knowledgeNote.findFirst({
    where: { ownerId, slug, isArchived: false },
    select: { id: true }
  });

  if (!existing) {
    throw new Error("Knowledge note not found.");
  }

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const nextSlug = await generateUniqueNoteSlug(ownerId, parsed.title, existing.id);

    try {
      const note = await db.$transaction(async (tx: Prisma.TransactionClient) => {
        const updated = await tx.knowledgeNote.update({
          where: { id: existing.id },
          data: {
            title: parsed.title,
            slug: nextSlug,
            summary: parsed.summary,
            contentJson: parsed.content,
            contentHtml: null
          }
        });

        await syncKnowledgeNoteTaxonomy(tx, ownerId, existing.id, parsed.domainName, parsed.tags);
        await upsertArchiveItemForNote({ noteId: updated.id, title: updated.title, summary: updated.summary }, tx);

        return tx.knowledgeNote.findUniqueOrThrow({
          where: { id: existing.id },
          include: {
            domain: { select: { name: true, slug: true } },
            tags: { include: { tag: { select: { name: true, slug: true } } } }
          }
        });
      });

      return {
        ...mapKnowledgeSummary(note),
        content: normalizeRichTextContent(note.contentJson),
        relatedWriting: []
      } satisfies KnowledgeNoteDetail;
    } catch (error) {
      if (isUniqueConstraintError(error) && attempt < MAX_SLUG_ATTEMPTS - 1) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to reserve a unique note slug.");
}

export async function archiveKnowledgeNote(slug: string) {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const existing = await db.knowledgeNote.findFirst({
    where: { ownerId, slug, isArchived: false },
    select: { id: true }
  });

  if (!existing) {
    throw new Error("Knowledge note not found.");
  }

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.plannerTask.updateMany({
      where: { ownerId, relatedNoteId: existing.id },
      data: { relatedNoteId: null }
    });

    await tx.writingDraft.updateMany({
      where: { ownerId, sourceNoteId: existing.id },
      data: { sourceNoteId: null }
    });

    await tx.writingPost.updateMany({
      where: { ownerId, sourceNoteId: existing.id },
      data: { sourceNoteId: null }
    });

    await tx.archiveItem.deleteMany({
      where: { ownerId, noteId: existing.id }
    });

    await tx.knowledgeNote.update({
      where: { id: existing.id },
      data: { isArchived: true }
    });
  });
}

export async function restoreKnowledgeNote(slug: string) {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const existing = await db.knowledgeNote.findFirst({
    where: { ownerId, slug, isArchived: true },
    select: { id: true, title: true, summary: true }
  });

  if (!existing) {
    throw new Error("Archived knowledge note not found.");
  }

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const restored = await tx.knowledgeNote.update({
      where: { id: existing.id },
      data: { isArchived: false },
      select: { id: true, title: true, summary: true }
    });

    await upsertArchiveItemForNote({ noteId: restored.id, title: restored.title, summary: restored.summary }, tx);
  });
}

export async function deleteArchivedKnowledgeNote(slug: string) {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const existing = await db.knowledgeNote.findFirst({
    where: { ownerId, slug, isArchived: true },
    select: { id: true }
  });

  if (!existing) {
    throw new Error("Archived knowledge note not found.");
  }

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.plannerTask.updateMany({
      where: { ownerId, relatedNoteId: existing.id },
      data: { relatedNoteId: null }
    });

    await tx.writingDraft.updateMany({
      where: { ownerId, sourceNoteId: existing.id },
      data: { sourceNoteId: null }
    });

    await tx.writingPost.updateMany({
      where: { ownerId, sourceNoteId: existing.id },
      data: { sourceNoteId: null }
    });

    await tx.archiveItem.deleteMany({
      where: { ownerId, noteId: existing.id }
    });

    await tx.knowledgeNote.delete({
      where: { id: existing.id }
    });
  });
}

export async function getKnowledgeOverview(filters?: { domain?: string; tag?: string }, archived = false): Promise<KnowledgeOverview> {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const [noteCount, domainCount, tagCount, archivedCount] = await Promise.all([
    db.knowledgeNote.count({ where: buildKnowledgeWhere(ownerId, filters, archived) }),
    db.knowledgeDomain.count({ where: { ownerId } }),
    db.knowledgeTag.count({ where: { ownerId } }),
    db.knowledgeNote.count({ where: { ownerId, isArchived: true } })
  ]);

  return {
    noteCount,
    domainCount,
    tagCount,
    archivedCount
  };
}

function mapFilterOptions(items: Array<{ name: string; slug: string; _count?: { notes?: number; noteTags?: number } }>, kind: "domain" | "tag"): KnowledgeFilterOption[] {
  return items
    .map((item) => ({
      label: item.name,
      slug: item.slug,
      count: item._count?.notes ?? 0
    }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export async function getKnowledgeLibrarySummary(filters?: { domain?: string; tag?: string }, archived = false): Promise<KnowledgeLibrarySummary> {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const [overview, domains, tags] = await Promise.all([
    getKnowledgeOverview(filters, archived),
    db.knowledgeDomain.findMany({
      where: { ownerId },
      select: {
        name: true,
        slug: true,
        _count: {
          select: {
            notes: {
              where: {
                isArchived: archived
              }
            }
          }
        }
      }
    }),
    db.knowledgeTag.findMany({
      where: { ownerId },
      select: {
        name: true,
        slug: true,
        _count: {
          select: {
            notes: {
              where: {
                note: {
                  isArchived: archived
                }
              }
            }
          }
        }
      }
    })
  ]);

  return {
    overview,
    domains: mapFilterOptions(domains, "domain"),
    tags: mapFilterOptions(tags, "tag")
  };
}




