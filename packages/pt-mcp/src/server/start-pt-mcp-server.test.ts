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
});


test("McpServer registra prompts y resources nativos", async () => {
  const { McpServer } = await import("@modelcontextprotocol/server");
  const { registerPrompts } = await import("../prompts/register-prompts.js");
  const { registerResources } = await import("../resources/register-resources.js");

  const server = new McpServer({ name: "test", version: "0.0.0" }) as any;

  registerPrompts({ server });
  registerResources({ server });

  expect(Object.keys(server._registeredPrompts)).toContain("pt.safe_show_batch");
  expect(Object.keys(server._registeredPrompts)).toContain("pt.partial_batch_recovery");
  expect(Object.keys(server._registeredResources)).toContain("pt://guide/agent-usage");
  expect(Object.keys(server._registeredResources)).toContain("pt://recipes/safe-batch-show");
});
