import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { errorToFail, instructivo } from "./mcp-response.js";
import { GenericToolOutputSchema } from "./output-schemas.js";

export function registerCliFallbackTool(ctx: RegisterToolContext): void {
  ctx.server.registerTool(
    "pt_cli",
    {
      title: "PT CLI Fallback — Legacy CLI (Deprecated)",
      description: [
        "Temporary fallback for legacy pt CLI commands not yet migrated to direct MCP tools.",
        "Do not use this for status, app, project, device, link, command execution, or omni operations when a dedicated MCP tool exists.",
        "Prefer direct tools because they provide typed inputSchema, outputSchema, queueing, and structuredContent.",
      ].join(" "),
      inputSchema: z.object({
        argv: z.array(z.string().min(1).max(2_000)).min(1).max(64).describe(
          "Argumentos de línea de comandos para el CLI legacy, ej: ['doctor', '--json']. Mínimo 1, máximo 64 argumentos.",
        ),
        stdin: z.string().max(64_000).optional().nullable().describe("Entrada estándar opcional para comandos que la requieran."),
        timeoutMs: z.number().int().positive().max(600_000).optional().describe("Timeout en milisegundos para la ejecución del comando."),
        parseJson: z.boolean().optional().describe("Si es true, parsea la salida como JSON automáticamente."),
      }),
      outputSchema: GenericToolOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input: any) => {
      try {
        const result = await ctx.runPtCli({
          repoRoot: ctx.repoRoot,
          cliEntrypoint: ctx.cliEntrypoint,
          argv: input.argv,
          stdin: input.stdin ?? null,
          timeoutMs: input.timeoutMs ?? ctx.defaultTimeoutMs,
          parseJson: input.parseJson ?? true,
        });

        return instructivo("pt_cli", { ...result, action: "legacy.cli" });
      } catch (error) {
        return errorToFail(error, "PT_CLI_FALLBACK_FAILED", "Error ejecutando fallback CLI.");
      }
    },
  );
}
