import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import OSS from "ali-oss";

import { loadWorkspaceEnv } from "@/server/env";

import type { UploadableFile } from "./schema";

const VIDEO_TRANSCODE_TMP_DIR = "/tmp/hayden-video-transcode";
const VIDEO_TRANSCODE_ERROR = "Video transcoding failed. Please upload an MP4/H.264 video or try a smaller file.";
const DEFAULT_VIDEO_TRANSCODE_TIMEOUT_SECONDS = 300;

let videoTranscodeQueue = Promise.resolve();

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

function isVideoTranscodeEnabled() {
  loadWorkspaceEnv();
  return process.env.VIDEO_TRANSCODE_ENABLED !== "false";
}

function getVideoTranscodeTimeoutMs() {
  loadWorkspaceEnv();
  const configuredValue = Number(process.env.VIDEO_TRANSCODE_TIMEOUT_SECONDS);
  const timeoutSeconds = Number.isFinite(configuredValue) && configuredValue > 0 ? configuredValue : DEFAULT_VIDEO_TRANSCODE_TIMEOUT_SECONDS;

  return timeoutSeconds * 1000;
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

async function withVideoTranscodeSlot<T>(task: () => Promise<T>) {
  const previousTask = videoTranscodeQueue;
  let releaseSlot: () => void;
  videoTranscodeQueue = new Promise<void>((resolve) => {
    releaseSlot = resolve;
  });

  await previousTask.catch(() => undefined);

  try {
    return await task();
  } finally {
    releaseSlot!();
  }
}

function runFfmpeg(inputPath: string, outputPath: string) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let timedOut = false;
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      "-pix_fmt",
      "yuv420p",
      outputPath
    ]);

    let stderr = "";
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      timedOut = true;
      ffmpeg.kill("SIGKILL");
    }, getVideoTranscodeTimeoutMs());

    function settle(callback: () => void) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      callback();
    }

    ffmpeg.stderr.on("data", (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString()}`.slice(-4000);
    });

    ffmpeg.on("error", (error) => {
      settle(() => reject(error));
    });

    ffmpeg.on("close", (code) => {
      settle(() => {
        if (timedOut) {
          reject(new Error("ffmpeg timed out"));
          return;
        }

        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(stderr || `ffmpeg exited with code ${code ?? "unknown"}`));
      });
    });
  });
}

export async function transcodeVideoToMp4(inputBuffer: Buffer, originalFileName: string) {
  const uploadId = crypto.randomBytes(12).toString("hex");
  const uploadDirectory = path.join(VIDEO_TRANSCODE_TMP_DIR, uploadId);
  const inputPath = path.join(uploadDirectory, `input${getFileExtension(originalFileName, ".bin")}`);
  const outputPath = path.join(uploadDirectory, "output.mp4");

  try {
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(inputPath, inputBuffer);
    await withVideoTranscodeSlot(() => runFfmpeg(inputPath, outputPath));
    return await readFile(outputPath);
  } finally {
    await rm(uploadDirectory, { recursive: true, force: true });
  }
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
  const originalFileName = file.name || "upload";

  if (!isVideoTranscodeEnabled()) {
    const extension = getFileExtension(originalFileName, ".bin");
    const storageKey = buildObjectKey("videos", originalFileName, extension);

    await putObject(storageKey, inputBuffer, file.type || "application/octet-stream");

    return {
      storageProvider: "oss",
      storageKey,
      originalFileName,
      mimeType: file.type || "application/octet-stream",
      size: inputBuffer.byteLength
    };
  }

  let outputBuffer: Buffer;
  try {
    outputBuffer = await transcodeVideoToMp4(inputBuffer, originalFileName);
  } catch (error) {
    console.error("Video transcoding failed", error);
    throw new Error(VIDEO_TRANSCODE_ERROR);
  }

  const storageKey = buildObjectKey("videos", originalFileName, ".mp4");
  await putObject(storageKey, outputBuffer, "video/mp4");

  return {
    storageProvider: "oss",
    storageKey,
    originalFileName,
    mimeType: "video/mp4",
    size: outputBuffer.byteLength
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
