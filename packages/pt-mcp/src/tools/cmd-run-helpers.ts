import type { RegisterToolContext } from "./tool-types.js";

export interface SequentialSubCommandResult {
  index: number;
  command: string;
  ok: boolean;
  status?: number;
  durationMs?: number;
  result: unknown;
  warnings?: unknown[];
}

export function buildSequentialSubResult(
  index: number,
  command: string,
  executed: unknown,
  durationMs: number,
  effectiveRaw: boolean,
): SequentialSubCommandResult {
  const warnings = Array.isArray((executed as any)?.warnings)
    ? ((executed as any).warnings as unknown[])
    : undefined;

  return {
    index,
    command,
    ok: getExecutionOk(executed),
    status: getExecutionStatus(executed),
    durationMs,
    result: {
      ...(executed as Record<string, unknown>),
      ...(effectiveRaw ? {} : { rawOutput: undefined }),
    },
    ...(warnings ? { warnings } : {}),
  };
}

export interface BatchTelemetry {
  optimizedRuntimeBatchAttempted?: boolean;
  optimizedRuntimeBatchAvailable?: boolean;
  optimizedRuntimeBatchFallbackReason?: string;
  optimizedRuntimeBatchDiagnostics?: unknown;
  optimizedRuntimeBatchPartial?: boolean;
  optimizedRuntimeBatchMatchedCommandCount?: number;
  optimizedRuntimeBatchNextCommandIndex?: number;
}

export interface AdaptiveChunk {
  index: number;
  commandCount: number;
  commands: string[];
  executionStrategy?: string;
  ok?: boolean;
  durationMs?: number;
}

export function normalizeCommands(value: string | string[]): string[] {
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getBestOutput(result: unknown): string {
  if (!isRecord(result)) return "";

  const output = result.output;
  if (typeof output === "string" && output.trim().length > 0) return output;

  const rawOutput = result.rawOutput;
  if (typeof rawOutput === "string" && rawOutput.trim().length > 0) return rawOutput;

  const raw = result.raw;
  if (typeof raw === "string" && raw.trim().length > 0) return raw;

  return "";
}

export function getExecutionOk(result: unknown): boolean {
  if (!isRecord(result)) return false;

  if (typeof result.ok === "boolean") return result.ok;
  return Number(result.status ?? 1) === 0;
}

export function getExecutionStatus(result: unknown): number {
  if (!isRecord(result)) return 1;

  const status = Number(result.status ?? 1);
  return Number.isFinite(status) ? status : 1;
}

export function buildBatchEvidence(baseEvidence: unknown, subResults: SequentialSubCommandResult[]): unknown {
  const timings = isRecord(baseEvidence) && isRecord(baseEvidence.timings) ? baseEvidence.timings : {};
  const sequentialTotalSubcommandMs = subResults.reduce((sum, item) => sum + (item.durationMs ?? 0), 0);

  return {
    ...(isRecord(baseEvidence) ? baseEvidence : {}),
    timings: {
      ...(isRecord(timings) ? timings : {}),
      sequentialTotalSubcommandMs,
    },
  };
}

export function buildBatchResult(
  job: { device: string; commands: string[]; mode: string },
  subResults: SequentialSubCommandResult[],
  baseResult: unknown,
  effectiveRaw: boolean,
  telemetry?: BatchTelemetry,
): Record<string, unknown> {
  const failedSubcommandCount = subResults.filter((item) => item.ok === false).length;
  const stoppedEarly = subResults.length < job.commands.length;
  const combinedOutput = subResults
    .map((item) => getBestOutput(item.result))
    .filter((line) => line.trim().length > 0)
    .join("\n");

  const baseRecord = isRecord(baseResult) ? baseResult : {};
  const evidence = buildBatchEvidence(baseRecord.evidence, subResults);
  const evidenceWithDiagnostics = telemetry?.optimizedRuntimeBatchDiagnostics !== undefined
    ? { ...(isRecord(evidence) ? evidence : {}), optimizedBatchDiagnostics: telemetry.optimizedRuntimeBatchDiagnostics }
    : evidence;

  return {
    ...baseRecord,
    action: "ios.exec.batch",
    device: job.device,
    deviceKind: isRecord(baseRecord) && typeof baseRecord.deviceKind === "string" ? baseRecord.deviceKind : "ios",
    command: job.commands.join("\n"),
    commandCount: job.commands.length,
    commands: job.commands,
    output: combinedOutput,
    rawOutput: effectiveRaw ? combinedOutput : undefined,
    status: failedSubcommandCount === 0 ? 0 : 1,
    ok: failedSubcommandCount === 0,
    executionStrategy: "sequential-subcommands",
    ...(telemetry?.optimizedRuntimeBatchAttempted === true ? { optimizedRuntimeBatchAttempted: true } : {}),
    ...(telemetry?.optimizedRuntimeBatchAvailable !== undefined
      ? { optimizedRuntimeBatchAvailable: telemetry.optimizedRuntimeBatchAvailable }
      : {}),
    ...(telemetry?.optimizedRuntimeBatchFallbackReason
      ? { optimizedRuntimeBatchFallbackReason: telemetry.optimizedRuntimeBatchFallbackReason }
      : {}),
    ...(telemetry?.optimizedRuntimeBatchDiagnostics !== undefined
      ? { optimizedRuntimeBatchDiagnostics: telemetry.optimizedRuntimeBatchDiagnostics }
      : {}),
    ...(telemetry?.optimizedRuntimeBatchPartial === true
      ? {
          optimizedRuntimeBatchPartial: true,
          optimizedRuntimeBatchMatchedCommandCount: telemetry.optimizedRuntimeBatchMatchedCommandCount,
          optimizedRuntimeBatchNextCommandIndex: telemetry.optimizedRuntimeBatchNextCommandIndex,
        }
      : {}),
    failedSubcommandCount,
    subResults,
    ...(stoppedEarly ? { stoppedEarly: true, stopReason: "subcommand_failed" } : {}),
    ...(isRecord(baseRecord) && Array.isArray(baseRecord.warnings) ? { warnings: baseRecord.warnings } : {}),
    evidence: evidenceWithDiagnostics,
  };
}
