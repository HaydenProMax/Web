import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

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

export async function saveFileToLocalStorage(file: File) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const randomPrefix = crypto.randomBytes(6).toString("hex");
  const originalFileName = sanitizeFileName(file.name || "upload.bin");
  const relativeDirectory = path.posix.join(year, month);
  const relativePath = path.posix.join(relativeDirectory, `${randomPrefix}-${originalFileName}`);
  const absoluteDirectory = path.join(getStorageRoot(), year, month);
  const absolutePath = path.join(getStorageRoot(), ...relativePath.split("/"));

  await fs.mkdir(absoluteDirectory, { recursive: true });
  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(absolutePath, Buffer.from(arrayBuffer));

  return {
    storageProvider: "local",
    storageKey: relativePath.replace(/\\/g, "/"),
    originalFileName: file.name || originalFileName,
    mimeType: file.type || "application/octet-stream",
    size: file.size
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
