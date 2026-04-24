// packages/pt-runtime/src/pt/kernel/kernel-state.ts
// Estado interno del kernel - mantiene estado de ejecución y comandos activos.

import type { CommandEnvelope } from "./types";

/**
 * Estado global del kernel de runtime.
 * Controla si el kernel está corriendo, shutting down, y el comando activo.
 */
export interface KernelState {
  isRunning: boolean;
  isShuttingDown: boolean;
  activeCommand: CommandEnvelope | null;
  activeCommandFilename: string | null;
}

/**
 * Crea un estado inicial de kernel.
 * Todos los campos starts en null/false.
 */
export function createKernelState(): KernelState {
  return {
    isRunning: false,
    isShuttingDown: false,
    activeCommand: null,
    activeCommandFilename: null,
  };
}
