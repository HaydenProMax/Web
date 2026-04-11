import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const appDir = path.join(workspaceRoot, "apps", "web");
const nextBin = path.join(appDir, "node_modules", "next", "dist", "bin", "next");

function parsePort(argv) {
  const portFlagIndex = argv.findIndex((value) => value === "--port");
  if (portFlagIndex >= 0 && argv[portFlagIndex + 1]) {
    return Number(argv[portFlagIndex + 1]);
  }

  const firstPositional = argv.find((value) => /^\d+$/.test(value));
  return firstPositional ? Number(firstPositional) : 3090;
}

const port = parsePort(process.argv.slice(2));
const child = spawn(process.execPath, [nextBin, "start", "--port", String(port)], {
  cwd: appDir,
  stdio: "ignore"
});

let shuttingDown = false;
const keepAlive = setInterval(() => {}, 1000);

function terminateChild() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (!child.killed) {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      try {
        process.kill(child.pid, "SIGTERM");
      } catch {
      }
    }
  }
}

process.on("SIGTERM", () => {
  terminateChild();
  process.exit(0);
});

process.on("SIGINT", () => {
  terminateChild();
  process.exit(0);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

