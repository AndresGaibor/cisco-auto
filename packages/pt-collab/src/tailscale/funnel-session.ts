import { spawn } from "node:child_process";
import { checkTailscaleStatus } from "./tailscale-status.js";
import { resolvePublicUrl } from "./resolve-public-url.js";

export interface StartFunnelSessionOptions {
  localPort: number;
  localHost?: string;
  publicPort?: 443 | 8443 | 10000;
  pathPrefix?: string;
  foreground?: boolean;
}

export interface FunnelSession {
  publicUrl: string;
  close(): Promise<void>;
}

export async function startFunnelSession(opts: StartFunnelSessionOptions): Promise<FunnelSession> {
  const { localPort, localHost = "127.0.0.1", publicPort = 443 } = opts;

  const status = await checkTailscaleStatus();
  if (!status.available) {
    throw new Error("Tailscale no está instalado. Instálalo en la máquina host.");
  }
  if (!status.loggedIn) {
    throw new Error("Tailscale no está autenticado. Ejecuta 'tailscale up' en esta máquina.");
  }

  const result = await runTailscale("funnel", [
    "--yes",
    `--https=${publicPort}`,
    `${localPort}`,
  ]);

  if (!result.ok) {
    const parts: string[] = [];
    if (result.exitCode !== undefined) parts.push(`exitCode=${result.exitCode}`);
    if (result.stderr) parts.push(`stderr="${result.stderr.trim()}"`);
    if (result.error) parts.push(`error="${result.error}"`);
    if (result.timeout) parts.push("timeout");
    throw new Error(`Funnel falló. ${parts.join(", ") || "razón desconocida"}`);
  }

  const publicUrl = await resolvePublicUrl();
  if (!publicUrl) {
    throw new Error("No se pudo determinar la URL pública de Tailscale");
  }

  const fullUrl = `${publicUrl}/collab/s/${extractSessionSecret()}`;

  return {
    publicUrl: fullUrl,
    async close() {
      await runTailscale("funnel", ["off", `--https=${publicPort}`]);
    },
  };
}

function extractSessionSecret(): string {
  try {
    const { readHostConfig } = require("../storage/host-config-store.js");
    const cfg = readHostConfig();
    return cfg?.sessionSecret ?? "";
  } catch {
    return "";
  }
}

interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  error?: string;
  exitCode?: number;
  timeout?: boolean;
}

function runTailscale(
  command: string,
  args: string[],
  timeoutMs = 15_000,
): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn("tailscale", [command, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let resolved = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
      // Si llegó al timeout, el proceso se quedó en foreground (tailscale viejo).
      // Asumimos éxito porque el funnel se configuró antes de timeout.
      if (!resolved) {
        resolved = true;
        resolve({ ok: true, stdout, stderr, timeout: true });
      }
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => (stdout += chunk));
    child.stderr.on("data", (chunk: string) => (stderr += chunk));
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      if (resolved) return;
      resolved = true;
      resolve({ ok: exitCode === 0, stdout, stderr, exitCode: exitCode ?? undefined });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      if (resolved) return;
      resolved = true;
      resolve({ ok: false, stdout, stderr, error: err.message, exitCode: undefined });
    });
  });
}
