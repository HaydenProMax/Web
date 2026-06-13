import { z } from "zod";

import { loadWorkspaceEnv } from "@/server/env";

const MAX_IMAGE_UPLOAD_SIZE = 20 * 1024 * 1024;
const DEFAULT_MAX_VIDEO_UPLOAD_MB = 50;
const SUPPORTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const SUPPORTED_VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;

export type UploadableFile = {
  name: string;
  size: number;
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export const mediaUploadMetadataSchema = z.object({
  altText: z.string().max(200).optional().default(""),
  fieldName: z.string().min(1).max(100),
  entityType: z.string().min(1).max(100),
  entityId: z.string().min(1).max(100),
  moduleKey: z.enum(["dashboard", "planner", "knowledge", "writing", "archive", "modules", "settings"])
});

export const mediaEmbedInputSchema = z.object({
  embedUrl: z.string().url(),
  altText: z.string().max(200).optional().default(""),
  fieldName: z.string().min(1).max(100),
  entityType: z.string().min(1).max(100),
  entityId: z.string().min(1).max(100),
  moduleKey: z.enum(["dashboard", "planner", "knowledge", "writing", "archive", "modules", "settings"])
});

export function isUploadableFile(value: unknown): value is UploadableFile {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { name?: unknown }).name === "string" &&
      typeof (value as { size?: unknown }).size === "number" &&
      typeof (value as { type?: unknown }).type === "string" &&
      typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function"
  );
}

export function getUploadFileKind(file: UploadableFile): "IMAGE" | "VIDEO" {
  if (SUPPORTED_IMAGE_MIME_TYPES.includes(file.type as (typeof SUPPORTED_IMAGE_MIME_TYPES)[number])) {
    return "IMAGE";
  }

  if (SUPPORTED_VIDEO_MIME_TYPES.includes(file.type as (typeof SUPPORTED_VIDEO_MIME_TYPES)[number])) {
    return "VIDEO";
  }

  throw new Error("Supported upload formats are JPEG, PNG, WebP, MP4, WebM, and MOV.");
}

function getMaxVideoUploadMb() {
  loadWorkspaceEnv();
  const configuredValue = Number(process.env.VIDEO_UPLOAD_MAX_MB);
  if (Number.isFinite(configuredValue) && configuredValue > 0) {
    return configuredValue;
  }

  return DEFAULT_MAX_VIDEO_UPLOAD_MB;
}

export function assertUploadableFile(file: UploadableFile) {
  if (!file || file.size <= 0) {
    throw new Error("No file was provided.");
  }

  const kind = getUploadFileKind(file);

  if (kind === "IMAGE" && file.size > MAX_IMAGE_UPLOAD_SIZE) {
    throw new Error("Uploaded image exceeds the 20MB limit.");
  }

  const maxVideoUploadMb = getMaxVideoUploadMb();
  if (kind === "VIDEO" && file.size > maxVideoUploadMb * 1024 * 1024) {
    throw new Error(`Uploaded video exceeds the ${maxVideoUploadMb}MB limit.`);
  }
}
