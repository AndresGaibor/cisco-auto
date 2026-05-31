import { createServer } from "node:http";
import { spawn } from "node:child_process";

import { McpServer } from "@modelcontextprotocol/server";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";

import { createHealthPayload } from "./health.js";
import { isAllowedOrigin } from "./origin-guard.js";
import { registerPrompts } from "../prompts/register-prompts.js";
import { registerResources } from "../resources/register-resources.js";
import { registerTools } from "../tools/register-tools.js";

import { runPtCli } from "../runner/run-pt-cli.js";
import { resolvePublicUrl } from "../tailscale/resolve-public-url.js";
import { createMcpControlContext } from "../control/mcp-control-context.js";
import type { PtMcpServerHandle, StartPtMcpServerOptions } from "../types.js";

async function runProcess(command: string, args: string[], timeoutMs = 10_000): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number | null }> {
  return await new Promise((resolve) => {
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

async function detectFunnelPort(): Promise<number> {
  try {
    const existing = await runProcess("tailscale", ["funnel", "status", "--json"], 5_000);
    if (existing.ok) {
      const parsed = JSON.parse(existing.stdout) as {
        TCP?: Record<string, { HTTPS?: boolean }>;
        Web?: Record<string, unknown>;
      };
      if (parsed.TCP?.["443"]?.HTTPS) {
        return 8443;
      }
      if (parsed.Web && Object.keys(parsed.Web).some((key) => key.endsWith(":443"))) {
        return 8443;
      }
    }
  } catch {}
  return 443;
}

export async function startPtMcpServer(options: StartPtMcpServerOptions): Promise<PtMcpServerHandle> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 3927;
  const path = options.path ?? "/mcp";
  const commandCatalog = options.commandCatalog ?? [];
  const server = new McpServer({ name: options.appName ?? "Packet Tracer Control MCP", version: options.appVersion ?? "0.1.0" });

  const control = createMcpControlContext();
  await control.start();

  const liveWriter = options.live && options.stderr
    ? (line: string) => { options.stderr!.write(`${line}\n`); }
    : undefined;

  registerTools({
    server,
    control,
    runPtCli,
    commandCatalog,
    cliEntrypoint: options.cliEntrypoint,
    repoRoot: options.repoRoot,
    defaultTimeoutMs: 120_000,
    live: options.live,
    liveWriter,
  });
  registerPrompts({ server });
  registerResources({ server });

  let funnelHttpsPort: number | null = null;
  let publicUrl: string | null = null;

  const httpServer = createServer(async (req, res) => {
    const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? `${host}:${port}`}`);

    if (requestUrl.pathname === "/healthz") {
      const payload = createHealthPayload();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(payload));
      return;
    }

    if (requestUrl.pathname !== path) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "not_found" }));
      return;
    }

    if (!isAllowedOrigin(req.headers.origin, options.allowOrigins ?? [])) {
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "origin_denied" }));
      return;
    }

    const accept = req.headers.accept ?? "";
    if (req.method === "GET" && !accept.includes("text/event-stream")) {
      const payload = createHealthPayload();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(payload));
      return;
    }

    if (!accept.includes("text/event-stream")) {
      req.headers.accept = accept ? `${accept}, text/event-stream` : "application/json, text/event-stream";
    }

    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });

  const listenPort = await new Promise<number>((resolve, reject) => {
    const listen = (nextPort: number): void => {
      const onError = (error: NodeJS.ErrnoException): void => {
        httpServer.off("error", onError);

        if (error.code === "EADDRINUSE" && nextPort !== 0) {
          listen(0);
          return;
        }

        reject(error);
      };

      httpServer.once("error", onError);
      httpServer.listen(nextPort, host, () => {
        httpServer.off("error", onError);

        const address = httpServer.address();
        if (address && typeof address === "object") {
          resolve(address.port);
          return;
        }

        reject(new Error("No se pudo determinar el puerto de escucha"));
      });
    };

    listen(port);
  });

  const localUrl = `http://${host}:${listenPort}`;

  if (options.autoFunnel !== false) {
    const tailscaleCheck = await runProcess("tailscale", ["status", "--json"], 10_000);
    if (tailscaleCheck.ok) {
      funnelHttpsPort = await detectFunnelPort();
      await runProcess("tailscale", ["funnel", "--bg", "--yes", `--https=${funnelHttpsPort}`, String(listenPort)], 15_000);
      publicUrl = await resolvePublicUrl({
        path,
        timeoutMs: 15_000,
        intervalMs: 500,
        publicPort: funnelHttpsPort ?? undefined,
        readTailscaleStatus: async () => {
          const s = await runProcess("tailscale", ["status", "--json"], 5_000);
          return s.ok ? s.stdout : "{}";
        },
        readFunnelStatus: async () => {
          const s = await runProcess("tailscale", ["funnel", "status", "--json"], 5_000);
          return s.ok ? s.stdout : "{}";
        },
      });
    }
  }

  return {
    localUrl,
    publicUrl,
    async close() {
      if (funnelHttpsPort && funnelHttpsPort !== 443) {
        await runProcess("tailscale", ["funnel", "reset"], 5_000).catch(() => {});
      }

      await control.stop();
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },
  };
}
