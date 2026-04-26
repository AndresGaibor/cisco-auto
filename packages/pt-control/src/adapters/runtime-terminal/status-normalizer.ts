// Status normalization utilities for terminal execution results
// Pure functions — no side effects, fully testable

export interface ExecInteractiveValue {
  raw?: string;
  value?: string;
  output?: string;
  parsed?: unknown;
  session?: {
    mode?: string;
    prompt?: string;
    paging?: boolean;
    awaitingConfirm?: boolean;
    autoDismissedInitialDialog?: boolean;
  };
  diagnostics?: {
    commandStatus?: number;
    completionReason?: string;
  };
}

/**
 * Normalize a terminal command status from ExecInteractiveValue.
 * Returns 0 for success, 1 for failure based on output content
 * and diagnostic signals.
 */
export function normalizeStatus(value: ExecInteractiveValue): number {
  if (typeof value?.diagnostics?.commandStatus === "number") {
    return value.diagnostics.commandStatus;
  }

  const raw = String(value?.raw ?? value?.value ?? value?.output ?? "");
  if (!raw) return 0;

  // Solo buscar errores en las últimas líneas para evitar falsos positivos con historial viejo
  const lines = raw.split("\n");
  const recentLines = lines.slice(-15).join("\n");

  if (
    recentLines.includes("% Invalid") ||
    recentLines.includes("% Incomplete") ||
    recentLines.includes("% Ambiguous") ||
    recentLines.includes("% Unknown") ||
    recentLines.includes("%Error") ||
    recentLines.toLowerCase().includes("invalid command") ||
    recentLines.includes("Command not found")
  ) {
    return 1;
  }

  return 0;
}

/**
 * Detect if a session mode indicates a host device (PC/Server).
 */
export function detectHostMode(session: ExecInteractiveValue["session"]): boolean {
  if (!session?.mode) return false;
  const mode = session.mode.toLowerCase();
  return mode.includes("host") || mode === "pc" || mode === "server";
}

/**
 * Normalize runtime error status from an unknown value.
 * Maps finite numbers: 0 → 1 (failure), non-zero → as-is.
 * Non-finite/non-numeric → 1 (failure).
 */
export function normalizeRuntimeErrorStatus(status: unknown): number {
  if (typeof status === "number" && Number.isFinite(status)) {
    return status === 0 ? 1 : status;
  }
  return 1;
}
