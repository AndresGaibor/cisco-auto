import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { registerTools } from "./register-tools.js";

function createTempPtDevDir(): string {
  return mkdtempSync(join(tmpdir(), "cisco-auto-pt-mcp-"));
}

function createMockControl(projectMethods?: {
  status?: () => any;
  save?: () => any;
  autosave?: (opts: any) => any;
  open?: (path: string, opts?: any) => any;
  recover?: (projectPath?: string) => any;
  checkpoints?: (projectPath?: string) => any;
}) {
  return {
    controller: {
      getHealthSummary: () => Promise.resolve({ bridgeReady: true, runtimeLoaded: true }),
      getHeartbeatHealth: () => ({ state: "ok", latencyMs: 10 }),
      getBridgeStatus: () => ({ ready: true }),
      getSystemContext: () => ({ platform: process.platform }),
      app: {
        paths: () => Promise.resolve({ platform: "mock", source: "test", selected: null, candidates: [] }),
        status: () => Promise.resolve({
          process: { level: "running", pid: 99999 },
          runtime: { loaded: true },
          project: { hasActiveFile: true, activeFile: "/tmp/test.pkt" },
        }),
        open: () => Promise.resolve({ ok: true }),
        close: () => Promise.resolve({ ok: true }),
        wait: () => Promise.resolve({ ok: true }),
      },
      project: projectMethods ?? {
        status: () => Promise.resolve({ ok: true, activeFile: "test.pkt" }),
        save: () => Promise.resolve({ ok: true }),
        autosave: (opts: any) => Promise.resolve({ ok: true, dir: opts?.dir, keep: opts?.keep }),
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
    start: () => Promise.resolve(),
    stop: () => Promise.resolve(),
  };
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

  function captureConfigs(): { configs: Map<string, any>; handlers: Map<string, (input: unknown) => Promise<unknown>> } {
    const configs = new Map<string, any>();
    const handlers = new Map<string, (input: unknown) => Promise<unknown>>();
    registerTools({
      server: {
        registerTool(name: string, config: unknown, handler: (input: unknown) => Promise<unknown>) {
          configs.set(name, config);
          handlers.set(name, handler);
        },
      },
      control: createMockControl(),
      runPtCli: async () => ({
        ok: true, exitCode: 0, signal: null, argv: [],
        durationMs: 10, stdout: "", stderr: "", json: null,
        truncated: { stdout: false, stderr: false },
        stdoutBytes: 0, stderrBytes: 0, jsonParsed: false,
      }),
      commandCatalog: [],
      cliEntrypoint: "/repo/apps/pt-cli/src/index.ts",
      repoRoot: "/repo",
      defaultTimeoutMs: 120_000,
    });
    return { configs, handlers };
  }

  test("registra todas las herramientas MCP esperadas", () => {
    const { configs } = captureConfigs();
    const expectedTools = [
      "pt_status", "pt_app", "pt_project", "pt_device", "pt_link",
      "pt_cmd_run", "pt_cmd_queue", "pt_omni", "pt_cli",
    ];
    for (const name of expectedTools) {
      expect(configs.has(name)).toBe(true);
    }
    expect(configs.size).toBe(expectedTools.length);
  });

  test("todas las tools declaran outputSchema", () => {
    const { configs } = captureConfigs();
    const expectedTools = [
      "pt_status", "pt_app", "pt_project", "pt_device", "pt_link",
      "pt_cmd_run", "pt_cmd_queue", "pt_omni", "pt_cli",
    ];
    for (const name of expectedTools) {
      const cfg = configs.get(name);
      expect(cfg).toBeDefined();
      expect(cfg.outputSchema).toBeDefined();
    }
  });

  test("registerTools no elimina outputSchema (no dropOutputSchema)", () => {
    const { configs } = captureConfigs();
    for (const name of [
      "pt_status", "pt_app", "pt_project", "pt_device", "pt_link",
      "pt_cmd_run", "pt_cmd_queue", "pt_omni", "pt_cli",
    ]) {
      const cfg = configs.get(name);
      expect(cfg).toBeDefined();
      expect(cfg.outputSchema).toBeDefined();
    }
  });

  test("todas las tools tienen metadata intuitiva para agentes", () => {
    const { configs } = captureConfigs();

    for (const [name, cfg] of configs.entries()) {
      expect(cfg.title, `${name} debe tener title`).toBeString();
      expect(cfg.title!.length, `${name} title muy corto`).toBeGreaterThanOrEqual(8);

      expect(cfg.description, `${name} debe tener description`).toBeString();
      expect(cfg.description!.length, `${name} description muy corta`).toBeGreaterThanOrEqual(120);

      expect(
        /use|usar|utiliza|diagnostica|ejecuta|gestiona|inspecciona/i.test(cfg.description),
        `${name} debe decir cuándo usar la tool`,
      ).toBe(true);

      expect(
        /read-only|solo lectura|modifica|destructiv|segur|riesgo|fallback|experimental/i.test(cfg.description),
        `${name} debe declarar seguridad/riesgo`,
      ).toBe(true);

      expect(cfg.inputSchema, `${name} debe tener inputSchema`).toBeDefined();
      expect(cfg.outputSchema, `${name} debe tener outputSchema`).toBeDefined();
    }
  });

  test("pt_status outputSchema valida respuesta summary", async () => {
    const { handlers, configs } = captureConfigs();
    const handler = handlers.get("pt_status")!;
    const result = await handler({ op: "summary" }) as any;
    configs.get("pt_status").outputSchema.parse(result.structuredContent);
  });

  test("pt_status tiene annotations correctas (readOnly)", () => {
    const { configs } = captureConfigs();
    expect(configs.get("pt_status")?.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  test("pt_cli tiene annotations de fallback destructivo", () => {
    const { configs } = captureConfigs();
    expect(configs.get("pt_cli")?.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    });
    expect(configs.get("pt_cli")?.description).toContain("Temporary fallback");
    expect(configs.get("pt_cli")?.description).toContain("Do not use this for");
  });

  test("pt_app soporta operaciones paths, status, open, close, restart, wait", () => {
    const { configs } = captureConfigs();
    const schema = configs.get("pt_app")?.inputSchema;
    const schemaStr = JSON.stringify(schema);
    expect(schemaStr).toContain("paths");
    expect(schemaStr).toContain("status");
    expect(schemaStr).toContain("open");
    expect(schemaStr).toContain("close");
    expect(schemaStr).toContain("restart");
    expect(schemaStr).toContain("wait");
  });

  test("pt_project soporta status, save, autosave, open, recover, checkpoints", () => {
    const { configs } = captureConfigs();
    const schema = configs.get("pt_project")?.inputSchema;
    const schemaStr = JSON.stringify(schema);
    expect(schemaStr).toContain("status");
    expect(schemaStr).toContain("save");
    expect(schemaStr).toContain("autosave");
    expect(schemaStr).toContain("open");
    expect(schemaStr).toContain("recover");
    expect(schemaStr).toContain("checkpoints");
  });

  test("pt_omni soporta status, capability, raw, result_status, read_result, clear", () => {
    const { configs } = captureConfigs();
    const schema = configs.get("pt_omni")?.inputSchema;
    const schemaStr = JSON.stringify(schema);
    expect(schemaStr).toContain("status");
    expect(schemaStr).toContain("capability");
    expect(schemaStr).toContain("raw");
    expect(schemaStr).toContain("result_status");
    expect(schemaStr).toContain("read_result");
    expect(schemaStr).toContain("clear");
  });

  test("pt_cli pasa comandos a runPtCli y devuelve resultado estructurado", async () => {
    const ptDevDir = createTempPtDevDir();
    process.env.PT_DEV_DIR = ptDevDir;

    const handlers = new Map<string, (input: unknown) => Promise<unknown>>();
    let lastInput: any = null;

    registerTools({
      server: {
        registerTool(_name: string, _config: unknown, handler: (input: unknown) => Promise<unknown>) {
          handlers.set("pt_cli", handler);
        },
      },
      control: createMockControl(),
      runPtCli: async (input) => {
        lastInput = input;
        return {
          ok: true, exitCode: 0, signal: null, argv: input.argv,
          durationMs: 5, stdout: "ok", stderr: "", json: null,
          truncated: { stdout: false, stderr: false },
          stdoutBytes: 2, stderrBytes: 0, jsonParsed: false,
        };
      },
      commandCatalog: [],
      cliEntrypoint: "/repo/apps/pt-cli/src/index.ts",
      repoRoot: "/repo",
      defaultTimeoutMs: 120_000,
    });

    const handler = handlers.get("pt_cli");
    expect(handler).toBeDefined();

    const result = await handler!({ argv: ["doctor", "--json"], timeoutMs: 10_000 });
    const body = JSON.stringify(result);
    expect(body).toContain("ok");
    expect(lastInput?.argv).toEqual(["doctor", "--json"]);

    rmSync(ptDevDir, { recursive: true, force: true });
  });

  test("pt_project status/save/autosave invocan controller.project y devuelven estructura", async () => {
    const ptDevDir = createTempPtDevDir();
    process.env.PT_DEV_DIR = ptDevDir;

    const handlers = new Map<string, (input: unknown) => Promise<unknown>>();
    const projectCalls: string[] = [];

    registerTools({
      server: {
        registerTool(name: string, _config: unknown, handler: (input: unknown) => Promise<unknown>) {
          handlers.set(name, handler);
        },
      },
      control: createMockControl({
        status: () => { projectCalls.push("status"); return Promise.resolve({ ok: true, activeFile: "proyecto.pkt" }); },
        save: () => { projectCalls.push("save"); return Promise.resolve({ ok: true }); },
        autosave: (opts: any) => { projectCalls.push("autosave"); return Promise.resolve({ ok: true, dir: opts?.dir, keep: opts?.keep }); },
      }),
      runPtCli: async () => ({
        ok: true, exitCode: 0, signal: null, argv: [],
        durationMs: 10, stdout: "", stderr: "", json: null,
        truncated: { stdout: false, stderr: false },
        stdoutBytes: 0, stderrBytes: 0, jsonParsed: false,
      }),
      commandCatalog: [],
      cliEntrypoint: "/repo/apps/pt-cli/src/index.ts",
      repoRoot: "/repo",
      defaultTimeoutMs: 120_000,
    });

    const handler = handlers.get("pt_project")!;

    const r1 = await handler({ op: "status" });
    expect(JSON.stringify(r1)).toContain("project.status");
    expect(JSON.stringify(r1)).toContain("proyecto.pkt");
    expect(projectCalls).toContain("status");

    const r2 = await handler({ op: "save" });
    expect(JSON.stringify(r2)).toContain("project.save");
    expect(projectCalls).toContain("save");

    const r3 = await handler({ op: "autosave", dir: "/backups", keep: 5 });
    expect(JSON.stringify(r3)).toContain("project.autosave");
    expect(JSON.stringify(r3)).toContain("/backups");
    expect(projectCalls).toContain("autosave");

    rmSync(ptDevDir, { recursive: true, force: true });
  });
});
