// packages/pt-runtime/src/pt/kernel/command-result-envelope.ts
// Construye el envelope de resultado sin tocar el filesystem.

import type { ResultEnvelope } from "./types";

export function buildCommandResultEnvelope(
  activeCommand: { id: string; seq: number; type?: string; startedAt: number },
  result: any,
  completedAt: number = Date.now(),
): ResultEnvelope & { type: string } {
  const type = String(activeCommand.type ?? "").trim() || "unknown";

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
