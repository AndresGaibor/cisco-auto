import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { ok, errorToFail, instructivo } from "./mcp-response.js";
import { CmdRunOutputSchema } from "./output-schemas.js";
import { globalCmdQueue } from "../queue/cmd-queue.js";
import {
  DEFAULT_CMD_SLOW_THRESHOLD_MS,
  enrichCmdRunJobResultWithPerformance,
} from "./cmd-performance.js";
import { buildAdaptiveCommandChunks, classifyIosShowCommand } from "./cmd-batch-strategy.js";
import {
  normalizeCommands,
  isRecord,
  getBestOutput,
  getExecutionOk,
  getExecutionStatus,
  buildSequentialSubResult,
  buildBatchResult,
  buildBatchEvidence,
} from "./cmd-run-helpers.js";
import type { SequentialSubCommandResult } from "./cmd-run-helpers.js";
import {
  evaluateAdaptiveBatchIntegrity,
  findMissingSubResultIndexes,
  findRecoverableFailedSubResultIndexes,
  mergeRecoveredSubResults,
  withTimeout,
  buildRecoveryTimeoutWarning,
  buildAdaptiveBatchIncompleteWarning,
} from "./cmd-run-adaptive.js";

const DEFAULT_TERMINAL_CONCURRENCY = 1;
const MAX_TERMINAL_CONCURRENCY = 4;

function clampTerminalConcurrency(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_TERMINAL_CONCURRENCY;
  }

  return Math.max(1, Math.min(MAX_TERMINAL_CONCURRENCY, Math.trunc(parsed)));
}

async function runWithConcurrencyLimit<T>(
  items: Array<() => Promise<T>>,
  concurrency: number,
): Promise<Array<PromiseSettledResult<T>>> {
  const results: Array<PromiseSettledResult<T>> = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      try {
        const task = items[index]!;
        results[index] = { status: "fulfilled", value: await task() };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));

  return results;
}

