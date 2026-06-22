// packages/pt-runtime/src/pt/kernel/kernel-state.ts
// Estado interno del kernel - mantiene estado de ejecución, comandos activos y métricas del poll loop.

import type { CommandEnvelope } from "./types";

export interface KernelPollStats {
  tickCount: number;
  processedCount: number;
  emptyCount: number;
  skippedBusyCount: number;
  activeCommandTimeoutCount: number;
  errorCount: number;
  lastPollAt: number;
  lastPollDurationMs: number;
  lastBeforeCount: number;
  lastAfterCount: number;
  nextDelayMs: number;
  idlePollDelayMs: number;
  hotPollBudget: number;
  lastClaimedCommandId: string | null;
  lastClaimedCommandType: string | null;
  lastError: string | null;
}

/**
 * Estado global del kernel de runtime.
 * Controla si el kernel está corriendo, shutting down, el comando activo y métricas de polling.
 */
export interface KernelState {
  isRunning: boolean;
  isShuttingDown: boolean;
  activeCommand: (CommandEnvelope & { startedAt: number }) | null;
  activeCommandFilename: string | null;
  pollStats: KernelPollStats;
}

/**
 * Crea un estado inicial de kernel.
 * Todos los campos empiezan en null/false/0.
 */
export function createKernelState(): KernelState {
  return {
    isRunning: false,
    isShuttingDown: false,
    activeCommand: null,
    activeCommandFilename: null,
    pollStats: {
      tickCount: 0,
      processedCount: 0,
      emptyCount: 0,
      skippedBusyCount: 0,
      activeCommandTimeoutCount: 0,
      errorCount: 0,
      lastPollAt: 0,
      lastPollDurationMs: 0,
      lastBeforeCount: 0,
      lastAfterCount: 0,
      nextDelayMs: 0,
      idlePollDelayMs: 0,
      hotPollBudget: 0,
      lastClaimedCommandId: null,
      lastClaimedCommandType: null,
      lastError: null,
    },
  };
}
