import path from "node:path";
import crypto from "node:crypto";
import OSS from "ali-oss";

import { loadWorkspaceEnv } from "@/server/env";

import type { UploadableFile } from "./schema";

function sanitizeFileName(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "upload";
}

function requireEnv(name: string) {
  loadWorkspaceEnv();
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required when MEDIA_STORAGE_PROVIDER=oss.`);
  }
  return value;
}

function getOssClient() {
  return new OSS({
    region: requireEnv("ALI_OSS_REGION"),
    bucket: requireEnv("ALI_OSS_BUCKET"),
    accessKeyId: requireEnv("ALI_OSS_ACCESS_KEY_ID"),
    accessKeySecret: requireEnv("ALI_OSS_ACCESS_KEY_SECRET")
  });
}

function normalizePrefix(prefix: string) {
  return prefix.replace(/^\/+|\/+$/g, "");
}

function buildObjectKey(folder: "images" | "videos", fileName: string, extension: string) {
  loadWorkspaceEnv();
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const randomPrefix = crypto.randomBytes(6).toString("hex");
  const configuredPrefix = normalizePrefix(process.env.ALI_OSS_PREFIX ?? "");
  const safeFileName = sanitizeFileName(fileName || "upload");
  const normalizedFileName = safeFileName.replace(/\.[^.]+$/, "") || "upload";
  const key = path.posix.join(folder, year, month, day, `${randomPrefix}-${normalizedFileName}${extension}`);

  return configuredPrefix ? path.posix.join(configuredPrefix, key) : key;
}

function getFileExtension(fileName: string, fallback: string) {
  return path.extname(sanitizeFileName(fileName)).toLowerCase() || fallback;
}

function getImageExtension(mimeType: string, fileName: string) {
  const extension = getFileExtension(fileName, "");
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
    return extension;
  }

  if (mimeType === "image/png") {
    return ".png";
  }

  if (mimeType === "image/webp") {
    return ".webp";
  }

  return ".jpg";
}

async function putObject(key: string, body: Buffer, mimeType: string) {
  const client = getOssClient();
  await client.put(key, body, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "private, max-age=31536000, immutable"
    }
  });
}

export async function saveImageToOss(file: UploadableFile) {
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  const storageKey = buildObjectKey("images", file.name || "upload.jpg", getImageExtension(mimeType, file.name || "upload.jpg"));

  await putObject(storageKey, inputBuffer, mimeType);

  return {
    storageProvider: "oss",
    storageKey,
    originalFileName: file.name || "upload.jpg",
    mimeType,
    size: inputBuffer.byteLength
  };
}

export async function saveVideoToOss(file: UploadableFile) {
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const extension = getFileExtension(file.name || "upload", ".bin");
  const storageKey = buildObjectKey("videos", file.name || "upload", extension);

  await putObject(storageKey, inputBuffer, file.type || "application/octet-stream");

  return {
    storageProvider: "oss",
    storageKey,
    originalFileName: file.name || "upload",
    mimeType: file.type || "application/octet-stream",
    size: inputBuffer.byteLength
  };
}

export function buildOssSignedUrl(storageKey: string, options?: { imagePreview?: boolean }) {
  const client = getOssClient();
  return client.signatureUrl(storageKey, {
    expires: 300,
    ...(options?.imagePreview
      ? {
          process: "image/auto-orient,1/resize,w_2400,h_2400,m_lfit/quality,q_82/format,jpg"
        }
      : {})
  });
}

export async function deleteOssObject(storageKey: string) {
  const client = getOssClient();

  try {
    await client.delete(storageKey);
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status !== 404) {
      throw error;
    }
  }
}
