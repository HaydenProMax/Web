import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const appDir = path.resolve(repoRoot, "apps/web");
const wantsHelp = process.argv.includes("--help") || process.argv.includes("-h");

const isWsl = process.platform === "linux" && (os.release().toLowerCase().includes("microsoft") || Boolean(process.env.WSL_DISTRO_NAME));
const isMountedWindowsWorkspace = isWsl && appDir.startsWith("/mnt/");
const forceStable = process.env.HAYDEN_WEB_DEV_MODE === "stable";
const forceFast = process.env.HAYDEN_WEB_DEV_MODE === "fast";
const useStableWatcher = forceStable || (isMountedWindowsWorkspace && !forceFast);

if (wantsHelp) {
  console.log("Usage: node scripts/dev-web.mjs");
  console.log("Starts apps/web in a watcher mode that fits the current environment.");
  console.log("Set HAYDEN_WEB_DEV_MODE=fast to force Turbopack.");
  console.log("Set HAYDEN_WEB_DEV_MODE=stable to force polling watchers.");
  process.exit(0);
}

const env = {
  ...process.env
};

if (useStableWatcher) {
  env.WATCHPACK_POLLING = env.WATCHPACK_POLLING ?? "true";
  env.WATCHPACK_POLLING_INTERVAL = env.WATCHPACK_POLLING_INTERVAL ?? "1000";
  env.CHOKIDAR_USEPOLLING = env.CHOKIDAR_USEPOLLING ?? "1";
  env.CHOKIDAR_INTERVAL = env.CHOKIDAR_INTERVAL ?? "1000";
}

const nextArgs = ["exec", "next", "dev"];
if (!useStableWatcher) {
  nextArgs.push("--turbopack");
}

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const modeLabel = useStableWatcher ? "stable polling" : "turbopack";
console.log(`[dev-web] Starting web in ${modeLabel} mode`);
console.log(`[dev-web] cwd: ${appDir}`);

const child = spawn(command, nextArgs, {
  cwd: appDir,
  env,
  stdio: "inherit",
  shell: process.platform === "win32"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
