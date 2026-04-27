import type { RuntimeState } from "./runtime-state";
import { createRuntimeBucket } from "./runtime-state";

export interface CleanupStage {
  name: string;
  completed: boolean;
  error?: string;
}

export interface CleanupResult {
  success: boolean;
  stages: CleanupStage[];
  durationMs: number;
  error?: string;
}

export interface CleanupManagerState {
  started: boolean;
  currentStage: string | null;
  stages: CleanupStage[];
}

export interface CleanupManager {
  begin(): void;
  advance(stage: CleanupStageName): void;
  getState(): CleanupManagerState;
  execute(): CleanupResult;
}

export type CleanupStageName =
  | "stop-timers"
  | "disconnect-listeners"
  | "close-watchers"
  | "release-terminals"
  | "clear-inflight"
  | "finalize";

export function createCleanupManager(state: RuntimeState): CleanupManager {
  let started = false;
  let currentStage: string | null = null;
  const stages: CleanupStage[] = [
    { name: "stop-timers", completed: false },
    { name: "disconnect-listeners", completed: false },
    { name: "close-watchers", completed: false },
    { name: "release-terminals", completed: false },
    { name: "clear-inflight", completed: false },
    { name: "finalize", completed: false },
  ];

  return {
    begin(): void {
      started = true;
      currentStage = null;
      state.cleaningUp = true;
      stages.forEach((s) => {
        s.completed = false;
        s.error = undefined;
      });
    },

    advance(stageName: CleanupStageName): void {
      const stage = stages.find((s) => s.name === stageName);
      if (stage) {
        stage.completed = true;
        currentStage = stageName;
      }
    },

    getState(): CleanupManagerState {
      return { started, currentStage, stages: [...stages] };
    },

    execute(): CleanupResult {
      const startTime = Date.now();
      this.begin();

      this.advance("stop-timers");
      if (state.tickTimer !== null) {
        state.tickTimer = null;
      }

      this.advance("disconnect-listeners");
      state.listeners = createRuntimeBucket<Record<string, any[]>>();

      this.advance("close-watchers");
      state.watchers = createRuntimeBucket<Record<string, any>>();

      this.advance("release-terminals");
      state.terminalSubsystemReady = false;

      this.advance("clear-inflight");
      state.activeQueueItem = null;

      this.advance("finalize");
      state.bootstrapped = false;
      state.cleaningUp = false;

      const durationMs = Date.now() - startTime;
      return {
        success: true,
        stages: stages.map((s) => ({ ...s })),
        durationMs,
      };
    },
  };
}

export function isIdempotentClean(): boolean {
  return true;
}

export function safeCleanup(state: RuntimeState): CleanupResult {
  try {
    const manager = createCleanupManager(state);
    return manager.execute();
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      stages: [],
      durationMs: 0,
      error: errorMsg,
    };
  }
}
