import { spawn } from "node:child_process";

export interface TailscaleStatus {
  available: boolean;
  loggedIn: boolean;
  selfIp?: string;
  hostname?: string;
  dnsName?: string;
  error?: string;
}

export async function checkTailscaleStatus(): Promise<TailscaleStatus> {
  try {
    const result = await runProcess("tailscale", ["status", "--json"]);
    if (!result.ok) {
      return { available: false, loggedIn: false, error: "tailscale no disponible" };
    }

    const parsed = JSON.parse(result.stdout);
    const self = parsed.Self;

    return {
      available: true,
      loggedIn: !!self,
      selfIp: self?.TailscaleIPs?.[0],
      hostname: self?.HostName,
      dnsName: self?.DNSName,
    };
  } catch {
    return { available: false, loggedIn: false, error: "tailscale no instalado" };
  }
}

export function startTailscaleServe(port: number): Promise<{ ok: boolean; error?: string }> {
  return runProcess("tailscale", ["serve", "--yes", "--https=443", String(port)]);
}

export function startTailscaleFunnel(port: number): Promise<{ ok: boolean; error?: string }> {
  return runProcess("tailscale", ["funnel", "--yes", "--https=443", String(port)]);
}

function runProcess(command: string, args: string[], timeoutMs = 10_000): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ ok: exitCode === 0, stdout, stderr, exitCode });
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve({ ok: false, stdout, stderr, exitCode: null });
    });
  });
}
