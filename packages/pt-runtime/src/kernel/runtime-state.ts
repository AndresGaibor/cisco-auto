export interface HeartbeatState {
  active: boolean;
  intervalMs: number;
  lastBeatAt: number;
}

export interface SnapshotState {
  lastSnapshotAt: number;
  pending: boolean;
}

export interface RuntimeState {
  bootstrapped: boolean;
  cleaningUp: boolean;
  runtimeLoaded: boolean;
  lastRuntimeLoadAt: number;
  tickTimer: number | null;
  watchers: Map<string, any>;
  listeners: Map<string, any[]>;
  activeQueueItem: string | null;
  heartbeatState: HeartbeatState;
  snapshotState: SnapshotState;
  terminalSubsystemReady: boolean;
  lastError: string | null;
  version: string;
  buildFingerprint: string;
}

export function createRuntimeState(version: string, fingerprint: string): RuntimeState {
  return {
    bootstrapped: false,
    cleaningUp: false,
    runtimeLoaded: false,
    lastRuntimeLoadAt: 0,
    tickTimer: null,
    watchers: new Map(),
    listeners: new Map(),
    activeQueueItem: null,
    heartbeatState: {
      active: false,
      intervalMs: 0,
      lastBeatAt: 0,
    },
    snapshotState: {
      lastSnapshotAt: 0,
      pending: false,
    },
    terminalSubsystemReady: false,
    lastError: null,
    version,
    buildFingerprint: fingerprint,
  };
}

export function resetRuntimeState(state: RuntimeState): void {
  state.bootstrapped = false;
  state.cleaningUp = false;
  state.runtimeLoaded = false;
  state.lastRuntimeLoadAt = 0;
  state.tickTimer = null;
  state.watchers.clear();
  state.listeners.clear();
  state.activeQueueItem = null;
  state.heartbeatState.active = false;
  state.heartbeatState.lastBeatAt = 0;
  state.snapshotState.lastSnapshotAt = 0;
  state.snapshotState.pending = false;
  state.terminalSubsystemReady = false;
  state.lastError = null;
}

export function isValidRuntimeState(state: RuntimeState): boolean {
  if (!state.version || state.version.length === 0) return false;
  if (!state.buildFingerprint || state.buildFingerprint.length === 0) return false;
  if (typeof state.bootstrapped !== "boolean") return false;
  if (typeof state.cleaningUp !== "boolean") return false;
  if (typeof state.runtimeLoaded !== "boolean") return false;
  if (!(state.watchers instanceof Map)) return false;
  if (!(state.listeners instanceof Map)) return false;
  return true;
}