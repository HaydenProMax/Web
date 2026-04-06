import type { Prisma } from "@prisma/client";
import type { RichTextNode, WritingDraftDetail, WritingDraftSummary, WritingPostDetail, WritingPostSummary } from "@workspace/types/index";

import { upsertArchiveItemForPost } from "@/server/archive/service";
import { getCurrentUserId } from "@/server/auth/current-user";
import { getDb } from "@/server/db";
import { isUniqueConstraintError } from "@/server/db/prisma-errors";
import { syncWritingDraftMediaUsages, syncWritingPostMediaUsages } from "@/server/media/service";
import { writingDraftInputSchema } from "@/server/writing/schema";

import { getWritingPostBySlug, listWritingPosts } from "./mock-data";

const MAX_SLUG_ATTEMPTS = 5;
const useWritingMocks = process.env.USE_WRITING_MOCKS === "true";

function buildLocalMediaUrl(storageKey: string) {
  return `/api/media/files/${storageKey}`;
}

function resolveCoverImageUrl(
  asset: {
    storageProvider: string;
    storageKey: string;
    embedUrl: string | null;
  } | null | undefined,
  fallback?: string | null
) {
  if (asset?.storageProvider === "local") {
    return buildLocalMediaUrl(asset.storageKey);
  }

  if (asset?.embedUrl) {
    return asset.embedUrl;
  }

  return fallback ?? undefined;
}

function normalizeRichTextContent(content: unknown): RichTextNode[] {
  return Array.isArray(content) ? (content as RichTextNode[]) : [];
}

function estimateReadMinutes(content: RichTextNode[]) {
  const words = content.reduce((total, node) => {
    if (typeof node.content !== "string") {
      return total;
    }

    return total + node.content.trim().split(/\s+/).filter(Boolean).length;
  }, 0);

  return Math.max(1, Math.ceil(words / 180));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post";
}

function dedupePostsBySlug(posts: WritingPostSummary[]) {
  const seen = new Set<string>();
  return posts.filter((post) => {
    if (seen.has(post.slug)) {
      return false;
    }

    seen.add(post.slug);
    return true;
  });
}

async function resolveCoverMediaId(ownerId: string, coverImageUrl?: string) {
  if (!coverImageUrl || !coverImageUrl.startsWith("/api/media/files/")) {
    return null;
  }

  const storageKey = coverImageUrl.replace("/api/media/files/", "");
  const db = getDb();
  const asset = await db.mediaAsset.findFirst({
    where: {
      ownerId,
      storageProvider: "local",
      storageKey
    },
    select: { id: true }
  });

  return asset?.id ?? null;
}

async function resolveSourceNote(ownerId: string, sourceNoteSlug?: string) {
  if (!sourceNoteSlug) {
    return null;
  }

  const normalizedSlug = sourceNoteSlug.trim();
  if (!normalizedSlug) {
    return null;
  }

  const db = getDb();
  return db.knowledgeNote.findFirst({
    where: {
      ownerId,
      slug: normalizedSlug,
      isArchived: false
    },
    select: {
      id: true,
      slug: true,
      title: true
    }
  });
}

