import type { RuntimeState } from "./runtime-state";

export interface DispatchLoopConfig {
  pollIntervalMs: number;
  maxConcurrentCommands: number;
}

export interface DispatchResult {
  processed: number;
  errors: string[];
}

export interface DispatchLoop {
  readNextJob(): string | null;
  delegateToRuntime(payload: Record<string, unknown>): unknown;
  captureResult(result: unknown): void;
  publishResult(result: unknown): void;
  clearExecutionState(): void;
  maintainHeartbeat(): void;
  maintainSnapshot(): void;
  stop(): void;
  isActive(): boolean;
}

export function createDispatchLoop(
  state: RuntimeState,
  config: DispatchLoopConfig,
): DispatchLoop {
  let active = true;
  let lastJobReadAt = 0;

  return {
    readNextJob(): string | null {
      if (!active) return null;
      lastJobReadAt = Date.now();
      state.activeQueueItem = "job-id-placeholder";
      if (!state.bootstrapped) return null;
      return state.activeQueueItem;
    },

    delegateToRuntime(payload: Record<string, unknown>): unknown {
      if (!state.runtimeLoaded) {
        return { error: "runtime-not-loaded" };
      }
      return { delegated: true, payload };
    },

    captureResult(result: unknown): void {
      state.lastError = null;
    },

    publishResult(result: unknown): void {
    },

    clearExecutionState(): void {
      state.activeQueueItem = null;
    },

    maintainHeartbeat(): void {
      if (state.heartbeatState.active) {
        state.heartbeatState.lastBeatAt = Date.now();
      }
    },

    maintainSnapshot(): void {
      const now = Date.now();
      if (now - state.snapshotState.lastSnapshotAt > 30000) {
        state.snapshotState.lastSnapshotAt = now;
        state.snapshotState.pending = false;
      }
    },

    stop(): void {
      active = false;
    },

    isActive(): boolean {
      return active && state.bootstrapped;
    },
  };
}

export function isDispatchLoopActive(state: RuntimeState): boolean {
  return state.bootstrapped && !state.cleaningUp && state.tickTimer !== null;
}

export function stopDispatchLoop(state: RuntimeState): void {
  state.tickTimer = null;
  state.cleaningUp = true;
}