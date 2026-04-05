import { z } from "zod";

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

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

export function assertUploadableFile(file: File) {
  if (!file || file.size <= 0) {
    throw new Error("No file was provided.");
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error("Uploaded file exceeds the 10MB limit.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Local upload currently supports image files only.");
  }
}
