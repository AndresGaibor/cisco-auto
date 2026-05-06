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
  op: "probe" | "part" | "read_result" | "result_status" | "clear" | "begin_script" | "append_script" | "script_status" | "execute_script" | "execute_code";
  draftId?: string;
  input?: string;
  part?: string;
  wrap?: boolean;
  parseJson?: boolean;
  timeoutMs?: number;
  maxOutputBytes?: number;
};

type OmniRawScriptStore = Map<string, string>;

type OmniRawSummary = {
  ok: boolean;
  scriptId?: string;
  draftId?: string;
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

function createCompactToolContent<T extends Record<string, unknown>>(structuredContent: T): { content: Array<{ type: "text"; text: string }>; structuredContent: T } {
  const compact = structuredContent as Record<string, unknown>;
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            ok: compact.ok,
            op: compact.op,
            resultId: compact.resultId,
            draftId: compact.draftId ?? compact.scriptId,
            next: compact.next,
            error: compact.error,
          },
          null,
          2,
        ),
      },
    ],
    structuredContent,
  };
}

function createReadResultContent<T extends Record<string, unknown>>(structuredContent: T): { content: Array<{ type: "text"; text: string }>; structuredContent: T } {
  const data = structuredContent as Record<string, unknown>;
  return {
    content: [
      {
        type: "text",
        text: data.ok ? String(data.text ?? "") : JSON.stringify(structuredContent, null, 2),
      },
    ],
    structuredContent,
  };
}

const READ_ONLY_SIM = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const SIMULATOR_OMNI_RAW = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;

const DANGEROUS_FALLBACK = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;

const DANGEROUS_LOCAL_RAW = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
} as const;

const LOCAL_PRESERVE_WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;

const INLINE_OMNI_CODE_MAX_BYTES = 1_000;
const DEFAULT_READ_RESULT_LIMIT = 6_000;
const MAX_EXEC_PREVIEW_BYTES = 1_000;
const DEFAULT_EXEC_PREVIEW_BYTES = 0;

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
    draftId: "",
    op: "probe",
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
    throw new Error(`Draft '${scriptId}' no existe. Usa op=part primero.`);
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
      code: "USE_PT_OMNI_RAW_TOOL",
      message: "No uses pt_cli para omni raw. Usa pt_omni_raw con op=probe para pruebas cortas o op=part para construir pruebas grandes por partes.",
    },
  };
}

