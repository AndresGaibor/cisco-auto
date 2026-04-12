// packages/pt-runtime/src/pt/kernel/cleanup.ts
// Cleanup state management

export interface CleanupState {
  stage: "idle" | "draining" | "finishing" | "done";
  startedAt: number | null;
}

export function createCleanupManager() {
  let state: CleanupState = { stage: "idle", startedAt: null };
  
  function begin(): void {
    state = { stage: "draining", startedAt: Date.now() };
  }
  
  function advance(stage: CleanupState["stage"]): void {
    state.stage = stage;
  }
  
  function getState(): CleanupState {
    return { ...state };
  }
  
  return { begin, advance, getState };
}