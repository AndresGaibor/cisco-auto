import { describe, expect, test } from "bun:test";
import { createServer } from "node:http";

import { startPtMcpServer } from "./start-pt-mcp-server.js";

describe("startPtMcpServer", () => {
  test("levanta healthz y devuelve una URL local", async () => {
    const handle = await startPtMcpServer({
      repoRoot: "/repo",
      cliEntrypoint: "/repo/apps/pt-cli/src/index.ts",
      port: 0,
      autoFunnel: false,
      commandCatalog: [],
    });

    try {
      expect(handle.localUrl).toContain("http://127.0.0.1:");

      const response = await fetch(`${handle.localUrl}/healthz`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, service: "pt-mcp" });
    } finally {
      await handle.close();
    }
  });

  test("usa otro puerto cuando el solicitado ya está ocupado", async () => {
    const occupiedServer = createServer(() => {});

    const occupiedPort = await new Promise<number>((resolve, reject) => {
      occupiedServer.once("error", reject);
      occupiedServer.listen(0, "127.0.0.1", () => {
        const address = occupiedServer.address();
        if (address && typeof address === "object") {
          resolve(address.port);
          return;
        }
        reject(new Error("No se pudo reservar puerto ocupado"));
      });
    });

    try {
      const handle = await startPtMcpServer({
        repoRoot: "/repo",
        cliEntrypoint: "/repo/apps/pt-cli/src/index.ts",
        port: occupiedPort,
        autoFunnel: false,
        commandCatalog: [],
      });

      try {
        expect(handle.localUrl).not.toContain(`:${occupiedPort}`);
        const response = await fetch(`${handle.localUrl}/healthz`);
        expect(response.status).toBe(200);
      } finally {
        await handle.close();
      }
    } finally {
      await new Promise<void>((resolve) => occupiedServer.close(() => resolve()));
    }
  });

  test("responde OK a GET /mcp sin Accept para validación", async () => {
    const handle = await startPtMcpServer({
      repoRoot: "/repo",
      cliEntrypoint: "/repo/apps/pt-cli/src/index.ts",
      port: 0,
      autoFunnel: false,
      commandCatalog: [],
    });

    try {
      const response = await fetch(`${handle.localUrl}/mcp`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      await expect(response.json()).resolves.toMatchObject({ ok: true, service: "pt-mcp" });
    } finally {
      await handle.close();
    }
  });
});


test("McpServer registra prompts y resources nativos", async () => {
  const { McpServer } = await import("@modelcontextprotocol/server");
  const { registerPrompts } = await import("../prompts/register-prompts.js");
  const { registerResources } = await import("../resources/register-resources.js");
  const { registerTools } = await import("../tools/register-tools.js");

  const server = new McpServer({ name: "test", version: "0.0.0" }) as any;

  registerPrompts({ server });
  registerResources({ server });
  registerTools({
    server,
    control: {
      controller: {
        getHealthSummary: () => Promise.resolve({ bridgeReady: true, runtimeLoaded: true }),
        getHeartbeatHealth: () => ({ state: "ok", latencyMs: 10 }),
        getBridgeStatus: () => ({ ready: true }),
        getSystemContext: () => ({ platform: process.platform }),
        app: {
          paths: () => Promise.resolve({ platform: "mock", source: "test", selected: null, candidates: [] }),
          status: () => Promise.resolve({ process: { level: "running", pid: 99999 }, runtime: { loaded: true }, project: { hasActiveFile: true, activeFile: "/tmp/test.pkt" } }),
          open: () => Promise.resolve({ ok: true }),
          close: () => Promise.resolve({ ok: true }),
          wait: () => Promise.resolve({ ok: true }),
        },
        project: {
          status: () => Promise.resolve({ ok: true, activeFile: "test.pkt" }),
          save: () => Promise.resolve({ ok: true }),
          autosave: () => Promise.resolve({ ok: true }),
          open: () => Promise.resolve({ ok: true }),
          recover: () => Promise.resolve({ ok: true }),
          checkpoints: () => Promise.resolve([]),
        },
        device: { list: () => Promise.resolve([]) },
        link: { list: () => Promise.resolve([]) },
      } as any,
      terminalCommandService: {
        executeCommand: () => Promise.resolve({ ok: true, output: "" }),
        resolveDeviceKind: () => Promise.resolve("router"),
      } as any,
      deviceKindCache: {
        get: () => undefined,
        set: () => undefined,
        clear: () => undefined,
      },
      start: () => Promise.resolve(),
      stop: () => Promise.resolve(),
    },
    runPtCli: async () => ({ ok: true, exitCode: 0, signal: null, argv: [], durationMs: 10, stdout: "", stderr: "", json: null, truncated: { stdout: false, stderr: false }, stdoutBytes: 0, stderrBytes: 0, jsonParsed: false }),
    commandCatalog: [],
    cliEntrypoint: "/repo/apps/pt-cli/src/index.ts",
    repoRoot: "/repo",
    defaultTimeoutMs: 120_000,
  });

  expect(Object.keys(server._registeredPrompts)).toContain("pt.safe_show_batch");
  expect(Object.keys(server._registeredPrompts)).toContain("pt.partial_batch_recovery");
  expect(Object.keys(server._registeredResources)).toContain("pt://guide/agent-usage");
  expect(Object.keys(server._registeredResources)).toContain("pt://recipes/safe-batch-show");
  expect(Object.keys(server._registeredResources)).toContain("ui://pt/status-dashboard/control-panel.html");
});
