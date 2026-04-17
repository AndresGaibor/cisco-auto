// packages/pt-runtime/src/pt/kernel/kernel-state.ts
// Estado interno del kernel

import type { CommandEnvelope } from "./types";

export interface KernelState {
  isRunning: boolean;
  isShuttingDown: boolean;
  activeCommand: CommandEnvelope | null;
  activeCommandFilename: string | null;
}

export function createKernelState(): KernelState {
  return {
    isRunning: false,
    isShuttingDown: false,
    activeCommand: null,
    activeCommandFilename: null,
  };
}
