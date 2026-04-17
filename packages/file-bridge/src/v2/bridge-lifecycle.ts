/**
 * Bridge Lifecycle State Machine
 *
 * States:
 *   stopped      — bridge no inicializado, sin lease, sin consumer
 *   starting     — bridge inicializándose, directorios creados
 *   leased       — lease adquirido, listo para recovery
 *   recovering   — crash recovery en curso
 *   running      — consumer activo, procesando comandos
 *   stopping     — shutdown en curso
 *
 * Transitions:
 *   stopped -> starting  (start())
 *   starting -> leased    (lease acquired)
 *   starting -> stopped   (lease failed)
 *   leased -> recovering  (run recovery)
 *   leased -> running     (skip recovery if nothing to recover)
 *   recovering -> running  (recovery complete)
 *   running -> stopping  (stop())
 *   stopping -> stopped   (cleanup complete)
 */

export type BridgeLifecycleState =
  | "stopped"
  | "starting"
  | "leased"
  | "recovering"
  | "running"
  | "stopping";

export interface BridgeLifecycleEvents {
  onStateChange?: (from: BridgeLifecycleState, to: BridgeLifecycleState) => void;
}

export class BridgeLifecycle {
  private _state: BridgeLifecycleState = "stopped";
  private readonly listeners: Set<(state: BridgeLifecycleState) => void> = new Set();

  get state(): BridgeLifecycleState {
    return this._state;
  }

  get isRunning(): boolean {
    return this._state === "running";
  }

  get isReady(): boolean {
    return this._state === "running" || this._state === "recovering" || this._state === "leased";
  }

  canTransition(to: BridgeLifecycleState): boolean {
    return TRANSITIONS[this._state]?.includes(to) ?? false;
  }

  transition(to: BridgeLifecycleState): void {
    if (!this.canTransition(to)) {
      throw new Error(`[BridgeLifecycle] Invalid transition: ${this._state} -> ${to}`);
    }
    const from = this._state;
    this._state = to;
    this.listeners.forEach((fn) => fn(to));
  }

  onStateChange(fn: (state: BridgeLifecycleState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  assertRunning(): void {
    if (!this.isRunning) {
      throw new Error(`[BridgeLifecycle] Operation requires running state, current=${this._state}`);
    }
  }

  assertNotStopped(): void {
    if (this._state === "stopped" || this._state === "stopping") {
      throw new Error(`[BridgeLifecycle] Operation not allowed in ${this._state} state`);
    }
  }
}

const TRANSITIONS: Record<BridgeLifecycleState, BridgeLifecycleState[]> = {
  stopped: ["starting"],
  starting: ["leased", "stopped"],
  leased: ["recovering", "running"],
  recovering: ["running"],
  running: ["stopping"],
  stopping: ["stopped"],
};
