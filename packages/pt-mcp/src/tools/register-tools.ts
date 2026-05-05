import { createHash, randomUUID } from "node:crypto";

import * as z from "zod/v4";

import type { PtMcpCommandCatalogEntry, RunPtCliInput, RunPtCliResult } from "../types.js";
import {
  appendOmniScriptChunk,
  beginOmniScript,
  clearOmniCache,
  cleanupExpiredOmniCache,
  getOmniResultPaths,
  getOmniScriptPaths,
  getOmniResultStatus,
  getOmniScriptStatus,
  readOmniResult,
  recordOmniResult,
} from "./omni-cache.js";

export interface RegisterToolsOptions {
  server: { registerTool: (...args: any[]) => void };
  runPtCli: (input: RunPtCliInput) => Promise<RunPtCliResult>;
  commandCatalog: PtMcpCommandCatalogEntry[];
  cliEntrypoint: string;
  repoRoot: string;
  defaultTimeoutMs: number;
  live?: boolean;
  liveWriter?: (line: string) => void;
}

function formatResult(result: RunPtCliResult): { content: Array<{ type: "text"; text: string }>; structuredContent: RunPtCliResult } {
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    structuredContent: result,
  };
}

type OmniRawToolInput = {
  op: "stage" | "append" | "execute" | "run_staged" | "dry_run" | "clear";
  scriptId?: string;
  code?: string;
  chunk?: string;
  wrap?: boolean;
  parseJson?: boolean;
  timeoutMs?: number;
  maxOutputBytes?: number;
};

type OmniRawScriptStore = Map<string, string>;

type OmniRawSummary = {
  ok: boolean;
  scriptId: string;
  op: OmniRawToolInput["op"];
  codeBytes: number;
  codeSha256?: string;
  chunkCount?: number;
  argv?: string[];
  durationMs?: number;
  exitCode?: number | null;
  signal?: NodeJS.Signals | null;
  json?: unknown;
  stdoutPreview?: string;
  stderrPreview?: string;
  truncated?: { stdout: boolean; stderr: boolean };
  error?: { code: string; message: string };
};

function createToolContent<T extends Record<string, unknown>>(structuredContent: T): { content: Array<{ type: "text"; text: string }>; structuredContent: T } {
  return {
    content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
    structuredContent,
  };
}

const READ_ONLY_SIM = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const DANGEROUS_FALLBACK = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
} as const;

const DANGEROUS_LOCAL_RAW = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
} as const;

