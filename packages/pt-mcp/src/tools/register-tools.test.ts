import { describe, expect, test } from "bun:test";

import { registerTools } from "./register-tools.js";

describe("registerTools", () => {
  test("emite request y response en modo live", async () => {
    const logs: string[] = [];
    const handlers = new Map<string, (input: unknown) => Promise<unknown>>();

    registerTools({
      server: {
        registerTool(name: string, _config: unknown, handler: (input: unknown) => Promise<unknown>) {
          handlers.set(name, handler);
        },
      },
      runPtCli: async () => ({
        ok: true,
        exitCode: 0,
        signal: null,
        argv: ["doctor", "--json"],
        durationMs: 12,
        stdout: "{\"ok\":true}",
        stderr: "",
        json: { ok: true },
        truncated: { stdout: false, stderr: false },
      }),
      commandCatalog: [],
      cliEntrypoint: "/repo/apps/pt-cli/src/index.ts",
      repoRoot: "/repo",
      defaultTimeoutMs: 120_000,
      live: true,
      liveWriter: (line) => logs.push(line),
    });

    const handler = handlers.get("pt_cli");
    expect(handler).toBeDefined();

    await handler?.({ argv: ["doctor", "--json"] });

    expect(logs.join("\n")).toContain("solicitud pt_cli");
    expect(logs.join("\n")).toContain("respuesta pt_cli");
  });
});
