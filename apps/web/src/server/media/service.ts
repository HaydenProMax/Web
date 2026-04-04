import type { Prisma, PrismaClient } from "@prisma/client";
import type { MediaAssetSummary, RichTextNode, WritingDraftInput } from "@workspace/types/index";

import { getCurrentUserId } from "@/server/auth/current-user";
import { getDb } from "@/server/db";

import { saveFileToLocalStorage } from "./local-storage";
import { assertUploadableFile, mediaEmbedInputSchema, mediaUploadMetadataSchema } from "./schema";

function buildLocalMediaUrl(storageKey: string) {
  return `/api/media/files/${storageKey}`;
}

type DbClient = PrismaClient | Prisma.TransactionClient;

function extractStorageKeyFromUrl(url?: string) {
  if (!url || !url.startsWith("/api/media/files/")) {
    return undefined;
  }

  return url.replace("/api/media/files/", "");
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function collectImageStorageKeys(content: RichTextNode[]) {
  const keys: string[] = [];

  for (const node of content) {
    if (node.type !== "image") {
      continue;
    }

    const storageKey = extractStorageKeyFromUrl(node.src);
    if (storageKey) {
      keys.push(storageKey);
    }
  }

  return keys;
}

function collectEmbedUrls(content: RichTextNode[]) {
  const urls: string[] = [];

  for (const node of content) {
    if (node.type !== "videoEmbed" || !node.embedUrl) {
      continue;
    }

    urls.push(node.embedUrl);
  }

  return urls;
}

function buildUsageFieldNames(asset: { storageProvider: string; storageKey: string; embedUrl: string | null }, input: Pick<WritingDraftInput, "coverImageUrl" | "content">) {
  const fields = new Set<string>();

  if (asset.storageProvider === "embed") {
    if (asset.embedUrl && collectEmbedUrls(input.content).includes(asset.embedUrl)) {
      fields.add("content");
    }
    return Array.from(fields);
  }

  const storageKey = asset.storageKey;
  if (extractStorageKeyFromUrl(input.coverImageUrl) === storageKey) {
    fields.add("coverImage");
  }

  if (collectImageStorageKeys(input.content).includes(storageKey)) {
    fields.add("content");
  }

  return Array.from(fields);
}

export async function createUploadedImageAsset(file: File, metadataInput: unknown): Promise<MediaAssetSummary> {
  assertUploadableFile(file);
  const metadata = mediaUploadMetadataSchema.parse(metadataInput);
  const storedFile = await saveFileToLocalStorage(file);
  const db = getDb();

  const asset = await db.mediaAsset.create({
    data: {
      ownerId: await getCurrentUserId(),
      kind: "IMAGE",
      status: "READY",
      storageProvider: storedFile.storageProvider,
      storageKey: storedFile.storageKey,
      originalFileName: storedFile.originalFileName,
      mimeType: storedFile.mimeType,
      size: storedFile.size,
      altText: metadata.altText || null
    }
  });

  await db.mediaUsage.create({
    data: {
      mediaId: asset.id,
      moduleKey: metadata.moduleKey,
      entityType: metadata.entityType,
      entityId: metadata.entityId,
      fieldName: metadata.fieldName
    }
  });

  return {
    id: asset.id,
    kind: asset.kind,
    status: asset.status,
    mimeType: asset.mimeType,
    originalFileName: asset.originalFileName ?? storedFile.originalFileName,
    size: asset.size ?? storedFile.size,
    altText: asset.altText ?? undefined,
    url: buildLocalMediaUrl(asset.storageKey),
    createdAt: asset.createdAt.toISOString()
  };
}

export async function createEmbedMediaAsset(input: unknown): Promise<MediaAssetSummary> {
  const parsed = mediaEmbedInputSchema.parse(input);
  const db = getDb();

  const asset = await db.mediaAsset.create({
    data: {
      ownerId: await getCurrentUserId(),
      kind: "EMBED",
      status: "READY",
      storageProvider: "embed",
      storageKey: parsed.embedUrl,
      originalFileName: "embed",
      mimeType: "text/uri-list",
      size: 0,
      altText: parsed.altText || null,
      embedUrl: parsed.embedUrl
    }
  });

  await db.mediaUsage.create({
    data: {
      mediaId: asset.id,
      moduleKey: parsed.moduleKey,
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      fieldName: parsed.fieldName
    }
  });

  return {
    id: asset.id,
    kind: asset.kind,
    status: asset.status,
    mimeType: asset.mimeType,
    originalFileName: asset.originalFileName ?? "embed",
    size: asset.size ?? 0,
    altText: asset.altText ?? undefined,
    embedUrl: asset.embedUrl ?? undefined,
    createdAt: asset.createdAt.toISOString()
  };
}

export async function syncWritingMediaUsages(
  entityType: "draft" | "post",
  entityId: string,
  input: Pick<WritingDraftInput, "coverImageUrl" | "content">,
  dbClient?: DbClient
) {
  const db = dbClient ?? getDb();
  const ownerId = await getCurrentUserId();

  const imageStorageKeys = uniqueStrings([
    extractStorageKeyFromUrl(input.coverImageUrl),
    ...collectImageStorageKeys(input.content)
  ]);
  const embedUrls = uniqueStrings(collectEmbedUrls(input.content));

  const orFilters: Prisma.MediaAssetWhereInput[] = [];
  if (imageStorageKeys.length > 0) {
    orFilters.push({ storageProvider: "local", storageKey: { in: imageStorageKeys } });
  }
  if (embedUrls.length > 0) {
    orFilters.push({ storageProvider: "embed", embedUrl: { in: embedUrls } });
  }

  await db.mediaUsage.deleteMany({
    where: {
      moduleKey: "writing",
      entityType,
      entityId
    }
  });

  if (orFilters.length === 0) {
    return;
  }

  const assets = await db.mediaAsset.findMany({
    where: {
      ownerId,
      OR: orFilters
    }
  });

  if (assets.length === 0) {
    return;
  }

  const usageRows = assets.flatMap((asset: (typeof assets)[number]) =>
    buildUsageFieldNames(asset, input).map((fieldName) => ({
      mediaId: asset.id,
      moduleKey: "writing" as const,
      entityType,
      entityId,
      fieldName
    }))
  );

  if (usageRows.length > 0) {
    await db.mediaUsage.createMany({ data: usageRows });
  }

  if (entityType === "draft") {
    await db.mediaUsage.deleteMany({
      where: {
        mediaId: { in: assets.map((asset: (typeof assets)[number]) => asset.id) },
        moduleKey: "writing",
        entityType: "draft",
        entityId: "pending"
      }
    });
  }
}

export async function syncWritingDraftMediaUsages(draftId: string, input: Pick<WritingDraftInput, "coverImageUrl" | "content">, dbClient?: DbClient) {
  await syncWritingMediaUsages("draft", draftId, input, dbClient);
}

export async function syncWritingPostMediaUsages(postId: string, input: Pick<WritingDraftInput, "coverImageUrl" | "content">, dbClient?: DbClient) {
  await syncWritingMediaUsages("post", postId, input, dbClient);
}