function normalizeScriptId(scriptId?: string): string {
  if (scriptId && /^[a-zA-Z0-9_.-]{1,80}$/.test(scriptId)) return scriptId;
  return `omni_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function previewText(text: string, maxBytes: number): { value: string; truncated: boolean } {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length <= maxBytes) return { value: text, truncated: false };
  return { value: new TextDecoder().decode(bytes.slice(0, maxBytes)), truncated: true };
}

function summarizeRunResult(result: RunPtCliResult, maxOutputBytes: number): OmniRawSummary {
  const stdout = previewText(result.stdout, maxOutputBytes);
  const stderr = previewText(result.stderr, Math.min(maxOutputBytes, 32_768));

  return {
    ok: result.ok,
    scriptId: "",
    op: "execute",
    codeBytes: 0,
    argv: result.argv,
    durationMs: result.durationMs,
    exitCode: result.exitCode,
    signal: result.signal,
    json: result.json,
    stdoutPreview: stdout.value,
    stderrPreview: stderr.value,
    truncated: {
      stdout: result.truncated.stdout || stdout.truncated,
      stderr: result.truncated.stderr || stderr.truncated,
    },
    error: result.error,
  };
}

function resolveExistingScript(store: OmniRawScriptStore, scriptId: string): string {
  const script = store.get(scriptId);
  if (script === undefined) {
    throw new Error(`Script '${scriptId}' no existe. Usa op=stage primero.`);
  }
  return script;
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function formatLongScriptError(argv: string[]) {
  return {
    ok: false,
    exitCode: null,
    signal: null,
    argv: argv.slice(0, 3).concat(["..."]),
    durationMs: 0,
    stdout: "",
    stderr: "",
    json: null,
    truncated: { stdout: false, stderr: false },
    error: {
      code: "USE_PT_OMNI_RAW_STAGING",
      message: "No envíes scripts Omni Raw largos por pt_cli. Usa pt_omni_raw begin_script/append_script/execute_script.",
    },
  };
}

function isLongOmniRaw(argv: string[]): boolean {
  if (argv[0] !== "omni" || argv[1] !== "raw") return false;
  if (argv.includes("--file") || argv.includes("--stdin")) return false;

  const directParts = argv.slice(2).filter((arg) => !arg.startsWith("-"));
  return directParts.join(" ").length > 8_000;
}

function createOmniErrorContent(code: string, message: string, details?: Record<string, unknown>) {
  return createToolContent({
    ok: false,
    error: {
      code,
      message,
      details,
    },
  });
}

function formatLivePayload(payload: unknown): string {
  try {
    const json = JSON.stringify(payload, null, 2);
    if (json.length <= 6_000) return json;
    return `${json.slice(0, 6_000)}\n... [truncado]`;
  } catch {
    return String(payload);
  }
}

function createLiveLogger(options: RegisterToolsOptions) {
  if (!options.live) return null;

  const write = options.liveWriter;
  if (!write) return null;

  return {
    request(toolName: string, input: unknown) {
      write(`[mcp] solicitud ${toolName}`);
      write(formatLivePayload(input));
    },
    response(toolName: string, output: unknown) {
      write(`[mcp] respuesta ${toolName}`);
      write(formatLivePayload(output));
    },
    error(toolName: string, error: unknown) {
      write(`[mcp] error ${toolName}`);
      write(formatLivePayload(error));
    },
  };
}

function withLiveLogging<TInput, TOutput>(
  liveLogger: ReturnType<typeof createLiveLogger>,
  toolName: string,
  input: TInput,
  handler: (input: TInput) => Promise<TOutput>,
): Promise<TOutput> {
  liveLogger?.request(toolName, input);

  return handler(input)
    .then((output) => {
      liveLogger?.response(toolName, output);
      return output;
    })
    .catch((error) => {
      liveLogger?.error(toolName, error);
      throw error;
    });
}

export function registerTools(options: RegisterToolsOptions): void {
  const liveLogger = createLiveLogger(options);

  options.server.registerTool(
    "pt_cli",
    {
      title: "PT CLI universal",
      description: [
        "Fallback genérico para ejecutar comandos de la CLI local `pt`.",
        "Usar solo cuando no exista una herramienta MCP más específica.",
        "Packet Tracer es un simulador de red; los comandos afectan el laboratorio abierto, no equipos físicos.",
        "Esta herramienta puede modificar la simulación si se ejecutan comandos de configuración, topology, link, device, lab, set u omni.",
        "No uses esta herramienta para scripts Omni Raw largos. Para `pt omni raw`, usa `pt_omni_raw`, que soporta stdin/staging/chunks y salida compacta.",
        "No intentes ejecutar `pt mcp` desde esta herramienta.",
      ].join(" "),
      inputSchema: z.object({
        argv: z.array(z.string().min(1).max(2_000)).min(1).max(64).describe(
          "Argumentos de la CLI pt, sin incluir `pt`. Para omni raw largo, no pongas el JS aquí; usa pt_omni_raw.",
        ),
        stdin: z.string().max(64_000).optional().nullable().describe(
          "Entrada stdin opcional. Preferida sobre argv para contenido largo.",
        ),
        timeoutMs: z.number().int().positive().max(600_000).optional(),
        parseJson: z.boolean().optional(),
      }),
      annotations: DANGEROUS_FALLBACK,
    },
    async (input: any) =>
      await withLiveLogging(liveLogger, "pt_cli", input, async (toolInput) => {
        if (isLongOmniRaw(toolInput.argv ?? [])) {
          return createToolContent(formatLongScriptError(toolInput.argv));
        }

        const result = await options.runPtCli({
          repoRoot: options.repoRoot,
          cliEntrypoint: options.cliEntrypoint,
          argv: toolInput.argv,
          stdin: toolInput.stdin ?? null,
          timeoutMs: toolInput.timeoutMs ?? options.defaultTimeoutMs,
          parseJson: toolInput.parseJson ?? true,
        });

        return formatResult(result);
      }),
  );

  options.server.registerTool(
    "pt_doctor",
    {
      title: "PT doctor",
      description: "Ejecuta pt doctor --json.",
      inputSchema: z.object({ timeoutMs: z.number().int().positive().max(600_000).optional() }),
      annotations: READ_ONLY_SIM,
    },
    async (input: any) =>
      await withLiveLogging(liveLogger, "pt_doctor", input, async (toolInput) => {
        const result = await options.runPtCli({
          repoRoot: options.repoRoot,
          cliEntrypoint: options.cliEntrypoint,
          argv: ["doctor", "--json"],
          timeoutMs: toolInput.timeoutMs ?? options.defaultTimeoutMs,
          parseJson: true,
        });

        return formatResult(result);
      }),
  );

  options.server.registerTool(
    "pt_runtime_status",
    {
      title: "PT runtime status",
      description: "Ejecuta pt runtime status --json.",
      inputSchema: z.object({ timeoutMs: z.number().int().positive().max(600_000).optional() }),
      annotations: READ_ONLY_SIM,
    },
    async (input: any) =>
      await withLiveLogging(liveLogger, "pt_runtime_status", input, async (toolInput) => {
        const result = await options.runPtCli({
          repoRoot: options.repoRoot,
          cliEntrypoint: options.cliEntrypoint,
          argv: ["runtime", "status", "--json"],
          timeoutMs: toolInput.timeoutMs ?? options.defaultTimeoutMs,
          parseJson: true,
        });

        return formatResult(result);
      }),
  );

  options.server.registerTool(
    "pt_device_list",
    {
      title: "PT device list",
      description: "Ejecuta pt device list --json.",
      inputSchema: z.object({ timeoutMs: z.number().int().positive().max(600_000).optional() }),
      annotations: READ_ONLY_SIM,
    },
    async (input: any) =>
      await withLiveLogging(liveLogger, "pt_device_list", input, async (toolInput) => {
        const result = await options.runPtCli({
          repoRoot: options.repoRoot,
          cliEntrypoint: options.cliEntrypoint,
          argv: ["device", "list", "--json"],
          timeoutMs: toolInput.timeoutMs ?? options.defaultTimeoutMs,
          parseJson: true,
        });

        return formatResult(result);
      }),
  );

  options.server.registerTool(
    "pt_help",
    {
      title: "PT help",
      description: "Muestra la ayuda de la CLI pt.",
      inputSchema: z.object({}),
      annotations: READ_ONLY_SIM,
    },
    async () =>
      await withLiveLogging(liveLogger, "pt_help", {}, async () => {
        const result = await options.runPtCli({
          repoRoot: options.repoRoot,
          cliEntrypoint: options.cliEntrypoint,
          argv: ["--help"],
          timeoutMs: options.defaultTimeoutMs,
          parseJson: false,
        });

        return formatResult(result);
      }),
  );

  options.server.registerTool(
    "pt_list_commands",
    {
      title: "PT list commands",
      description: "Lista los comandos públicos disponibles en la CLI pt.",
      inputSchema: z.object({}),
      annotations: READ_ONLY_SIM,
    },
    async () =>
      await withLiveLogging(liveLogger, "pt_list_commands", {}, async () => ({
        content: [{ type: "text" as const, text: JSON.stringify(options.commandCatalog, null, 2) }],
        structuredContent: { commands: options.commandCatalog },
      })),
  );

  options.server.registerTool(
    "pt_omni_raw",
    {
      title: "PT Omni raw",
      description: [
        "Ejecuta JavaScript Omni Raw dentro del runtime JavaScript de Cisco Packet Tracer.",
        "Cisco Packet Tracer es un simulador de red; los scripts operan sobre el laboratorio abierto.",
        "No pasar scripts largos por pt_cli argv. Para scripts largos usar begin_script, append_script y execute_script.",
        "No devolver salidas grandes directamente. execute_script guarda la salida y devuelve un resultId; usar read_result para leer por chunks.",
        "append_script es idempotente por scriptId+seq, útil para recuperarse de reintentos o cortes de red.",
        "clear permite borrar scripts staged, resultados o caché expirada.",
        "Preferir scripts que devuelvan JSON compacto o JSONL cuando el resultado sea grande.",
      ].join(" "),
      inputSchema: z.object({
        op: z.enum([
          "begin_script",
          "append_script",
          "script_status",
          "execute_script",
          "execute_code",
          "read_result",
          "result_status",
          "clear",
        ]),
        scriptId: z.string().regex(/^[a-zA-Z0-9_.-]{1,80}$/).optional(),
        resultId: z.string().regex(/^[a-zA-Z0-9_.-]{1,80}$/).optional(),
        description: z.string().max(2_000).optional(),
        seq: z.number().int().nonnegative().optional(),
        chunk: z.string().max(16_000).optional(),
        chunkSha256: z.string().regex(/^[a-fA-F0-9]{64}$/).optional(),
        code: z.string().max(16_000).optional(),
        parseJson: z.boolean().optional(),
        timeoutMs: z.number().int().positive().max(120_000).optional(),
        stream: z.enum(["stdout", "stderr", "json"]).optional(),
        mode: z.enum(["bytes", "lines"]).optional(),
        offset: z.number().int().nonnegative().optional(),
        limit: z.number().int().positive().max(128_000).optional(),
        lineOffset: z.number().int().nonnegative().optional(),
        lineLimit: z.number().int().positive().max(1_000).optional(),
        target: z.enum(["script", "result", "all", "expired"]).optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      outputSchema: z.object({ ok: z.boolean() }).passthrough(),
    },
    async (input: any) =>
      await withLiveLogging(liveLogger, "pt_omni_raw", input, async (toolInput) => {
        await cleanupExpiredOmniCache();

        if (toolInput.op === "begin_script") {
          const result = await beginOmniScript({
            scriptId: toolInput.scriptId,
            description: toolInput.description,
          });
          return createToolContent(result as any);
        }

        if (toolInput.op === "append_script") {
          const result = await appendOmniScriptChunk({
            scriptId: toolInput.scriptId,
            seq: toolInput.seq,
            chunk: toolInput.chunk ?? "",
            chunkSha256: toolInput.chunkSha256,
          });
          return createToolContent(result as any);
        }

        if (toolInput.op === "script_status") {
          const result = await getOmniScriptStatus(toolInput.scriptId);
          return createToolContent(result as any);
        }

        if (toolInput.op === "result_status") {
          const result = await getOmniResultStatus(toolInput.resultId);
          return createToolContent(result as any);
        }

        if (toolInput.op === "read_result") {
          const result = await readOmniResult({
            resultId: toolInput.resultId,
            stream: toolInput.stream ?? "stdout",
            mode: toolInput.mode,
            offset: toolInput.offset,
            limit: toolInput.limit,
            lineOffset: toolInput.lineOffset,
            lineLimit: toolInput.lineLimit,
          });
          return createToolContent(result as any);
        }

        if (toolInput.op === "clear") {
          const target = toolInput.target ?? "expired";
          const refId = toolInput.scriptId ?? toolInput.resultId;
          const cleared = await clearOmniCache(target, refId);
          return createToolContent({ ok: true, cleared, target, refId });
        }

        if (toolInput.op === "execute_code") {
          const code = toolInput.code ?? "";
          if (Buffer.byteLength(code, "utf8") > 8_000) {
            return createToolContent({
              ok: false,
              error: {
                code: "SCRIPT_TOO_LARGE_USE_STAGING",
                message: "Usa begin_script + append_script + execute_script.",
              },
            });
          }

          const resultId = `res_${randomUUID().replace(/-/g, "").slice(0, 6)}`;
          const resultPaths = getOmniResultPaths(resultId);
          const run = await options.runPtCli({
            repoRoot: options.repoRoot,
            cliEntrypoint: options.cliEntrypoint,
            argv: ["omni", "raw", "--stdin", "--yes", "--json"],
            stdin: code,
            timeoutMs: toolInput.timeoutMs ?? options.defaultTimeoutMs,
            parseJson: Boolean(toolInput.parseJson),
            outputMode: "spool",
            spoolDir: resultPaths.resultDir,
            previewBytes: 12_000,
          });

          await recordOmniResult({
            resultId,
            scriptId: "inline",
            stdoutPath: run.stdoutPath,
            stderrPath: run.stderrPath,
            jsonPath: run.jsonPath,
            stdout: run.stdout,
            stderr: run.stderr,
            json: run.json,
            jsonParsed: Boolean(run.jsonParsed),
          });

          return createToolContent({
            ok: run.ok,
            op: "execute_code",
            resultId,
            durationMs: run.durationMs,
            stdoutBytes: run.stdoutBytes ?? Buffer.byteLength(run.stdout, "utf8"),
            stderrBytes: run.stderrBytes ?? Buffer.byteLength(run.stderr, "utf8"),
            jsonParsed: Boolean(run.jsonParsed),
            truncated: Boolean(run.truncated.stdout || run.truncated.stderr),
            preview: run.stdout.slice(0, 3_000),
            next: run.ok
              ? { op: "read_result", resultId, stream: "stdout", offset: 0, limit: 12_000 }
              : undefined,
            error: run.error,
          });
        }

        if (toolInput.op === "execute_script") {
          const status = await getOmniScriptStatus(toolInput.scriptId);
          if (!status.ok) {
            return createToolContent(status as any);
          }

          const resultId = `res_${randomUUID().replace(/-/g, "").slice(0, 6)}`;
          const resultPaths = getOmniResultPaths(resultId);
          const run = await options.runPtCli({
            repoRoot: options.repoRoot,
            cliEntrypoint: options.cliEntrypoint,
            argv: ["omni", "raw", "--file", status.scriptPath, "--yes", "--json"],
            timeoutMs: toolInput.timeoutMs ?? options.defaultTimeoutMs,
            parseJson: Boolean(toolInput.parseJson),
            outputMode: "spool",
            spoolDir: resultPaths.resultDir,
            previewBytes: 12_000,
          });

          await recordOmniResult({
            resultId,
            scriptId: status.scriptId,
            stdoutPath: run.stdoutPath,
            stderrPath: run.stderrPath,
            jsonPath: run.jsonPath,
            stdout: run.stdout,
            stderr: run.stderr,
            json: run.json,
            jsonParsed: Boolean(run.jsonParsed),
          });

          return createToolContent({
            ok: run.ok,
            scriptId: status.scriptId,
            resultId,
            durationMs: run.durationMs,
            stdoutBytes: run.stdoutBytes ?? Buffer.byteLength(run.stdout, "utf8"),
            stderrBytes: run.stderrBytes ?? Buffer.byteLength(run.stderr, "utf8"),
            jsonParsed: Boolean(run.jsonParsed),
            truncated: Boolean(run.truncated.stdout || run.truncated.stderr),
            preview: run.stdout.slice(0, 3_000),
            next: run.ok
              ? { op: "read_result", resultId, stream: "stdout", offset: 0, limit: 12_000 }
              : undefined,
            error: run.error,
          });
        }

        return createToolContent({
          ok: false,
          error: {
            code: "OMNI_RAW_UNKNOWN_OP",
            message: `Operación no soportada: ${String(toolInput.op)}`,
          },
        });
      }),
  );
}
