import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync, spawn, spawnSync } from "node:child_process";
import http from "node:http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const appDir = path.join(workspaceRoot, "apps", "web");
const nextBin = path.join(appDir, "node_modules", "next", "dist", "bin", "next");
const tmpDir = path.join(workspaceRoot, "tmp");

function parsePort(argv) {
  const portFlagIndex = argv.findIndex((value) => value === "--port");
  if (portFlagIndex >= 0 && argv[portFlagIndex + 1]) {
    return Number(argv[portFlagIndex + 1]);
  }

  const firstPositional = argv.find((value) => /^\d+$/.test(value));
  return firstPositional ? Number(firstPositional) : 3090;
}

function getPidPath(port) {
  return path.join(tmpDir, `regression-web-${port}.pid`);
}

function ensureTmpDir() {
  fs.mkdirSync(tmpDir, { recursive: true });
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function shellQuote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function findWindowsPidByPort(port) {
  try {
    const output = execSync(`netstat -ano -p tcp`, { encoding: "utf8" });
    const lines = output.split(/\r?\n/);
    for (const line of lines) {
      if (!line.includes(`:${port}`) || !line.includes("LISTENING")) {
        continue;
      }

      const parts = line.trim().split(/\s+/);
      const pid = Number(parts[parts.length - 1]);
      if (pid) {
        return pid;
      }
    }
  } catch {
  }

  return undefined;
}

function findUnixPidByPort(port) {
  try {
    const ssOutput = execSync(`ss -ltnp '( sport = :${port} )'`, { encoding: "utf8", shell: "/bin/bash" });
    const match = ssOutput.match(/pid=(\d+)/);
    if (match) {
      return Number(match[1]);
    }
  } catch {
  }

  try {
    const lsofOutput = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: "utf8", shell: "/bin/bash" }).trim();
    const pid = Number(lsofOutput.split(/\r?\n/)[0]);
    if (pid) {
      return pid;
    }
  } catch {
  }

  return undefined;
}

function findPidByPort(port) {
  return process.platform === "win32" ? findWindowsPidByPort(port) : findUnixPidByPort(port);
}

function requestSignIn(port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: "127.0.0.1",
        port,
        path: "/sign-in",
        timeout: timeoutMs
      },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      }
    );

    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });

    req.on("error", () => resolve(false));
  });
}

function startDetachedServer(port) {
  if (process.platform === "win32") {
    const child = spawn(process.execPath, [nextBin, "start", "--port", String(port)], {
      cwd: appDir,
      detached: true,
      stdio: "ignore"
    });
    child.unref();
    return child.pid;
  }

  const command = `cd ${shellQuote(appDir)} && nohup ${shellQuote(process.execPath)} ${shellQuote(nextBin)} start --port ${port} >/dev/null 2>&1 & echo $!`;
  const output = execSync(command, {
    cwd: appDir,
    encoding: "utf8",
    shell: "/bin/bash"
  }).trim();
  return Number(output);
}

export async function startRegressionServer(port) {
  ensureTmpDir();
  const pidPath = getPidPath(port);
  const existingListenerPid = findPidByPort(port);

  if (fs.existsSync(pidPath)) {
    const existingPid = Number(fs.readFileSync(pidPath, "utf8").trim());
    if (existingPid && (isProcessRunning(existingPid) || existingListenerPid === existingPid)) {
      return (await requestSignIn(port)) ? `READY:${existingPid}:${port}` : `RUNNING:${existingPid}:${port}`;
    }

    fs.rmSync(pidPath, { force: true });
  }

  if (existingListenerPid) {
    throw new Error(`PORT-IN-USE:${port}:${existingListenerPid}`);
  }

  const startedPid = startDetachedServer(port);
  fs.writeFileSync(pidPath, `${startedPid}\n`, "utf8");

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const listenerPid = findPidByPort(port);
    if (listenerPid && (await requestSignIn(port))) {
      fs.writeFileSync(pidPath, `${listenerPid}\n`, "utf8");
      return `READY:${listenerPid}:${port}`;
    }

    if (!isProcessRunning(startedPid) && !listenerPid) {
      break;
    }
  }

  const listenerPid = findPidByPort(port);
  if (listenerPid) {
    fs.writeFileSync(pidPath, `${listenerPid}\n`, "utf8");
    return `STARTED:${listenerPid}:${port}`;
  }

  fs.rmSync(pidPath, { force: true });
  throw new Error(`FAILED:${port}`);
}

export async function getRegressionServerStatus(port) {
  const pidPath = getPidPath(port);
  const storedPid = fs.existsSync(pidPath) ? Number(fs.readFileSync(pidPath, "utf8").trim()) : undefined;
  const listenerPid = findPidByPort(port);
  const pid = listenerPid ?? storedPid;

  if (!pid) {
    if (fs.existsSync(pidPath)) {
      fs.rmSync(pidPath, { force: true });
    }
    return "NOT-RUNNING";
  }

  fs.writeFileSync(pidPath, `${pid}\n`, "utf8");
  return (await requestSignIn(port)) ? `READY:${pid}:${port}` : `RUNNING:${pid}:${port}`;
}

export function stopRegressionServer(port) {
  const pidPath = getPidPath(port);
  const storedPid = fs.existsSync(pidPath) ? Number(fs.readFileSync(pidPath, "utf8").trim()) : undefined;
  const listenerPid = findPidByPort(port);
  const pid = listenerPid ?? storedPid;

  if (!pid) {
    if (fs.existsSync(pidPath)) {
      fs.rmSync(pidPath, { force: true });
    }
    return "NOT-RUNNING";
  }

  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(pid, "SIGTERM");
    }

    fs.rmSync(pidPath, { force: true });
    return `STOPPED:${pid}`;
  } catch {
    fs.rmSync(pidPath, { force: true });
    return `STALE:${pid}`;
  }
}

export { parsePort, requestSignIn, workspaceRoot };
