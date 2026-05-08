import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { ok, errorToFail } from "./mcp-response.js";

function formatResult(result: any) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    structuredContent: result,
  };
}

export function registerCliFallbackTool(ctx: RegisterToolContext): void {
  ctx.server.registerTool(
    "pt_cli",
    {
      title: "PT CLI fallback (deprecated)",
      description: [
        "FALLBACK TEMPORAL PARA COMANDOS NO MIGRADOS AL MCP DIRECTO.",
        "No usar para device/link/cmd/status/app/project.",
        "No usar para pt mcp.",
        "No usar para omni raw salvo permiso explícito interno.",
      ].join(" "),
      inputSchema: z.object({
        argv: z.array(z.string().min(1).max(2_000)).min(1).max(64),
        stdin: z.string().max(64_000).optional().nullable(),
        timeoutMs: z.number().int().positive().max(600_000).optional(),
        parseJson: z.boolean().optional(),
      }),
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

        return formatResult(result);
      } catch (error) {
        return errorToFail(error, "PT_CLI_FALLBACK_FAILED", "Error ejecutando fallback CLI.");
      }
    },
  );
}
