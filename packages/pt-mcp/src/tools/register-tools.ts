import * as z from "zod/v4";

import type { PtMcpCommandCatalogEntry, RunPtCliInput, RunPtCliResult } from "../types.js";

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
      description: "Ejecuta cualquier comando de la CLI pt con argv seguro.",
      inputSchema: z.object({
        argv: z.array(z.string().min(1)).min(1),
        stdin: z.string().optional().nullable(),
        timeoutMs: z.number().int().positive().max(600_000).optional(),
        parseJson: z.boolean().optional(),
      }),
    },
    async (input: any) =>
      await withLiveLogging(liveLogger, "pt_cli", input, async (toolInput) => {
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
    },
    async () =>
      await withLiveLogging(liveLogger, "pt_list_commands", {}, async () => ({
        content: [{ type: "text" as const, text: JSON.stringify(options.commandCatalog, null, 2) }],
        structuredContent: { commands: options.commandCatalog },
      })),
  );
}
