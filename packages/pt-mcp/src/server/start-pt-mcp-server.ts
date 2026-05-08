import { createServer } from "node:http";
import { spawn } from "node:child_process";

import { McpServer } from "@modelcontextprotocol/server";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";

import { createHealthPayload } from "./health.js";
import { isAllowedOrigin } from "./origin-guard.js";
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

export async function startPtMcpServer(options: StartPtMcpServerOptions): Promise<PtMcpServerHandle> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 3927;
  const path = options.path ?? "/mcp";
  const commandCatalog = options.commandCatalog ?? [];
  const server = new McpServer({ name: options.appName ?? "Packet Tracer Control MCP", version: options.appVersion ?? "0.1.0" });

  const control = createMcpControlContext();
  await control.start();

  registerTools({
    server,
    control,
    runPtCli,
    commandCatalog,
    cliEntrypoint: options.cliEntrypoint,
    repoRoot: options.repoRoot,
    defaultTimeoutMs: 120_000,
  });

  let funnelProcess: ReturnType<typeof spawn> | null = null;
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
    const status = await runProcess("tailscale", ["status", "--json"], 10_000);
    if (status.ok) {
      funnelProcess = spawn("tailscale", ["funnel", "--yes", String(listenPort)], { stdio: ["ignore", "pipe", "pipe"] });
      publicUrl = await resolvePublicUrl({
        path,
        timeoutMs: 12_000,
        intervalMs: 500,
        readTailscaleStatus: async () => status.stdout,
        readFunnelStatus: async () => {
          const funnelStatus = await runProcess("tailscale", ["funnel", "status", "--json"], 4_000);
          return funnelStatus.ok ? funnelStatus.stdout : "{}";
        },
      });
    }
  }

  return {
    localUrl,
    publicUrl,
    async close() {
      if (funnelProcess) {
        funnelProcess.kill("SIGTERM");
        funnelProcess = null;
      }

      await control.stop();
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },
  };
}