const profileMap = {
  fast: { evidenceLevel: "summary" as const, includeRawOutput: false, defaultTimeoutMs: 15_000, slowThresholdMs: 8_000 },
  debug: { evidenceLevel: "full" as const, includeRawOutput: true, defaultTimeoutMs: 120_000, slowThresholdMs: 30_000 },
  audit: { evidenceLevel: "summary" as const, includeRawOutput: true, defaultTimeoutMs: 30_000, slowThresholdMs: 12_000 },
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
        terminalConcurrency: z
          .number()
          .int()
          .positive()
          .max(4)
          .optional()
          .describe("Límite experimental de jobs terminal simultáneos. Default seguro: 1."),
        batchStrategy: z.enum(["auto", "optimized", "sequential"]).default("optimized").describe("Estrategia de batches IOS: optimized preserva el comportamiento actual; sequential fuerza un comando a la vez; auto usa chunks adaptativos en lotes grandes."),
        experimentalAdaptiveChunks: z.boolean().default(false).describe("[Hotfix 2026-05] Flag experimental para habilitar adaptive chunks. Deshabilitado por default porque el recovery no es cancelable."),
        combineLines: z.boolean().default(true).describe("Combinar múltiples líneas de comandos separadas por salto de línea."),
        continueOnError: z.boolean().default(false).describe("Continuar ejecutando jobs subsiguientes si uno falla."),
        evidenceLevel: z
          .enum(["summary", "full"])
          .optional()
          .describe("Override opcional del nivel de evidencia. Si se omite, usa el default del profile; sin profile usa 'summary'."),
        includeRawOutput: z
          .boolean()
          .optional()
          .describe("Override opcional para incluir rawOutput. Si se omite, usa el default del profile; sin profile usa true."),
        slowThresholdMs: z.number().int().positive().max(600_000).optional().describe("Umbral en milisegundos para marcar un comando exitoso como lento con warning CMD_SLOW_SUCCESS. Si se omite, usa el default del perfil."),
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

      const effectiveEvidence = input.evidenceLevel ?? profileDefaults?.evidenceLevel ?? "summary";
      const effectiveRaw = input.includeRawOutput ?? profileDefaults?.includeRawOutput ?? true;
      const effectiveSlowThresholdMs = input.slowThresholdMs ?? profileDefaults?.slowThresholdMs ?? DEFAULT_CMD_SLOW_THRESHOLD_MS;
      const terminalConcurrency = clampTerminalConcurrency(input.terminalConcurrency);
      const batchStrategy = input.batchStrategy ?? "optimized";
      const adaptiveChunksEnabled = batchStrategy === "auto" && input.experimentalAdaptiveChunks === true;

      const results: unknown[] = [];
      let stopped = false;
      const canUseConcurrentScheduler =
        input.queueScope === "device" &&
        input.continueOnError === true &&
        input.jobs.length > 1 &&
        terminalConcurrency > 1;
      const queuedJobs: Array<{ index: number; job: any; jobId: string; promise: Promise<unknown> }> = [];
      const topLevelWarnings: Array<{ code: string; severity: "info" | "warning" | "error"; message: string; actionable?: boolean }> = [];

      if (terminalConcurrency > 1) {
        topLevelWarnings.push({
          code: "PT_TERMINAL_CONCURRENCY_EXPERIMENTAL",
          severity: "warning",
          message: "terminalConcurrency > 1 is experimental. Packet Tracer may timeout terminal plans when multiple IOS sessions run at the same time.",
          actionable: true,
        });
      }

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
          const mode = job.mode ?? "safe";
          const shouldRunSequential = lines.length > 1 && mode !== "raw";
          const commandText = lines.join("\n");

          const { id: jobId, promise } = globalCmdQueue.enqueue({
            scope: input.queueScope,
            key: input.queueScope === "global" ? "global" : job.device,
            label: job.label ?? `${job.device}: ${lines[0] ?? "command"}`,
            run: async () => {
              const commandOptions = {
                timeoutMs: job.timeoutMs ?? profileDefaults?.defaultTimeoutMs ?? ctx.defaultTimeoutMs,
                mode,
                allowConfirm: Boolean(job.allowConfirm),
                allowDestructive: Boolean(job.allowDestructive),
                evidenceLevel: effectiveEvidence,
              };

              if (!shouldRunSequential) {
                const executed = await ctx.control.terminalCommandService.executeCommand(
                  job.device,
                  commandText,
                  commandOptions,
                );

                return enrichCmdRunJobResultWithPerformance(
                  {
                    index,
                    device: job.device,
                    commandCount: lines.length,
                    commands: lines,
                    result: {
                      ...executed,
                      ...(effectiveRaw ? {} : { rawOutput: undefined }),
                    },
                  },
                  effectiveSlowThresholdMs,
                );
              }

              const canTryOptimizedBatch =
                input.continueOnError === true &&
                Boolean(ctx.control.terminalCommandService.executeCommandBatchOptimized);
              let optimizedRuntimeBatchAttempted = false;
              let optimizedRuntimeBatchAvailable = false;
              let optimizedRuntimeBatchFallbackReason: string | undefined;
              let optimizedRuntimeBatchDiagnostics: unknown;

              if (lines.length > 1 && mode !== "raw") {
                optimizedRuntimeBatchAttempted = true;
                optimizedRuntimeBatchAvailable = Boolean(ctx.control.terminalCommandService.executeCommandBatchOptimized);
                if (!optimizedRuntimeBatchAvailable) {
                  optimizedRuntimeBatchFallbackReason = "method_missing";
                }
              }

              if (adaptiveChunksEnabled && lines.length > 5 && mode !== "raw") {
                const weights = lines.map((command) => classifyIosShowCommand(command));
                if (weights.every((weight) => weight === "short")) {
                } else {
                const chunks = buildAdaptiveCommandChunks(lines);
                const chunkSubResults: SequentialSubCommandResult[] = [];
                const adaptiveBatchChunks: Array<{
                  index: number;
                  commandCount: number;
                  commands: string[];
                  executionStrategy?: string;
                  ok?: boolean;
                  durationMs?: number;
                }> = [];
                let globalOffset = 0;
                const expectedSubResultCount = lines.length;

                for (const [chunkIndex, chunk] of chunks.entries()) {
                  const chunkStartedAt = Date.now();
                  const chunkResult = await ctx.control.terminalCommandService.executeCommandBatchOptimized?.(
                    job.device,
                    chunk,
                    commandOptions,
                  );
                  const chunkDurationMs = Math.max(0, Date.now() - chunkStartedAt);

                  if (!chunkResult) {
                    adaptiveBatchChunks.push({
                      index: chunkIndex,
                      commandCount: chunk.length,
                      commands: chunk,
                      ok: false,
                      durationMs: chunkDurationMs,
                    });
                    for (let localIndex = 0; localIndex < chunk.length; localIndex += 1) {
                      const globalIndex = globalOffset + localIndex;
                      chunkSubResults.push({
                        index: globalIndex,
                        command: chunk[localIndex] ?? "",
                        ok: false,
                        status: 1,
                        durationMs: chunkDurationMs,
                        result: {
                          ok: false,
                          action: "ios.exec",
                          device: job.device,
                          command: chunk[localIndex] ?? "",
                          status: 1,
                          output: "",
                          rawOutput: "",
                          warnings: [],
                          error: {
                            code: "ADAPTIVE_BATCH_CHUNK_FAILED",
                            message: "Adaptive batch chunk returned no result.",
                          },
                          evidence: {},
                        },
                        warnings: [],
                      });
                    }
                    globalOffset += chunk.length;
                    continue;
                  }

                  const chunkBase = isRecord(chunkResult) ? chunkResult : {};
                  const chunkResults = Array.isArray((chunkResult as any).subResults)
                    ? (chunkResult as any).subResults
                    : [];

                  adaptiveBatchChunks.push({
                    index: chunkIndex,
                    commandCount: chunk.length,
                    commands: chunk,
                    executionStrategy: typeof (chunkResult as any).executionStrategy === "string"
                      ? (chunkResult as any).executionStrategy
                      : undefined,
                    ok: Boolean((chunkResult as any).ok),
                    durationMs: chunkDurationMs,
                  });

                  for (const [localIndex, sub] of chunkResults.entries()) {
                    const globalIndex = globalOffset + localIndex;
                    chunkSubResults.push({
                      index: globalIndex,
                      command: typeof sub?.command === "string" ? sub.command : chunk[localIndex] ?? "",
                      ok: Boolean(sub?.ok),
                      status: typeof sub?.status === "number" ? sub.status : undefined,
                      durationMs: typeof sub?.durationMs === "number" ? sub.durationMs : undefined,
                      result: sub?.result ?? chunkBase,
                      warnings: Array.isArray(sub?.warnings) ? sub.warnings : undefined,
                    });
                  }

                  globalOffset += chunk.length;

                  if (!input.continueOnError && chunkResults.some((sub: any) => sub?.ok === false)) {
                    break;
                  }
                }

                const adaptiveIntegrity = evaluateAdaptiveBatchIntegrity(lines, chunkSubResults, adaptiveBatchChunks);
                const { missingSubResultIndexes, failedSubcommandCount } = adaptiveIntegrity;
                const recoverableFailedIndexes = findRecoverableFailedSubResultIndexes(chunkSubResults);
                const recoveryIndexes = [...new Set([...missingSubResultIndexes, ...recoverableFailedIndexes])].sort((a, b) => a - b);
                const recoverySubResults: SequentialSubCommandResult[] = [];
                const jobTimeoutMs = job.timeoutMs ?? profileDefaults?.defaultTimeoutMs ?? ctx.defaultTimeoutMs;
                const recoveryCommandTimeoutMs = Math.min(Math.max(250, Math.floor(jobTimeoutMs / 4)), 1_000);
                const adaptiveRecoveryBudgetMs = Math.min(Math.max(500, Math.floor(jobTimeoutMs / 2)), 2_000);
                const recoveryStartedAt = Date.now();

                if (recoveryIndexes.length > 0) {
                  for (const indexToRecover of recoveryIndexes) {
                    const command = lines[indexToRecover];
                    if (typeof command !== "string") continue;

                    if (Date.now() - recoveryStartedAt > adaptiveRecoveryBudgetMs) {
                      recoverySubResults.push({
                        index: indexToRecover,
                        command,
                        ok: false,
                        status: 1,
                        durationMs: 0,
                        result: {
                          ok: false,
                          action: "ios.exec",
                          device: job.device,
                          command,
                          status: 1,
                          output: "",
                          rawOutput: "",
                          error: {
                            code: "ADAPTIVE_BATCH_RECOVERY_TIMEOUT",
                            message: "Sequential recovery command timed out.",
                          },
                        },
                        warnings: [buildRecoveryTimeoutWarning(indexToRecover, command)],
                      });
                      break;
                    }

                    const startedAt = Date.now();
                    let recovered: unknown;

                    try {
                      recovered = await withTimeout(
                        ctx.control.terminalCommandService.executeCommand(job.device, command, commandOptions),
                        recoveryCommandTimeoutMs,
                        () => new Error(`Sequential recovery command timed out after ${recoveryCommandTimeoutMs}ms`),
                      );
                    } catch (error) {
                      const durationMs = Math.max(0, Date.now() - startedAt);
                      recoverySubResults.push({
                        index: indexToRecover,
                        command,
                        ok: false,
                        status: 1,
                        durationMs,
                        result: {
                          ok: false,
                          action: "ios.exec",
                          device: job.device,
                          command,
                          status: 1,
                          output: "",
                          rawOutput: "",
                          error: {
                            code: "ADAPTIVE_BATCH_RECOVERY_TIMEOUT",
                            message: error instanceof Error ? error.message : "Sequential recovery command timed out.",
                          },
                        },
                        warnings: [buildRecoveryTimeoutWarning(indexToRecover, command)],
                      });
                      break;
                    }

                    const durationMs = Math.max(0, Date.now() - startedAt);

                    recoverySubResults.push({
                      index: indexToRecover,
                      command,
                      ok: getExecutionOk(recovered),
                      status: getExecutionStatus(recovered),
                      durationMs,
                      result: {
                        ...(recovered as unknown as Record<string, unknown>),
                        ...(effectiveRaw ? {} : { rawOutput: undefined }),
                      },
                      warnings: Array.isArray((recovered as any)?.warnings) ? ((recovered as any).warnings as unknown[]) : [],
                    });
                  }
                }

                const mergedSubResults = mergeRecoveredSubResults(chunkSubResults, recoverySubResults);
                const finalMissingIndexes = findMissingSubResultIndexes(lines, mergedSubResults);
                const finalFailedSubcommandCount = mergedSubResults.filter((item) => item.ok === false).length;
                const finalIntegrityOk = finalMissingIndexes.length === 0 && finalFailedSubcommandCount === 0;
                const finalIsIncomplete = finalMissingIndexes.length > 0;
                const finalHasFailedCommands = finalMissingIndexes.length === 0 && finalFailedSubcommandCount > 0;

                return enrichCmdRunJobResultWithPerformance(
                  {
                    index,
                    device: job.device,
                    commandCount: lines.length,
                    commands: lines,
                    result: {
                      action: "ios.exec.batch",
                      device: job.device,
                      command: lines.join("\n"),
                      commandCount: lines.length,
                      commands: lines,
                      output: mergedSubResults.map((item) => getBestOutput(item.result)).join("\n"),
                      rawOutput: effectiveRaw ? mergedSubResults.map((item) => getBestOutput(item.result)).join("\n") : undefined,
                      status: finalIntegrityOk ? 0 : 1,
                      ok: finalIntegrityOk,
                      executionStrategy: recoveryIndexes.length > 0 ? "adaptive-optimized-chunks-plus-sequential-recovery" : "adaptive-optimized-chunks",
                      adaptiveBatchStrategy: batchStrategy,
                      adaptiveBatchChunkCount: chunks.length,
                      adaptiveBatchChunks,
                      adaptiveBatchRecoveryAttempted: recoveryIndexes.length > 0,
                      adaptiveBatchRecoveredCommandCount: recoverySubResults.length,
                      adaptiveBatchRecoveryIndexes: recoveryIndexes,
                      subResults: mergedSubResults,
                      failedSubcommandCount: finalFailedSubcommandCount,
                      evidence: buildBatchEvidence(null, mergedSubResults),
                      ...(finalIsIncomplete
                        ? {
                            warnings: [buildAdaptiveBatchIncompleteWarning(mergedSubResults.length, expectedSubResultCount, finalMissingIndexes)],
                            error: {
                              code: "ADAPTIVE_BATCH_INCOMPLETE",
                              message: "Adaptive batch did not produce complete successful results.",
                            },
                          }
                        : finalHasFailedCommands
                          ? {
                              warnings: [{
                                code: "CMD_BATCH_PARTIAL_FAILURE",
                                severity: "warning",
                                message: `Adaptive batch completed but ${finalFailedSubcommandCount} command(s) failed.`,
                                actionable: true,
                              }],
                              error: {
                                code: "IOS_BATCH_SUBCOMMAND_FAILED",
                                message: "Adaptive batch completed but one or more commands failed.",
                              },
                            }
                          : {}),
                    },
                  },
                  effectiveSlowThresholdMs,
                );
                }
              }

              if (batchStrategy !== "sequential" && canTryOptimizedBatch) {
                const optimized = await ctx.control.terminalCommandService.executeCommandBatchOptimized?.(
                  job.device,
                  lines,
                  commandOptions,
                );
                optimizedRuntimeBatchAvailable = true;

                if (optimized && (optimized as any).optimizedBatchRejected === true) {
                  optimizedRuntimeBatchFallbackReason = String((optimized as any).optimizedBatchReason ?? "returned_null");
                  optimizedRuntimeBatchDiagnostics = {
                    expectedCommands: (optimized as any).optimizedBatchExpectedCommands,
                    expectedNormalizedCommands: (optimized as any).optimizedBatchExpectedNormalizedCommands,
                    runtimeStepCommands: (optimized as any).optimizedBatchRuntimeStepCommands,
                    runtimeNormalizedStepCommands: (optimized as any).optimizedBatchRuntimeNormalizedStepCommands,
                    runtimeStepSummary: (optimized as any).optimizedBatchRuntimeStepSummary,
                    unmatchedCommands: (optimized as any).optimizedBatchUnmatchedCommands,
                    planStepSummary: (optimized as any).optimizedBatchPlanStepSummary,
                    visiblePlanCommands: (optimized as any).optimizedBatchVisiblePlanCommands,
                    runtimeResultKeys: (optimized as any).optimizedBatchRuntimeResultKeys,
                  };
                }

                if (
                  optimized &&
                  Array.isArray((optimized as any).subResults) &&
                  (optimized as any).subResults.length === lines.length
                ) {
                  return enrichCmdRunJobResultWithPerformance(
                    {
                      index,
                      device: job.device,
                      commandCount: lines.length,
                      commands: lines,
                      result: {
                        ...(optimized as any),
                        executionStrategy: "optimized-runtime-multistep",
                        ...(effectiveRaw ? {} : { rawOutput: undefined }),
                      },
                      ...(optimizedRuntimeBatchDiagnostics !== undefined
                        ? { optimizedRuntimeBatchDiagnostics }
                        : {}),
                    },
                    effectiveSlowThresholdMs,
                  );
                }

                if (
                  optimized &&
                  (optimized as any).optimizedBatchPartial === true &&
                  Array.isArray((optimized as any).subResults) &&
                  typeof (optimized as any).optimizedBatchNextCommandIndex === "number"
                ) {
                  const nextCommandIndex = Math.max(0, Math.min(lines.length, Math.floor((optimized as any).optimizedBatchNextCommandIndex)));
                  const sequentialSubResults: SequentialSubCommandResult[] = [];
                  let baseResult: unknown = null;

                  for (const [subIndex, command] of lines.slice(nextCommandIndex).entries()) {
                    const startedAt = Date.now();

                    try {
                      const executed = await ctx.control.terminalCommandService.executeCommand(
                        job.device,
                        command,
                        commandOptions,
                      );
                      const durationMs = Math.max(0, Date.now() - startedAt);
                      baseResult = executed;
                      sequentialSubResults.push(buildSequentialSubResult(nextCommandIndex + subIndex, command, executed, durationMs, effectiveRaw));

                      if (!getExecutionOk(executed) && !input.continueOnError) {
                        break;
                      }
                    } catch (error) {
                      const durationMs = Math.max(0, Date.now() - startedAt);
                      const failedResult = {
                        ok: false,
                        action: "ios.exec",
                        device: job.device,
                        deviceKind: "ios",
                        command,
                        output: "",
                        rawOutput: "",
                        status: 1,
                        warnings: [],
                        error: {
                          code: "PT_CMD_SUBCOMMAND_FAILED",
                          message: error instanceof Error ? error.message : String(error),
                        },
                        evidence: {},
                      };

                      sequentialSubResults.push({
                        index: nextCommandIndex + subIndex,
                        command,
                        ok: false,
                        status: 1,
                        durationMs,
                        result: failedResult,
                        warnings: [],
                      });

                      baseResult = failedResult;

                      if (!input.continueOnError) {
                        break;
                      }
                    }
                  }

                  const totalSubResults = [...((optimized as any).subResults as SequentialSubCommandResult[]), ...sequentialSubResults];
                  const failedSubcommandCount = totalSubResults.filter((item) => item.ok === false).length;
                  const combinedOutput = totalSubResults
                    .map((item) => getBestOutput(item.result))
                    .filter((line) => line.trim().length > 0)
                    .join("\n");
                  const baseRecord = isRecord(baseResult) ? baseResult : {};
                  const evidence = buildBatchResult(job, totalSubResults, baseResult, effectiveRaw);

                  return enrichCmdRunJobResultWithPerformance(
                    {
                      index,
                      device: job.device,
                      commandCount: lines.length,
                      commands: lines,
                      result: {
                        ...baseRecord,
                        action: "ios.exec.batch",
                        device: job.device,
                        deviceKind: isRecord(baseRecord) && typeof baseRecord.deviceKind === "string" ? baseRecord.deviceKind : "ios",
                        command: lines.join("\n"),
                        commandCount: lines.length,
                        commands: lines,
                        output: combinedOutput,
                        rawOutput: effectiveRaw ? combinedOutput : undefined,
                        status: failedSubcommandCount === 0 ? 0 : 1,
                        ok: failedSubcommandCount === 0,
                        executionStrategy: "optimized-runtime-partial-plus-sequential",
                        optimizedRuntimeBatchAttempted: true,
                        optimizedRuntimeBatchAvailable: true,
                        optimizedRuntimeBatchFallbackReason: "partial_stepResults",
                        ...(optimizedRuntimeBatchDiagnostics !== undefined
                          ? { optimizedRuntimeBatchDiagnostics }
                          : {}),
                        optimizedRuntimeBatchPartial: true,
                        optimizedRuntimeBatchMatchedCommandCount: Number((optimized as any).optimizedBatchMatchedCommandCount ?? nextCommandIndex),
                        optimizedRuntimeBatchNextCommandIndex: nextCommandIndex,
                        failedSubcommandCount,
                        subResults: totalSubResults,
                        evidence: {
                          ...(isRecord(evidence) ? evidence : {}),
                          optimizedBatchDiagnostics: optimizedRuntimeBatchDiagnostics ?? {
                            expectedCommands: lines,
                            matchedCommandCount: Number((optimized as any).optimizedBatchMatchedCommandCount ?? nextCommandIndex),
                            nextCommandIndex,
                            optimizedPartial: true,
                          },
                        },
                      },
                    },
                    effectiveSlowThresholdMs,
                  );
                }

                if (!optimizedRuntimeBatchFallbackReason) {
                  optimizedRuntimeBatchFallbackReason = !optimized
                    ? "returned_null"
                    : "incomplete_subResults";
                }
              }

              const subResults: SequentialSubCommandResult[] = [];
              let baseResult: unknown = null;

              for (const [subIndex, command] of lines.entries()) {
                const startedAt = Date.now();

                try {
                  const executed = await ctx.control.terminalCommandService.executeCommand(
                    job.device,
                    command,
                    commandOptions,
                  );
                  const durationMs = Math.max(0, Date.now() - startedAt);
                  baseResult = executed;

                  const warnings = Array.isArray((executed as any)?.warnings)
                    ? ((executed as any).warnings as unknown[])
                    : undefined;

                  subResults.push({
                    index: subIndex,
                    command,
                    ok: getExecutionOk(executed),
                    status: getExecutionStatus(executed),
                    durationMs,
                    result: {
                      ...executed,
                      ...(effectiveRaw ? {} : { rawOutput: undefined }),
                    },
                    ...(warnings ? { warnings } : {}),
                  });

                  if (!getExecutionOk(executed) && !input.continueOnError) {
                    break;
                  }
                } catch (error) {
                  const durationMs = Math.max(0, Date.now() - startedAt);
                  const failedResult = {
                    ok: false,
                    action: "ios.exec",
                    device: job.device,
                    deviceKind: "ios",
                    command,
                    output: "",
                    rawOutput: "",
                    status: 1,
                    warnings: [],
                    error: {
                      code: "PT_CMD_SUBCOMMAND_FAILED",
                      message: error instanceof Error ? error.message : String(error),
                    },
                    evidence: {},
                  };

                  subResults.push({
                    index: subIndex,
                    command,
                    ok: false,
                    status: 1,
                    durationMs,
                    result: failedResult,
                    warnings: [],
                  });

                  baseResult = failedResult;

                  if (!input.continueOnError) {
                    break;
                  }
                }
              }

              return enrichCmdRunJobResultWithPerformance(
                {
                  index,
                  device: job.device,
                  commandCount: lines.length,
                  commands: lines,
                  result: buildBatchResult(job, subResults, baseResult, effectiveRaw, {
                    optimizedRuntimeBatchAttempted,
                    optimizedRuntimeBatchAvailable,
                    optimizedRuntimeBatchFallbackReason,
                    optimizedRuntimeBatchDiagnostics,
                  }),
                },
                effectiveSlowThresholdMs,
              );
            },
          });

          if (canUseConcurrentScheduler) {
            queuedJobs.push({ index, job, jobId, promise });
            continue;
          }

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

        if (canUseConcurrentScheduler) {
          const settled = await runWithConcurrencyLimit(
            queuedJobs.map((item) => () => item.promise),
            terminalConcurrency,
          );

          for (const [i, settledResult] of settled.entries()) {
            const queued = queuedJobs[i]!;

            if (settledResult.status === "fulfilled") {
              results[queued.index] = settledResult.value;

              if (typeof settledResult.value === "object" && settledResult.value !== null && (settledResult.value as any).result?.ok === false) {
                globalCmdQueue.setJobResultStatus(queued.jobId, "done_with_errors");
              }
              continue;
            }

            globalCmdQueue.setJobResultStatus(queued.jobId, "failed");
            results[queued.index] = {
              index: queued.index,
              device: queued.job.device,
              skipped: true,
              reason: "job_failed",
            };
          }
        }

        const failedCount = results.filter((entry: any) => entry?.result?.ok === false).length;
        const firstDevice = input.jobs[0]?.device;
        const allOk = failedCount === 0;
        const jobCount = input.jobs.length;

        const siguientes: string[] = [];
        if (firstDevice) {
          if (allOk) {
            siguientes.push(`pt_cmd_run device="${firstDevice}" commands="show running-config | section vlan" — más comandos show`);
            siguientes.push(`pt_link op=list — revisar cableado`);
            siguientes.push(`pt_device op=list — inventario completo`);
          } else {
            siguientes.push(`pt_cmd_run device="${firstDevice}" commands="show interfaces" profile="debug" — diagnosticar`);
            siguientes.push(`pt_status op=summary — verificar estado general`);
          }
        } else {
          siguientes.push(`pt_device op=list — listar dispositivos disponibles`);
          siguientes.push(`pt_status op=summary — estado del laboratorio`);
        }

        return instructivo("pt_cmd_run", {
          action: "cmd.run",
          jobCount,
          failedCount,
          results,
          ...(topLevelWarnings.length > 0 ? { warnings: topLevelWarnings } : {}),
          queue: globalCmdQueue.snapshot(),
        }, {
          resumen: allOk
            ? `${jobCount} job(s) ejecutado(s) exitosamente.`
            : `${failedCount} de ${jobCount} job(s) fallaron. Revisa failedSubcommandCount y warnings en cada resultado.`,
          paso: allOk
            ? firstDevice
              ? `Resultados correctos. Puedes ejecutar más comandos con \`pt_cmd_run device="${firstDevice}"\` o revisar configuraciones específicas.`
              : "Comandos ejecutados. Usa `pt_device op=list` para explorar el laboratorio."
            : `Revisa failedSubcommandCount y subResults[].ok en los resultados. Usa profile="debug" para más detalle en el próximo intento.`,
          siguientes,
          tips: !allOk ? ["Usa profile=debug para más detalle en errores.", "Usa continueOnError=true para jobs batch con fallos tolerados."] : undefined,
        });
      } catch (error) {
        return errorToFail(error, "PT_CMD_RUN_FAILED", "Error ejecutando comandos MCP.");
      }
    },
  );
}
