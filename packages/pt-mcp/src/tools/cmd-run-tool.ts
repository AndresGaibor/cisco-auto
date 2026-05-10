import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { ok, errorToFail } from "./mcp-response.js";
import { CmdRunOutputSchema } from "./output-schemas.js";
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

const profileMap = {
  fast: { evidenceLevel: "summary" as const, includeRawOutput: false, defaultTimeoutMs: 15_000 },
  debug: { evidenceLevel: "full" as const, includeRawOutput: true, defaultTimeoutMs: 120_000 },
  audit: { evidenceLevel: "summary" as const, includeRawOutput: true, defaultTimeoutMs: 30_000 },
};

export function registerCmdRunTool(ctx: RegisterToolContext): void {
  ctx.server.registerTool(
    "pt_cmd_run",
    {
      title: "Packet Tracer IOS Command Runner",
      description: [
        "Use this tool to execute Cisco IOS CLI commands on routers and switches, or Command Prompt commands on Packet Tracer end hosts.",
        "Use it for read-only verification, VLAN/routing/DHCP/HSRP/EtherChannel troubleshooting, and IOS configuration when the user asks to modify the lab.",
        "Before calling this tool, use pt_device with op=list if you are not certain of the exact device name.",
        "Prefer profile='fast' for quick show commands, profile='audit' for validation evidence, and profile='debug' when troubleshooting terminal failures.",
        "Never set allowDestructive=true unless the user explicitly requested a destructive action such as reload, erase, delete, shutdown, or removing configuration.",
      ].join(" "),
      inputSchema: z.object({
        profile: z.enum(["fast", "debug", "audit"]).optional().describe(
          "Perfil predefinido: fast=15s+summary (show commands rápidos), debug=120s+full+raw (troubleshooting), audit=30s+summary+raw (evidencia de validación).",
        ),
        jobs: z.array(z.object({
          device: z.string().min(1).describe("Nombre exacto del dispositivo Packet Tracer, ej: 'MLS-CORE-1', 'Switch0', 'PC1'. Usar pt_device op=list primero si hay duda."),
          commands: z.union([
            z.string().min(1),
            z.array(z.string().min(1)).min(1).max(500),
          ]).describe("Uno o más comandos IOS/host. String multilínea o array de strings. No incluir comandos destructivos sin allowDestructive=true."),
          mode: z.enum(["safe", "interactive", "raw", "strict"]).default("safe").describe(
            "safe aplica heurísticas IOS y bloquea operaciones riesgosas; interactive permite prompts conocidos; raw envía comandos con mínima transformación; strict falla en ambigüedad.",
          ),
          allowConfirm: z.boolean().default(false).describe("Permitir respuestas automáticas a prompts de confirmación como [confirm]. Mantener false a menos que el usuario lo apruebe."),
          allowDestructive: z.boolean().default(false).describe("Permitir comandos destructivos como reload, erase, delete, shutdown. Debe ser false por defecto."),
          timeoutMs: z.number().int().positive().max(600_000).optional().describe("Timeout por job en milisegundos. Si se omite, usa el default del perfil seleccionado."),
          label: z.string().max(120).optional().describe("Etiqueta legible para salida de cola/debug."),
        })).min(1).max(50).describe("Array de jobs a ejecutar. Cada job tiene un device y comandos. Mínimo 1, máximo 50 jobs."),
        queueScope: z.enum(["device", "global"]).default("device").describe("device serializa por dispositivo; global serializa todos los jobs en una sola cola."),
        combineLines: z.boolean().default(true).describe("Combinar múltiples líneas de comandos separadas por salto de línea."),
        continueOnError: z.boolean().default(false).describe("Continuar ejecutando jobs subsiguientes si uno falla."),
        evidenceLevel: z.enum(["summary", "full"]).default("summary").describe("summary=resultados resumidos, full=incluye salida completa de terminal."),
        includeRawOutput: z.boolean().default(true).describe("Incluir rawOutput de la terminal en los resultados."),
      }),
      outputSchema: CmdRunOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input: any) => {
      const profileDefaults = input.profile
        ? profileMap[input.profile as keyof typeof profileMap]
        : null;

      const effectiveEvidence = profileDefaults?.evidenceLevel ?? input.evidenceLevel ?? "summary";
      const effectiveRaw = profileDefaults?.includeRawOutput ?? input.includeRawOutput ?? true;

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

          const { id: jobId, promise } = globalCmdQueue.enqueue({
            scope: input.queueScope,
            key: input.queueScope === "global" ? "global" : job.device,
            label: job.label ?? `${job.device}: ${lines[0] ?? "command"}`,
            run: async () => {
              const executed = await ctx.control.terminalCommandService.executeCommand(
                job.device,
                commandText,
                {
                  timeoutMs: job.timeoutMs ?? profileDefaults?.defaultTimeoutMs ?? ctx.defaultTimeoutMs,
                  mode: job.mode ?? "safe",
                  allowConfirm: Boolean(job.allowConfirm),
                  allowDestructive: Boolean(job.allowDestructive),
                  evidenceLevel: effectiveEvidence,
                },
              );

              return {
                index,
                device: job.device,
                commandCount: lines.length,
                commands: lines,
                result: {
                  ...executed,
                  ...(effectiveRaw ? {} : { rawOutput: undefined }),
                },
              };
            },
          });

          const result = await promise;

          if (typeof result === "object" && result !== null && (result as any).result?.ok === false) {
            globalCmdQueue.setJobResultStatus(jobId, "done_with_errors");
          }

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
