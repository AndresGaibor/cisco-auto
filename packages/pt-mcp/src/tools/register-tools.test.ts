import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { registerTools } from "./register-tools.js";

function createTempPtDevDir(): string {
  return mkdtempSync(join(tmpdir(), "cisco-auto-pt-mcp-"));
}

describe("registerTools", () => {
  const originalPtDevDir = process.env.PT_DEV_DIR;

  afterEach(() => {
    if (originalPtDevDir === undefined) {
      delete process.env.PT_DEV_DIR;
    } else {
      process.env.PT_DEV_DIR = originalPtDevDir;
    }
  });

  test("pt_omni_raw crea scripts staged, tolera reintentos y ejecuta por archivo", async () => {
    const ptDevDir = createTempPtDevDir();
    process.env.PT_DEV_DIR = ptDevDir;

    const handlers = new Map<string, (input: unknown) => Promise<unknown>>();
    const configs = new Map<string, any>();
    const calls: Array<{ argv: string[]; stdin: string | null; outputMode?: string; spoolDir?: string | null; env?: Record<string, string | undefined> }> = [];

    registerTools({
      server: {
        registerTool(name: string, config: unknown, handler: (input: unknown) => Promise<unknown>) {
          configs.set(name, config);
          handlers.set(name, handler);
        },
      },
      runPtCli: async (input) => {
        const runInput = input as any;
        calls.push({ argv: runInput.argv, stdin: runInput.stdin ?? null, outputMode: runInput.outputMode, spoolDir: runInput.spoolDir ?? null, env: runInput.env });
        return {
          ok: true,
          exitCode: 0,
          signal: null,
          argv: input.argv,
          durationMs: 15,
          stdout: "[[0,\"R1\",\"2911\"]]",
          stderr: "",
          json: null,
          truncated: { stdout: false, stderr: false },
          stdoutBytes: 18,
          stderrBytes: 0,
          jsonParsed: false,
        };
      },
      commandCatalog: [],
      cliEntrypoint: "/repo/apps/pt-cli/src/index.ts",
      repoRoot: "/repo",
      defaultTimeoutMs: 120_000,
    });

    const tool = handlers.get("pt_omni_raw");
    expect(tool).toBeDefined();
    expect((handlers.size > 0) ? true : false).toBe(true);
    expect(configs.get("pt_cli")?.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    });
    expect(configs.get("pt_cli")?.description).toContain("No usar para `pt omni raw`");
    expect(configs.get("pt_omni_raw")?.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    });
    expect(configs.get("pt_doctor")?.description).toContain("diagnosticar instalación");
    expect(configs.get("pt_runtime_status")?.description).toContain("inspeccionar el runtime desplegado");
    expect(configs.get("pt_device_list")?.description).toContain("listar los dispositivos visibles");
    expect(configs.get("pt_help")?.description).toContain("ayuda raíz de la CLI");
    expect(configs.get("pt_list_commands")?.description).toContain("catálogo público de comandos");

    const begin = await tool?.({ op: "begin_script", scriptId: "probe_pt_api", description: "Exploración read-only de APIs internas de PT" });
    expect(JSON.stringify(begin)).toContain("probe_pt_api");

    const append0 = await tool?.({ op: "append_script", scriptId: "probe_pt_api", seq: 0, chunk: "(function(){\n", chunkSha256: "hash-0" });
    const append0Dup = await tool?.({ op: "append_script", scriptId: "probe_pt_api", seq: 0, chunk: "(function(){\n", chunkSha256: "hash-0" });
    const append1 = await tool?.({ op: "append_script", scriptId: "probe_pt_api", seq: 1, chunk: "var out=[];\n", chunkSha256: "hash-1" });
    const status = await tool?.({ op: "script_status", scriptId: "probe_pt_api" });
    const executed = await tool?.({ op: "execute_script", scriptId: "probe_pt_api", parseJson: true, timeoutMs: 60_000 });

    expect(JSON.stringify(append0)).toContain("ok");
    expect(JSON.stringify(append0Dup)).toContain("duplicate");
    expect(JSON.stringify(append1)).toContain("nextSeq");
    expect(JSON.stringify(status)).toContain("probe_pt_api");
    expect(calls.at(-1)?.argv?.[0]).toBe("omni");
    expect(calls.at(-1)?.argv?.[1]).toBe("raw");
    expect(calls.at(-1)?.argv?.[2]).toBe("--file");
    expect(typeof calls.at(-1)?.argv?.[3]).toBe("string");
    expect(calls.at(-1)?.argv?.[4]).toBe("--yes");
    expect(calls.at(-1)?.argv?.[5]).toBe("--raw");
    expect(calls.at(-1)?.argv?.[6]).toBe("--guard");
    expect(calls.at(-1)?.argv?.[7]).toBe("sim");
    expect(calls.at(-1)?.stdin).toBeNull();
    expect(calls.at(-1)?.outputMode).toBe("spool");
    expect(calls.at(-1)?.env?.PT_MCP_ALLOW_DIRECT_OMNI_RAW).toBe("1");
    expect(calls.at(-1)?.spoolDir).toContain("mcp-cache/omni/results");
    expect(JSON.stringify(executed)).toContain("resultId");

    rmSync(ptDevDir, { recursive: true, force: true });
  });

  test("pt_omni_raw execute_script devuelve metadata compacta", async () => {
    const ptDevDir = createTempPtDevDir();
    process.env.PT_DEV_DIR = ptDevDir;

    const handlers = new Map<string, (input: unknown) => Promise<unknown>>();

    registerTools({
      server: {
        registerTool(name: string, _config: unknown, handler: (input: unknown) => Promise<unknown>) {
          handlers.set(name, handler);
        },
      },
      runPtCli: async (input) => ({
        ok: true,
        exitCode: 0,
        signal: null,
        argv: input.argv,
        durationMs: 30,
        stdout: "x".repeat(50_000),
        stderr: "",
        json: null,
        truncated: { stdout: false, stderr: false },
        stdoutBytes: 50_000,
        stderrBytes: 0,
        jsonParsed: false,
      }),
      commandCatalog: [],
      cliEntrypoint: "/repo/apps/pt-cli/src/index.ts",
      repoRoot: "/repo",
      defaultTimeoutMs: 120_000,
    });

    const tool = handlers.get("pt_omni_raw");
    await tool?.({ op: "begin_script", scriptId: "meta_probe" });
    await tool?.({ op: "append_script", scriptId: "meta_probe", seq: 0, chunk: "return 1;" });
    const result = await tool?.({ op: "execute_script", scriptId: "meta_probe", returnMode: "metadata" });

    const text = JSON.stringify(result);
    expect(text.length).toBeLessThan(5_000);
    expect(text).toContain("resultId");
    expect(text).toContain("streams");
    expect(text).not.toContain("preview");

    rmSync(ptDevDir, { recursive: true, force: true });
  });

  test("pt_omni_raw lee resultados por chunks", async () => {
    const ptDevDir = createTempPtDevDir();
    process.env.PT_DEV_DIR = ptDevDir;

    const handlers = new Map<string, (input: unknown) => Promise<unknown>>();

    registerTools({
      server: {
        registerTool(name: string, _config: unknown, handler: (input: unknown) => Promise<unknown>) {
          handlers.set(name, handler);
        },
      },
      runPtCli: async (input) => ({
        ok: true,
        exitCode: 0,
        signal: null,
        argv: input.argv,
        durationMs: 20,
        stdout: "line-0\nline-1\nline-2\nline-3\n",
        stderr: "",
        json: null,
        truncated: { stdout: false, stderr: false },
        stdoutBytes: 28,
        stderrBytes: 0,
        jsonParsed: false,
      }),
      commandCatalog: [],
      cliEntrypoint: "/repo/apps/pt-cli/src/index.ts",
      repoRoot: "/repo",
      defaultTimeoutMs: 120_000,
    });

    const tool = handlers.get("pt_omni_raw");
    await tool?.({ op: "begin_script", scriptId: "probe_pt_api" });
    await tool?.({ op: "append_script", scriptId: "probe_pt_api", seq: 0, chunk: "return 1;" });
    const executed = await tool?.({ op: "execute_script", scriptId: "probe_pt_api" });

    const executedData = executed as any;
    const resultId = executedData?.structuredContent?.resultId ?? executedData?.resultId;
    const read = await tool?.({ op: "read_result", resultId, stream: "stdout", mode: "lines", lineOffset: 1, lineLimit: 2 });

    expect(JSON.stringify(read)).toContain("line-1");
    expect(JSON.stringify(read)).toContain("eof");
    expect(JSON.stringify(read)).toContain("nextOffset");

    rmSync(ptDevDir, { recursive: true, force: true });
  });

  test("pt_cli rechaza scripts Omni Raw largos", async () => {
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
        argv: [],
        durationMs: 1,
        stdout: "",
        stderr: "",
        json: null,
        truncated: { stdout: false, stderr: false },
        stdoutBytes: 0,
        stderrBytes: 0,
        jsonParsed: false,
      }),
      commandCatalog: [],
      cliEntrypoint: "/repo/apps/pt-cli/src/index.ts",
      repoRoot: "/repo",
      defaultTimeoutMs: 120_000,
    });

    const handler = handlers.get("pt_cli");
    const result = await handler?.({
      argv: ["omni", "raw", "x".repeat(8_001)],
    });

    expect(JSON.stringify(result)).toContain("USE_PT_OMNI_RAW_TOOL");
  });

  test("pt_cli rechaza cualquier omni raw", async () => {
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
        argv: [],
        durationMs: 1,
        stdout: "",
        stderr: "",
        json: null,
        truncated: { stdout: false, stderr: false },
        stdoutBytes: 0,
        stderrBytes: 0,
        jsonParsed: false,
      }),
      commandCatalog: [],
      cliEntrypoint: "/repo/apps/pt-cli/src/index.ts",
      repoRoot: "/repo",
      defaultTimeoutMs: 120_000,
    });

    const handler = handlers.get("pt_cli");
    const result = await handler?.({
      argv: ["omni", "raw", "--stdin", "--yes", "--json"],
      stdin: "return 1;",
    });

    expect(JSON.stringify(result)).toContain("USE_PT_OMNI_RAW_TOOL");
  });

  test("pt_omni_raw se anuncia al registrar", async () => {
    const logs: string[] = [];
    const configs = new Map<string, any>();

    registerTools({
      server: {
        registerTool(name: string, config: unknown) {
          configs.set(name, config);
        },
      },
      runPtCli: async () => ({
        ok: true,
        exitCode: 0,
        signal: null,
        argv: [],
        durationMs: 1,
        stdout: "",
        stderr: "",
        json: null,
        truncated: { stdout: false, stderr: false },
        stdoutBytes: 0,
        stderrBytes: 0,
        jsonParsed: false,
      }),
      commandCatalog: [],
      cliEntrypoint: "/repo/apps/pt-cli/src/index.ts",
      repoRoot: "/repo",
      defaultTimeoutMs: 120_000,
      live: true,
      liveWriter: (line) => logs.push(line),
    });

    expect(logs.join("\n")).toContain("registered tool: pt_omni_raw");
    expect(configs.get("pt_omni_raw")?.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    });
    expect(configs.get("pt_omni_raw")?.description).toContain("simulador");
    expect(configs.get("pt_omni_raw")?.description).toContain("No toca la red real");
  });
});
