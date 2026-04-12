import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

import type { UploadableFile } from "./schema";

const MAX_IMAGE_DIMENSION = 2400;
const OUTPUT_IMAGE_QUALITY = 82;

function sanitizeFileName(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "upload";
}

function getStorageRoot() {
  return path.resolve(process.cwd(), "../../storage/media");
}

export async function optimizeImageBuffer(inputBuffer: Buffer) {
  try {
    return await sharp(inputBuffer, { failOn: "warning" })
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true
      })
      .jpeg({
        quality: OUTPUT_IMAGE_QUALITY,
        mozjpeg: true
      })
      .toBuffer();
  } catch {
    throw new Error("The uploaded image could not be processed. Please use a standard JPEG, PNG, or WebP image.");
  }
}

export async function saveFileToLocalStorage(file: UploadableFile) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const randomPrefix = crypto.randomBytes(6).toString("hex");
  const originalFileName = sanitizeFileName(file.name || "upload.jpg");
  const normalizedFileName = originalFileName.replace(/\.[^.]+$/, "") || "upload";
  const relativeDirectory = path.posix.join(year, month);
  const relativePath = path.posix.join(relativeDirectory, `${randomPrefix}-${normalizedFileName}.jpg`);
  const absoluteDirectory = path.join(getStorageRoot(), year, month);
  const absolutePath = path.join(getStorageRoot(), ...relativePath.split("/"));

  await fs.mkdir(absoluteDirectory, { recursive: true });
  const arrayBuffer = await file.arrayBuffer();
  const outputBuffer = await optimizeImageBuffer(Buffer.from(arrayBuffer));
  await fs.writeFile(absolutePath, outputBuffer);

  return {
    storageProvider: "local",
    storageKey: relativePath.replace(/\\/g, "/"),
    originalFileName: file.name || originalFileName,
    mimeType: "image/jpeg",
    size: outputBuffer.byteLength
  };
}

export function resolveLocalStoragePath(storageKey: string) {
  const normalized = storageKey.replace(/\\/g, "/").replace(/^\/+/, "");
  const fullPath = path.resolve(getStorageRoot(), ...normalized.split("/"));
  const root = getStorageRoot();

  if (!fullPath.startsWith(root)) {
    throw new Error("Invalid storage path.");
  }

  return fullPath;
}

export async function readFileFromLocalStorage(storageKey: string) {
  const fullPath = resolveLocalStoragePath(storageKey);
  return fs.readFile(fullPath);
}
