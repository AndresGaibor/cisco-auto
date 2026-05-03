// packages/pt-runtime/src/pt/kernel/command-result-envelope.ts
// Construye el envelope de resultado sin tocar el filesystem.

import type { ResultEnvelope } from "./types";

type ActiveCommandTimingInput = {
  id: string;
  seq: number;
  type?: string;
  startedAt: number;
  createdAt?: number;
  queuedAt?: number;
};

type ResultEnvelopeMeta = {
  queuedAt: number;
  claimedAt: number;
  completedAtMs: number;
  queueLatencyMs: number;
  execLatencyMs: number;
};

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function nonNegativeDeltaMs(end: number, start: number): number {
  return Math.max(0, Math.trunc(end - start));
}

function resolveQueuedAt(activeCommand: ActiveCommandTimingInput): number {
  return (
    finiteNumber(activeCommand.createdAt) ??
    finiteNumber(activeCommand.queuedAt) ??
    finiteNumber(activeCommand.startedAt) ??
    Date.now()
  );
}

function buildResultMeta(
  activeCommand: ActiveCommandTimingInput,
  completedAt: number,
): ResultEnvelopeMeta {
  const claimedAt = finiteNumber(activeCommand.startedAt) ?? completedAt;
  const queuedAt = resolveQueuedAt(activeCommand);

  return {
    queuedAt,
    claimedAt,
    completedAtMs: completedAt,
    queueLatencyMs: nonNegativeDeltaMs(claimedAt, queuedAt),
    execLatencyMs: nonNegativeDeltaMs(completedAt, claimedAt),
  };
}

export function buildCommandResultEnvelope(
  activeCommand: ActiveCommandTimingInput,
  result: any,
  completedAt: number = Date.now(),
): ResultEnvelope & { type: string; meta: ResultEnvelopeMeta } {
  const type = String(activeCommand.type ?? "").trim() || "unknown";
  const meta = buildResultMeta(activeCommand, completedAt);

  return {
    protocolVersion: 2,
    id: activeCommand.id,
    seq: activeCommand.seq || 0,
    type,
    startedAt: activeCommand.startedAt,
    completedAt,
    status: result?.ok === false ? "failed" : "completed",
    ok: result?.ok !== false,
    value: result,
    meta,
    error:
      result?.ok === false
        ? {
            code: result?.code ?? "EXECUTION_ERROR",
            message: String(result?.error ?? "Command failed"),
            phase: "execution",
          }
        : undefined,
  };
}
