import type { RuntimeState } from "./runtime-state";

export interface BootstrapConfig {
  version: string;
  buildFingerprint: string;
  devDir: string;
  runtimeFile: string;
  pollIntervalMs: number;
  heartbeatIntervalMs: number;
}

export interface BootstrapResult {
  success: boolean;
  state: RuntimeState;
  error?: string;
}

export function bootstrapKernel(config: BootstrapConfig): BootstrapResult {
  const state = createInitialState(config);

  try {
    inicializarEstadoGlobal(state, config);
    prepararDirectoriosYPaths(state, config);
    cargarRuntimeInicial(state, config);
    registrarSubsistemas(state);
    arrancarLoop(state, config);
    dejarTrazabilidad(state, "kernel-bootstrapped");

    return { success: true, state };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    state.lastError = errorMsg;
    dejarTrazabilidad(state, `bootstrap-failed: ${errorMsg}`);
    return { success: false, state, error: errorMsg };
  }
}

function createInitialState(config: BootstrapConfig): RuntimeState {
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
      intervalMs: config.heartbeatIntervalMs,
      lastBeatAt: 0,
    },
    snapshotState: {
      lastSnapshotAt: 0,
      pending: false,
    },
    terminalSubsystemReady: false,
    lastError: null,
    version: config.version,
    buildFingerprint: config.buildFingerprint,
  };
}

function inicializarEstadoGlobal(state: RuntimeState, config: BootstrapConfig): void {
  state.bootstrapped = false;
  state.cleaningUp = false;
  state.lastError = null;
  dejarTrazabilidad(state, "estado-global-inicializado");
}

function prepararDirectoriosYPaths(state: RuntimeState, config: BootstrapConfig): void {
  dejarTrazabilidad(state, `paths-preparados: devDir=${config.devDir}`);
}

function cargarRuntimeInicial(state: RuntimeState, config: BootstrapConfig): void {
  state.lastRuntimeLoadAt = Date.now();
  state.runtimeLoaded = true;
  dejarTrazabilidad(state, "runtime-cargado-inicial");
}

function registrarSubsistemas(state: RuntimeState): void {
  state.terminalSubsystemReady = true;
  dejarTrazabilidad(state, "subsistemas-registrados");
}

function arrancarLoop(state: RuntimeState, config: BootstrapConfig): void {
  state.bootstrapped = true;
  dejarTrazabilidad(state, `loop-arrancado: pollIntervalMs=${config.pollIntervalMs}`);
}

function dejarTrazabilidad(state: RuntimeState, mensaje: string): void {
  if (typeof dprint === "function") {
    dprint(`[bootstrap] ${mensaje}`);
  }
}

export function isKernelBootstrapped(state: RuntimeState): boolean {
  return state.bootstrapped === true;
}