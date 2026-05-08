import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { ok, errorToFail } from "./mcp-response.js";
import { globalCmdQueue } from "../queue/cmd-queue.js";

function normalizeCommands(value: string | string[]): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((line) => String(line).split(/\r?\n/))
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0)
      .filter((line) => !line.trimStart().startsWith("#"));
  }

  return String(value)
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .filter((line) => !line.trimStart().startsWith("#"));
}

export function registerCmdRunTool(ctx: RegisterToolContext): void {
  ctx.server.registerTool(
    "pt_cmd_run",
    {
      title: "Packet Tracer command runner",
      description: [
        "Ejecuta comandos IOS o Command Prompt usando pt-control directamente.",
        "Acepta múltiples comandos y múltiples dispositivos.",
        "Serializa ejecución con cola por dispositivo para evitar choques de terminal.",
        "Usar esta tool para VLAN, routing, DHCP, EtherChannel, ACL, troubleshooting y cualquier configuración IOS.",
      ].join(" "),
      inputSchema: z.object({
        jobs: z.array(z.object({
          device: z.string().min(1),
          commands: z.union([
            z.string().min(1),
            z.array(z.string().min(1)).min(1).max(500),
          ]),
          mode: z.enum(["safe", "interactive", "raw", "strict"]).default("safe"),
          allowConfirm: z.boolean().default(false),
          allowDestructive: z.boolean().default(false),
          timeoutMs: z.number().int().positive().max(600_000).optional(),
          label: z.string().max(120).optional(),
        })).min(1).max(50),
        queueScope: z.enum(["device", "global"]).default("device"),
        combineLines: z.boolean().default(true),
        continueOnError: z.boolean().default(false),
        evidenceLevel: z.enum(["summary", "full"]).default("summary"),
        includeRawOutput: z.boolean().default(true),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input: any) => {
      const results: unknown[] = [];
      let stopped = false;

      try {
        for (const [index, job] of input.jobs.entries()) {
          if (stopped) {
            results.push({
              index,
              device: job.device,
              skipped: true,
              reason: "previous_job_failed",
            });
            continue;
          }

          const lines = normalizeCommands(job.commands);
          const commandText = input.combineLines ? lines.join("\n") : lines.join("\n");

          const result = await globalCmdQueue.enqueue({
            scope: input.queueScope,
            key: input.queueScope === "global" ? "global" : job.device,
            label: job.label ?? `${job.device}: ${lines[0] ?? "command"}`,
            run: async () => {
              const executed = await ctx.control.terminalCommandService.executeCommand(
                job.device,
                commandText,
                {
                  timeoutMs: job.timeoutMs ?? ctx.defaultTimeoutMs,
                  mode: job.mode ?? "safe",
                  allowConfirm: Boolean(job.allowConfirm),
                  allowDestructive: Boolean(job.allowDestructive),
                  evidenceLevel: input.evidenceLevel ?? "summary",
                },
              );

              return {
                index,
                device: job.device,
                commandCount: lines.length,
                commands: lines,
                result: {
                  ...executed,
                  ...(input.includeRawOutput ? {} : { rawOutput: undefined }),
                },
              };
            },
          });

          results.push(result);

          const failed =
            typeof result === "object" &&
            result !== null &&
            "result" in result &&
            (result as any).result?.ok === false;

          if (failed && !input.continueOnError) {
            stopped = true;
          }
        }

        const failedCount = results.filter((entry: any) => entry?.result?.ok === false).length;

        return ok({
          action: "cmd.run",
          jobCount: input.jobs.length,
          failedCount,
          results,
          queue: globalCmdQueue.snapshot(),
        });
      } catch (error) {
        return errorToFail(error, "PT_CMD_RUN_FAILED", "Error ejecutando comandos MCP.");
      }
    },
  );
}