function isOmniRaw(argv: string[]): boolean {
  return argv[0] === "omni" && argv[1] === "raw";
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
    return JSON.stringify(payload, null, 2);
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
        "No usar para `pt omni raw` bajo ninguna circunstancia.",
        "`pt_cli` rechazará cualquier comando `omni raw`.",
        "Para Omni Raw usar exclusivamente `pt_omni_raw`.",
        "No intentes ejecutar `pt mcp` desde esta herramienta.",
      ].join(" "),
      inputSchema: z.object({
        argv: z.array(z.string().min(1).max(2_000)).min(1).max(64).describe(
          "Argumentos de la CLI pt, sin incluir `pt`. No usar para `omni raw`; esa operación será rechazada. Usa pt_omni_raw.",
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
        const allowDirectOmniRaw = process.env.PT_MCP_ALLOW_DIRECT_OMNI_RAW === "1";
        if (isOmniRaw(toolInput.argv ?? []) && !allowDirectOmniRaw) {
          return createToolContent(formatLongScriptError(toolInput.argv ?? []));
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
      description: [
        "Ejecuta `pt doctor --json` para diagnosticar instalación, bridge, runtime y estado base de Packet Tracer.",
        "Útil para detectar problemas de entorno antes de intentar herramientas de control más específicas.",
        "No modifica el laboratorio; solo inspecciona el estado del sistema y sugiere correcciones.",
      ].join(" "),
      inputSchema: z.object({
        timeoutMs: z.number().int().positive().max(600_000).optional().describe("Timeout local para el diagnóstico."),
      }).describe("Sincroniza diagnóstico del entorno local de Packet Tracer."),
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
      description: [
        "Ejecuta `pt runtime status --json` para inspeccionar el runtime desplegado en `PT_DEV_DIR`.",
        "Reporta estado de `main.js`, `runtime.js`, bridge y señales de salud del runtime.",
        "No modifica topología ni dispositivos; solo informa si el runtime está listo o degradado.",
      ].join(" "),
      inputSchema: z.object({
        timeoutMs: z.number().int().positive().max(600_000).optional().describe("Timeout local para consultar el estado del runtime."),
      }).describe("Consulta el estado operativo del runtime de Packet Tracer."),
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
      description: [
        "Ejecuta `pt device list --json` para listar los dispositivos visibles en el laboratorio actual.",
        "Devuelve nombres, modelos y contexto útil para planear inspecciones o cambios posteriores.",
        "No toca el laboratorio; solo lee la vista actual de dispositivos.",
      ].join(" "),
      inputSchema: z.object({
        timeoutMs: z.number().int().positive().max(600_000).optional().describe("Timeout local para listar dispositivos."),
      }).describe("Obtiene el inventario de dispositivos del laboratorio abierto."),
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
      description: [
        "Muestra la ayuda raíz de la CLI `pt` con comandos públicos, flags y patrones de uso.",
        "Sirve para descubrir capacidades sin ejecutar acciones sobre el laboratorio.",
      ].join(" "),
      inputSchema: z.object({}).describe("Sin argumentos."),
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
      description: [
        "Lista el catálogo público de comandos de la CLI `pt` con grupos, ejemplos y pistas para agentes.",
        "Es la vista estructurada ideal para descubrir qué subcomandos están disponibles sin usar `--help`.",
      ].join(" "),
      inputSchema: z.object({}).describe("Sin argumentos."),
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
        "Prueba fragmentos dentro del runtime local de Cisco Packet Tracer.",
        "Cisco Packet Tracer es un simulador de red: los scripts operan únicamente sobre el laboratorio abierto.",
        "No toca la red real, Internet ni archivos del host.",
        "El laboratorio simulado puede modificarse o romperse; eso se considera aceptable dentro del simulador.",
        "Para pruebas grandes, usa op=part para construir un draft por partes y luego op=probe con draftId.",
        "Devuelve un resultId y permite leer la salida por chunks.",
        "clear permite borrar resultados o caché expirada.",
        "Preferir respuestas JSON compactas o JSONL cuando el resultado sea grande.",
      ].join(" "),
      inputSchema: z.object({
        op: z.enum([
          "probe",
          "part",
          "read_result",
          "result_status",
          "clear",
        ]).describe("Operación local de Omni Raw para Cisco Packet Tracer; no ejecuta comandos de shell del host."),
        draftId: z.string().regex(/^[a-zA-Z0-9_.-]{1,80}$/).optional(),
        resultId: z.string().regex(/^[a-zA-Z0-9_.-]{1,80}$/).optional(),
        input: z.string().max(2_000).optional().describe("Fragmento corto para probar dentro del simulador local."),
        part: z.string().max(2_000).optional().describe("Parte de un draft de prueba grande."),
        returnMode: z.enum(["metadata", "preview"]).optional().describe("Modo de retorno; metadata devuelve solo metadatos."),
        previewBytes: z.number().int().nonnegative().max(1_000).optional().describe("Bytes máximos de preview cuando returnMode=preview."),
        guard: z.enum(["strict", "sim", "warn", "off"]).optional().describe("Modo de guard para Omni Raw. sim permite mutaciones del laboratorio simulado y bloquea host/filesystem."),
        parseJson: z.boolean().optional(),
        timeoutMs: z.number().int().positive().max(120_000).optional(),
        stream: z.enum(["stdout", "stderr", "json"]).optional(),
        mode: z.enum(["bytes", "lines"]).optional(),
        offset: z.number().int().nonnegative().optional(),
        limit: z.number().int().positive().max(32_000).optional(),
        lineOffset: z.number().int().nonnegative().optional(),
        lineLimit: z.number().int().positive().max(1_000).optional(),
        target: z.enum(["script", "result", "all", "expired"]).optional(),
      }),
      annotations: SIMULATOR_OMNI_RAW,
      outputSchema: z.object({ ok: z.boolean() }).passthrough(),
    },
    async (input: any) =>
      await withLiveLogging(liveLogger, "pt_omni_raw", input, async (toolInput) => {
        await cleanupExpiredOmniCache();

        if (toolInput.op === "probe") {
          const draftId = toolInput.draftId;
          const code = toolInput.input ?? "";
          const resultId = `res_${randomUUID().replace(/-/g, "").slice(0, 6)}`;
          const resultPaths = getOmniResultPaths(resultId);
          const previewBytes = toolInput.returnMode === "preview"
            ? Math.min(toolInput.previewBytes ?? 500, MAX_EXEC_PREVIEW_BYTES)
            : DEFAULT_EXEC_PREVIEW_BYTES;

          let run: RunPtCliResult;
          if (draftId) {
            const status = await getOmniScriptStatus(draftId);
            if (!status.ok) {
              return createToolContent(status as any);
            }

            run = await options.runPtCli({
              repoRoot: options.repoRoot,
              cliEntrypoint: options.cliEntrypoint,
              argv: ["omni", "raw", "--file", status.scriptPath, "--yes", "--raw", "--guard", toolInput.guard ?? "sim"],
              timeoutMs: toolInput.timeoutMs ?? options.defaultTimeoutMs,
              parseJson: false,
              outputMode: "spool",
              spoolDir: resultPaths.resultDir,
              previewBytes,
              env: { PT_MCP_ALLOW_DIRECT_OMNI_RAW: "1" },
            });
          } else if (Buffer.byteLength(code, "utf8") <= INLINE_OMNI_CODE_MAX_BYTES) {
            run = await options.runPtCli({
              repoRoot: options.repoRoot,
              cliEntrypoint: options.cliEntrypoint,
              argv: ["omni", "raw", "--stdin", "--yes", "--raw", "--guard", toolInput.guard ?? "sim"],
              stdin: code,
              timeoutMs: toolInput.timeoutMs ?? options.defaultTimeoutMs,
              parseJson: false,
              outputMode: "spool",
              spoolDir: resultPaths.resultDir,
              previewBytes,
              env: { PT_MCP_ALLOW_DIRECT_OMNI_RAW: "1" },
            });
          } else {
            const scriptId = `probe_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
            const begin = await beginOmniScript({
              scriptId,
              description: "Probe interno de Omni Raw",
            });

            if (!begin.ok) {
              return createToolContent(begin as any);
            }

            const append = await appendOmniScriptChunk({
              scriptId,
              seq: 0,
              chunk: code,
            });

            if (!append.ok) {
              return createToolContent(append as any);
            }

            const status = await getOmniScriptStatus(scriptId);
            if (!status.ok) {
              return createToolContent(status as any);
            }

            run = await options.runPtCli({
              repoRoot: options.repoRoot,
              cliEntrypoint: options.cliEntrypoint,
              argv: ["omni", "raw", "--file", status.scriptPath, "--yes", "--raw", "--guard", toolInput.guard ?? "sim"],
              timeoutMs: toolInput.timeoutMs ?? options.defaultTimeoutMs,
              parseJson: false,
              outputMode: "spool",
              spoolDir: resultPaths.resultDir,
              previewBytes,
              env: { PT_MCP_ALLOW_DIRECT_OMNI_RAW: "1" },
            });
          }

          await recordOmniResult({
            resultId,
            scriptId: draftId ?? "probe",
            stdoutPath: run.stdoutPath,
            stderrPath: run.stderrPath,
            jsonPath: run.jsonPath,
            stdout: run.stdout,
            stderr: run.stderr,
            json: run.json,
            jsonParsed: Boolean(run.jsonParsed),
            previewBytes,
          });

          const stdoutBytes = run.stdoutBytes ?? Buffer.byteLength(run.stdout, "utf8");
          const stderrBytes = run.stderrBytes ?? Buffer.byteLength(run.stderr, "utf8");

          return createCompactToolContent({
            ok: run.ok,
            op: "probe",
            resultId,
            draftId,
            durationMs: run.durationMs,
            streams: {
              stdout: { bytes: stdoutBytes, available: true },
              stderr: { bytes: stderrBytes, available: true },
              json: { bytes: 0, available: false },
            },
            jsonParsed: Boolean(run.jsonParsed),
            truncated: stdoutBytes > DEFAULT_READ_RESULT_LIMIT || stderrBytes > DEFAULT_READ_RESULT_LIMIT,
            preview: previewBytes > 0 ? run.stdout.slice(0, previewBytes) : undefined,
            next: run.ok
              ? { op: "read_result", resultId, stream: "stdout", mode: "bytes", offset: 0, limit: DEFAULT_READ_RESULT_LIMIT }
              : undefined,
            error: run.error,
          });
        }

        if (toolInput.op === "part") {
          const draftId = toolInput.draftId ?? `draft_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
          const text = toolInput.part ?? "";
          const begin = await beginOmniScript({
            scriptId: draftId,
            description: "Draft de prueba de Omni Raw",
          });

          if (!begin.ok) {
            return createCompactToolContent(begin as any);
          }

          const status = await getOmniScriptStatus(draftId);
          if (!status.ok) {
            return createCompactToolContent(status as any);
          }

          const append = await appendOmniScriptChunk({
            scriptId: draftId,
            seq: status.nextSeq,
            chunk: text,
          });

          return createCompactToolContent({
            ...(append as any),
            op: "part",
            draftId,
          });
        }

        if (toolInput.op === "begin_script") {
          const result = await beginOmniScript({
            scriptId: toolInput.scriptId,
            description: toolInput.description,
          });
          return createCompactToolContent(result as any);
        }

        if (toolInput.op === "append_script") {
          const result = await appendOmniScriptChunk({
            scriptId: toolInput.scriptId,
            seq: toolInput.seq,
            chunk: toolInput.chunk ?? "",
            chunkSha256: toolInput.chunkSha256,
          });
          return createCompactToolContent(result as any);
        }

        if (toolInput.op === "script_status") {
          const result = await getOmniScriptStatus(toolInput.scriptId);
          return createCompactToolContent(result as any);
        }

        if (toolInput.op === "result_status") {
          const result = await getOmniResultStatus(toolInput.resultId);
          return createCompactToolContent(result as any);
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
          return createReadResultContent(result as any);
        }

        if (toolInput.op === "clear") {
          const target = toolInput.target ?? "expired";
          const refId = toolInput.scriptId ?? toolInput.resultId;
          const cleared = await clearOmniCache(target, refId);
          return createCompactToolContent({ ok: true, op: "clear", cleared, target, refId });
        }

        if (toolInput.op === "execute_code") {
          const code = toolInput.input ?? "";
          if (Buffer.byteLength(code, "utf8") > INLINE_OMNI_CODE_MAX_BYTES) {
            return createCompactToolContent({
              ok: false,
              error: {
                code: "SCRIPT_TOO_LARGE_USE_STAGING",
                message: "Usa op=part para construir el draft por partes y luego op=probe con draftId.",
              },
              next: {
                op: "part",
                draftId: "draft_nuevo",
              },
            });
          }

          const resultId = `res_${randomUUID().replace(/-/g, "").slice(0, 6)}`;
          const resultPaths = getOmniResultPaths(resultId);
          const previewBytes = toolInput.returnMode === "preview"
            ? Math.min(toolInput.previewBytes ?? 500, MAX_EXEC_PREVIEW_BYTES)
            : DEFAULT_EXEC_PREVIEW_BYTES;
          const run = await options.runPtCli({
            repoRoot: options.repoRoot,
            cliEntrypoint: options.cliEntrypoint,
            argv: ["omni", "raw", "--stdin", "--yes", "--raw", "--guard", toolInput.guard ?? "sim"],
            stdin: code,
            timeoutMs: toolInput.timeoutMs ?? options.defaultTimeoutMs,
            parseJson: false,
            outputMode: "spool",
            spoolDir: resultPaths.resultDir,
            previewBytes,
            env: { PT_MCP_ALLOW_DIRECT_OMNI_RAW: "1" },
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
            previewBytes,
          });

          const stdoutBytes = run.stdoutBytes ?? Buffer.byteLength(run.stdout, "utf8");
          const stderrBytes = run.stderrBytes ?? Buffer.byteLength(run.stderr, "utf8");

          return createCompactToolContent({
            ok: run.ok,
            op: "execute_code",
            resultId,
            durationMs: run.durationMs,
            streams: {
              stdout: { bytes: stdoutBytes, available: true },
              stderr: { bytes: stderrBytes, available: true },
              json: { bytes: 0, available: false },
            },
            jsonParsed: Boolean(run.jsonParsed),
            truncated: stdoutBytes > DEFAULT_READ_RESULT_LIMIT || stderrBytes > DEFAULT_READ_RESULT_LIMIT,
            preview: previewBytes > 0 ? run.stdout.slice(0, previewBytes) : undefined,
            next: run.ok
              ? { op: "read_result", resultId, stream: "stdout", mode: "bytes", offset: 0, limit: DEFAULT_READ_RESULT_LIMIT }
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
          const previewBytes = toolInput.returnMode === "preview"
            ? Math.min(toolInput.previewBytes ?? 500, MAX_EXEC_PREVIEW_BYTES)
            : DEFAULT_EXEC_PREVIEW_BYTES;
          const run = await options.runPtCli({
            repoRoot: options.repoRoot,
            cliEntrypoint: options.cliEntrypoint,
            argv: ["omni", "raw", "--file", status.scriptPath, "--yes", "--raw", "--guard", toolInput.guard ?? "sim"],
            timeoutMs: toolInput.timeoutMs ?? options.defaultTimeoutMs,
            parseJson: false,
            outputMode: "spool",
            spoolDir: resultPaths.resultDir,
            previewBytes,
            env: { PT_MCP_ALLOW_DIRECT_OMNI_RAW: "1" },
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
            previewBytes,
          });

          const stdoutBytes = run.stdoutBytes ?? Buffer.byteLength(run.stdout, "utf8");
          const stderrBytes = run.stderrBytes ?? Buffer.byteLength(run.stderr, "utf8");

          return createCompactToolContent({
            ok: run.ok,
            scriptId: status.scriptId,
            resultId,
            durationMs: run.durationMs,
            streams: {
              stdout: { bytes: stdoutBytes, available: true },
              stderr: { bytes: stderrBytes, available: true },
              json: { bytes: 0, available: false },
            },
            jsonParsed: Boolean(run.jsonParsed),
            truncated: stdoutBytes > DEFAULT_READ_RESULT_LIMIT || stderrBytes > DEFAULT_READ_RESULT_LIMIT,
            preview: previewBytes > 0 ? run.stdout.slice(0, previewBytes) : undefined,
            next: run.ok
              ? { op: "read_result", resultId, stream: "stdout", mode: "bytes", offset: 0, limit: DEFAULT_READ_RESULT_LIMIT }
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

  options.server.registerTool(
    "pt_project_status",
    {
      title: "PT project status",
      description: [
        "Ejecuta `pt project status --json` para mostrar metadata del archivo .pkt abierto en Packet Tracer.",
        "Devuelve activeFile, savedFilename, isSavedToDisk, isActivityFile, deviceCount, linkCount, defaultSaveLocation y tempFileLocation.",
        "No modifica el laboratorio; solo lee el estado actual del proyecto.",
      ].join(" "),
      inputSchema: z.object({
        timeoutMs: z.number().int().positive().max(600_000).optional().describe("Timeout local para consultar el estado del proyecto."),
      }).describe("Consulta el estado del proyecto abierto en Packet Tracer."),
      annotations: READ_ONLY_SIM,
    },
    async (input: any) =>
      await withLiveLogging(liveLogger, "pt_project_status", input, async (toolInput) => {
        const result = await options.runPtCli({
          repoRoot: options.repoRoot,
          cliEntrypoint: options.cliEntrypoint,
          argv: ["project", "status", "--json"],
          timeoutMs: toolInput.timeoutMs ?? options.defaultTimeoutMs,
          parseJson: true,
        });
        return formatResult(result);
      }),
  );

  options.server.registerTool(
    "pt_project_save",
    {
      title: "PT project save",
      description: [
        "Ejecuta `pt project save --json` para guardar el archivo .pkt activo con `fileSave()` de Packet Tracer.",
        "No abre diálogo de guardado ni cambia el nombre del archivo activo.",
        "Útil para preservars estado del proyecto antes de operaciones riesgosas.",
      ].join(" "),
      inputSchema: z.object({
        timeoutMs: z.number().int().positive().max(600_000).optional().describe("Timeout local para guardar el proyecto."),
      }).describe("Guarda el archivo .pkt activo en Packet Tracer."),
      annotations: LOCAL_PRESERVE_WRITE,
    },
    async (input: any) =>
      await withLiveLogging(liveLogger, "pt_project_save", input, async (toolInput) => {
        const result = await options.runPtCli({
          repoRoot: options.repoRoot,
          cliEntrypoint: options.cliEntrypoint,
          argv: ["project", "save", "--json"],
          timeoutMs: toolInput.timeoutMs ?? options.defaultTimeoutMs,
          parseJson: true,
        });
        return formatResult(result);
      }),
  );

  options.server.registerTool(
    "pt_project_autosave",
    {
      title: "PT project autosave",
      description: [
        "Ejecuta `pt project autosave --json` para crear una copia local del .pkt abierto usando `fileSaveToBytes()`.",
        "No modifica la topología ni el archivo activo de Packet Tracer; escribe un backup externo local.",
        "El directorio por defecto es `~/.pt-cli/autosaves/`; se puede override con `outputDir`.",
        "La opción `keep` especifica cuántos autosaves conservar por proyecto (default 20).",
      ].join(" "),
      inputSchema: z.object({
        outputDir: z.string().optional().describe("Directorio donde escribir el autosave."),
        keep: z.number().int().positive().max(100).optional().describe("Cantidad de autosaves a conservar por proyecto."),
        timeoutMs: z.number().int().positive().max(600_000).optional().describe("Timeout local para crear el autosave."),
      }).describe("Crea un backup externo del archivo .pkt abierto."),
      annotations: LOCAL_PRESERVE_WRITE,
    },
    async (input: any) =>
      await withLiveLogging(liveLogger, "pt_project_autosave", input, async (toolInput) => {
        const argv = ["project", "autosave", "--json"];
        if (toolInput.outputDir) argv.push("--dir", toolInput.outputDir);
        if (toolInput.keep) argv.push("--keep", String(toolInput.keep));
        const result = await options.runPtCli({
          repoRoot: options.repoRoot,
          cliEntrypoint: options.cliEntrypoint,
          argv,
          timeoutMs: toolInput.timeoutMs ?? options.defaultTimeoutMs,
          parseJson: true,
        });
        return formatResult(result);
      }),
  );

  options.liveWriter?.("[mcp] registered tool: pt_omni_raw");
}