async function generateUniqueSlug(ownerId: string, title: string, existingPostId?: string | null) {
  const db = getDb();
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await db.writingPost.findFirst({
      where: {
        ownerId,
        slug,
        ...(existingPostId ? { NOT: { id: existingPostId } } : {})
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

function mapDbPostToSummary(post: {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  coverImageUrl: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  visibility: "PRIVATE" | "UNLISTED" | "PUBLIC";
  contentJson: unknown;
  coverMedia: {
    storageProvider: string;
    storageKey: string;
    embedUrl: string | null;
    altText: string | null;
  } | null;
  sourceDraft?: {
    id: string;
    title: string;
  } | null;
  sourceNote?: {
    slug: string;
    title: string;
  } | null;
  _count?: {
    versions: number;
  };
}): WritingPostSummary {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    summary: post.summary ?? "",
    coverImage: resolveCoverImageUrl(post.coverMedia, post.coverImageUrl),
    coverAlt: post.coverMedia?.altText ?? "",
    category: "Published Post",
    readMinutes: estimateReadMinutes(normalizeRichTextContent(post.contentJson)),
    publishedAt: post.publishedAt?.toISOString() ?? post.createdAt.toISOString(),
    visibility: post.visibility,
    updatedAt: post.updatedAt.toISOString(),
    versionCount: post._count?.versions,
    sourceDraftId: post.sourceDraft?.id ?? undefined,
    sourceDraftTitle: post.sourceDraft?.title ?? undefined,
    sourceNoteSlug: post.sourceNote?.slug ?? undefined,
    sourceNoteTitle: post.sourceNote?.title ?? undefined
  };
}

async function listDatabasePublishedWritingPosts() {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const dbPosts = await db.writingPost.findMany({
    where: { ownerId, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 12,
    include: {
      coverMedia: true,
      sourceDraft: {
        select: {
          id: true,
          title: true
        }
      },
      sourceNote: {
        select: {
          slug: true,
          title: true
        }
      },
      _count: {
        select: {
          versions: true
        }
      }
    }
  });

  return dbPosts.map(mapDbPostToSummary);
}

export async function getWritingOverview() {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const [draftCount, archivedDraftCount, livePublishedCount] = await Promise.all([
    db.writingDraft.count({ where: { ownerId, isArchived: false } }),
    db.writingDraft.count({ where: { ownerId, isArchived: true } }),
    db.writingPost.count({ where: { ownerId, status: "PUBLISHED" } })
  ]);

  let publishedCount = livePublishedCount;
  if (useWritingMocks) {
    publishedCount = dedupePostsBySlug([...(await listDatabasePublishedWritingPosts()), ...listWritingPosts()]).length;
  }

  return {
    draftCount,
    archivedDraftCount,
    publishedCount,
    livePublishedCount
  };
}

export async function listPublishedWritingPosts(): Promise<WritingPostSummary[]> {
  const livePosts = await listDatabasePublishedWritingPosts();

  if (useWritingMocks) {
    return dedupePostsBySlug([...livePosts, ...listWritingPosts()]);
  }

  return livePosts;
}

export async function getPublishedWritingPost(slug: string): Promise<WritingPostDetail | undefined> {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const post = await db.writingPost.findFirst({
    where: { ownerId, slug, status: "PUBLISHED" },
    include: {
      coverMedia: true,
      sourceDraft: {
        select: {
          id: true,
          title: true
        }
      },
      sourceNote: {
        select: {
          slug: true,
          title: true
        }
      },
      _count: {
        select: {
          versions: true
        }
      }
    }
  });

  if (post) {
    return {
      ...mapDbPostToSummary(post),
      content: normalizeRichTextContent(post.contentJson)
    };
  }

  if (useWritingMocks) {
    return getWritingPostBySlug(slug);
  }

  return undefined;
}

export async function listWritingDrafts(limit = 6, options?: { archived?: boolean }): Promise<WritingDraftSummary[]> {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const drafts = await db.writingDraft.findMany({
    where: { ownerId, isArchived: options?.archived ?? false },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      publishedPost: {
        select: {
          slug: true,
          title: true,
          publishedAt: true
        }
      },
      sourceNote: {
        select: {
          slug: true,
          title: true
        }
      }
    }
  });

  return drafts.map((draft: (typeof drafts)[number]) => ({
    id: draft.id,
    title: draft.title,
    summary: draft.summary ?? "",
    isArchived: draft.isArchived,
    visibility: draft.visibility,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
    contentBlockCount: Array.isArray(draft.contentJson) ? draft.contentJson.length : 0,
    sourceNoteSlug: draft.sourceNote?.slug ?? undefined,
    sourceNoteTitle: draft.sourceNote?.title ?? undefined,
    publishedPostSlug: draft.publishedPost?.slug ?? undefined,
    publishedPostTitle: draft.publishedPost?.title ?? undefined,
    publishedAt: draft.publishedPost?.publishedAt?.toISOString() ?? undefined
  }));
}

export async function getWritingDraftById(id: string): Promise<WritingDraftDetail | undefined> {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const draft = await db.writingDraft.findFirst({
    where: { id, ownerId },
    include: {
      coverMedia: true,
      publishedPost: true,
      sourceNote: {
        select: {
          slug: true,
          title: true
        }
      }
    }
  });

  if (!draft) {
    return undefined;
  }

  const content = normalizeRichTextContent(draft.contentJson);

  return {
    id: draft.id,
    title: draft.title,
    summary: draft.summary ?? "",
    isArchived: draft.isArchived,
    visibility: draft.visibility,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
    contentBlockCount: content.length,
    coverImageUrl: resolveCoverImageUrl(draft.coverMedia, draft.coverImageUrl),
    sourceNoteSlug: draft.sourceNote?.slug ?? undefined,
    sourceNoteTitle: draft.sourceNote?.title ?? undefined,
    content,
    publishedPostSlug: draft.publishedPost?.slug ?? undefined,
    publishedPostTitle: draft.publishedPost?.title ?? undefined,
    publishedAt: draft.publishedPost?.publishedAt?.toISOString() ?? undefined
  };
}

export async function createWritingDraft(input: unknown) {
  const parsed = writingDraftInputSchema.parse(input);
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const coverMediaId = await resolveCoverMediaId(ownerId, parsed.coverImageUrl);
  const sourceNote = await resolveSourceNote(ownerId, parsed.sourceNoteSlug);

  const draft = await db.writingDraft.create({
    data: {
      ownerId,
      title: parsed.title,
      summary: parsed.summary,
      coverMediaId,
      coverImageUrl: parsed.coverImageUrl || null,
      sourceNoteId: sourceNote?.id ?? null,
      contentJson: parsed.content,
      contentHtml: null,
      isArchived: false,
      visibility: parsed.visibility
    },
    include: {
      coverMedia: true,
      sourceNote: {
        select: {
          slug: true,
          title: true
        }
      }
    }
  });

  await syncWritingDraftMediaUsages(draft.id, parsed);

  return {
    id: draft.id,
    title: draft.title,
    summary: draft.summary ?? "",
    isArchived: false,
    visibility: draft.visibility,
    content: parsed.content,
    coverImageUrl: resolveCoverImageUrl(draft.coverMedia, draft.coverImageUrl),
    sourceNoteSlug: draft.sourceNote?.slug ?? undefined,
    sourceNoteTitle: draft.sourceNote?.title ?? undefined,
    createdAt: draft.createdAt.toISOString(),
    mode: "database"
  };
}

export async function archiveWritingDraft(id: string) {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const existingDraft = await db.writingDraft.findFirst({
    where: { id, ownerId, isArchived: false },
    select: { id: true }
  });

  if (!existingDraft) {
    throw new Error("Draft not found.");
  }

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.plannerTask.updateMany({
      where: { ownerId, relatedDraftId: existingDraft.id },
      data: { relatedDraftId: null }
    });

    await tx.writingDraft.update({
      where: { id: existingDraft.id },
      data: { isArchived: true }
    });
  });
}

export async function restoreWritingDraft(id: string) {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const existingDraft = await db.writingDraft.findFirst({
    where: { id, ownerId, isArchived: true },
    select: { id: true }
  });

  if (!existingDraft) {
    throw new Error("Archived draft not found.");
  }

  await db.writingDraft.update({
    where: { id: existingDraft.id },
    data: { isArchived: false }
  });
}


export async function deleteArchivedWritingDraft(id: string) {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const existingDraft = await db.writingDraft.findFirst({
    where: { id, ownerId, isArchived: true },
    select: {
      id: true,
      publishedPostId: true
    }
  });

  if (!existingDraft) {
    throw new Error("Archived draft not found.");
  }

  if (existingDraft.publishedPostId) {
    throw new Error("Archived draft still backs a live post.");
  }

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.plannerTask.updateMany({
      where: { ownerId, relatedDraftId: existingDraft.id },
      data: { relatedDraftId: null }
    });

    await tx.mediaUsage.deleteMany({
      where: {
        moduleKey: "writing",
        entityType: "draft",
        entityId: existingDraft.id
      }
    });

    await tx.writingDraft.delete({
      where: { id: existingDraft.id }
    });
  });
}
export async function updateWritingDraft(id: string, input: unknown) {
  const parsed = writingDraftInputSchema.parse(input);
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const existingDraft = await db.writingDraft.findFirst({
    where: { id, ownerId, isArchived: false },
    select: { id: true }
  });

  if (!existingDraft) {
    throw new Error("Draft not found.");
  }

  const coverMediaId = await resolveCoverMediaId(ownerId, parsed.coverImageUrl);
  const sourceNote = await resolveSourceNote(ownerId, parsed.sourceNoteSlug);
  const draft = await db.writingDraft.update({
    where: { id: existingDraft.id },
    data: {
      title: parsed.title,
      summary: parsed.summary,
      coverMediaId,
      coverImageUrl: parsed.coverImageUrl || null,
      sourceNoteId: sourceNote?.id ?? null,
      contentJson: parsed.content,
      contentHtml: null,
      visibility: parsed.visibility
    },
    include: {
      coverMedia: true,
      sourceNote: {
        select: {
          slug: true,
          title: true
        }
      }
    }
  });

  await syncWritingDraftMediaUsages(draft.id, parsed);

  return {
    id: draft.id,
    title: draft.title,
    summary: draft.summary ?? "",
    visibility: draft.visibility,
    content: parsed.content,
    coverImageUrl: resolveCoverImageUrl(draft.coverMedia, draft.coverImageUrl),
    sourceNoteSlug: draft.sourceNote?.slug ?? undefined,
    sourceNoteTitle: draft.sourceNote?.title ?? undefined,
    updatedAt: draft.updatedAt.toISOString(),
    mode: "database"
  };
}

