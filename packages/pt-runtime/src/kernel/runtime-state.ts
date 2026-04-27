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
  watchers: Record<string, any>;
  listeners: Record<string, any[]>;
  activeQueueItem: string | null;
  heartbeatState: HeartbeatState;
  snapshotState: SnapshotState;
  terminalSubsystemReady: boolean;
  lastError: string | null;
  version: string;
  buildFingerprint: string;
}

const RUNTIME_BUCKET_MARK = "__runtime_bucket__";

export function createRuntimeBucket<T extends Record<string, unknown>>(): T {
  const bucket = Object.create(null) as T;
  Object.defineProperty(bucket, RUNTIME_BUCKET_MARK, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return bucket;
}

function isRuntimeBucket(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && (value as Record<string, unknown>)[RUNTIME_BUCKET_MARK] === true);
}

export function createRuntimeState(version: string, fingerprint: string): RuntimeState {
  return {
    bootstrapped: false,
    cleaningUp: false,
    runtimeLoaded: false,
    lastRuntimeLoadAt: 0,
    tickTimer: null,
    watchers: createRuntimeBucket<Record<string, any>>(),
    listeners: createRuntimeBucket<Record<string, any[]>>(),
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
  state.watchers = createRuntimeBucket<Record<string, any>>();
  state.listeners = createRuntimeBucket<Record<string, any[]>>();
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
  if (!isRuntimeBucket(state.watchers)) return false;
  if (!isRuntimeBucket(state.listeners)) return false;
  return true;
}
