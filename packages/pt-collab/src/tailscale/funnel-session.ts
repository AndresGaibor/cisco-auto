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
    `${localHost}:${localPort}`,
  ]);

  if (!result.ok) {
    throw new Error(`Funnel falló: ${result.stderr || result.error || "error desconocido"}`);
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

function runTailscale(
  command: string,
  args: string[],
  timeoutMs = 10_000,
): Promise<{ ok: boolean; stdout: string; stderr: string; error?: string }> {
  return new Promise((resolve) => {
    const child = spawn("tailscale", [command, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => (stdout += chunk));
    child.stderr.on("data", (chunk: string) => (stderr += chunk));
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ ok: exitCode === 0, stdout, stderr });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, stdout, stderr, error: err.message });
    });
  });
}
