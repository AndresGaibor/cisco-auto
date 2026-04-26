// Terminal session management — extracted from runtime-terminal-adapter

import type { SessionResult } from "../../ports/runtime-terminal-port.js";

export async function ensureSession(device: string): Promise<SessionResult> {
  if (!device || !String(device).trim()) {
    return {
      ok: false,
      error: "Device es obligatorio para ensureSession()",
    };
  }

  return {
    ok: true,
    sessionId: `terminal:${String(device).trim()}`,
  };
}

export async function pollTerminalJob(_jobId: string): Promise<never> {
  throw new Error(
    "pollTerminalJob() no está habilitado en la arquitectura actual. " +
      "Usa runTerminalPlan() directamente o elimina pollTerminalJob() del contrato si ya no se necesita.",
  );
}