export async function publishWritingDraft(id: string) {
  const db = getDb();
  const ownerId = await getCurrentUserId();

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const draft = await db.writingDraft.findFirst({
      where: { id, ownerId, isArchived: false },
      include: {
        coverMedia: true,
        publishedPost: {
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1
            }
          }
        }
      }
    });

    if (!draft) {
      throw new Error("Draft not found.");
    }

    const content = normalizeRichTextContent(draft.contentJson);
    const slug = await generateUniqueSlug(ownerId, draft.title, draft.publishedPostId);
    const now = new Date();
    const syncInput = {
      coverImageUrl: resolveCoverImageUrl(draft.coverMedia, draft.coverImageUrl),
      content
    };

    try {
      return await db.$transaction(async (tx: Prisma.TransactionClient) => {
        if (draft.publishedPost) {
          const nextVersion = (draft.publishedPost.versions[0]?.version ?? 0) + 1;

          const post = await tx.writingPost.update({
            where: { id: draft.publishedPost.id },
            data: {
              slug,
              title: draft.title,
              summary: draft.summary,
              coverMediaId: draft.coverMediaId,
              coverImageUrl: draft.coverImageUrl,
              sourceNoteId: draft.sourceNoteId,
              contentJson: content,
              contentHtml: null,
              status: "PUBLISHED",
              visibility: draft.visibility,
              publishedAt: draft.publishedPost.publishedAt ?? now,
              versions: {
                create: {
                  version: nextVersion,
                  title: draft.title,
                  summary: draft.summary,
                  contentJson: content,
                  contentHtml: null
                }
              }
            }
          });

          await syncWritingPostMediaUsages(post.id, syncInput, tx);
          await upsertArchiveItemForPost({ postId: post.id, title: post.title, summary: post.summary }, tx);

          return {
            id: post.id,
            slug: post.slug,
            title: post.title,
            publishedAt: post.publishedAt?.toISOString() ?? now.toISOString()
          };
        }

        const post = await tx.writingPost.create({
          data: {
            ownerId,
            slug,
            title: draft.title,
            summary: draft.summary,
            coverMediaId: draft.coverMediaId,
            coverImageUrl: draft.coverImageUrl,
            sourceNoteId: draft.sourceNoteId,
            contentJson: content,
            contentHtml: null,
            status: "PUBLISHED",
            visibility: draft.visibility,
            publishedAt: now,
            versions: {
              create: {
                version: 1,
                title: draft.title,
                summary: draft.summary,
                contentJson: content,
                contentHtml: null
              }
            }
          }
        });

        await tx.writingDraft.update({
          where: { id: draft.id },
          data: { publishedPostId: post.id }
        });

        await syncWritingPostMediaUsages(post.id, syncInput, tx);
        await upsertArchiveItemForPost({ postId: post.id, title: post.title, summary: post.summary }, tx);

        return {
          id: post.id,
          slug: post.slug,
          title: post.title,
          publishedAt: post.publishedAt?.toISOString() ?? now.toISOString()
        };
      });
    } catch (error) {
      if (isUniqueConstraintError(error) && attempt < MAX_SLUG_ATTEMPTS - 1) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to reserve a unique post slug.");
}


