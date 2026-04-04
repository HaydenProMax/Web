import fs from "node:fs";
import path from "node:path";

import { loadWorkspaceEnv } from "@/server/env";

declare global {
  // eslint-disable-next-line no-var
  var __workspacePrisma: any;
}

function ensureDatabaseUrl() {
  loadWorkspaceEnv();

  if (process.env.DATABASE_URL) {
    return;
  }

  const envPath = path.resolve(process.cwd(), "../../.env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const envText = fs.readFileSync(envPath, "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^"|"$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export function getDb() {
  ensureDatabaseUrl();

  if (!global.__workspacePrisma) {
    const { PrismaClient } = require("@prisma/client") as {
      PrismaClient: new (options?: { log?: string[] }) => any;
    };

    global.__workspacePrisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
    });
  }

  return global.__workspacePrisma;
}
