/**
 * Máquina de estados del lifecycle del bridge.
 *
 * Estados:
 * - stopped: bridge no inicializado, sin lease, sin consumer
 * - starting: bridge inicializándose, directorios creados
 * - leased: lease adquirido, listo para recovery
 * - recovering: crash recovery en curso
 * - running: consumer activo, procesando comandos
 * - stopping: shutdown en curso
 *
 * Transiciones válidas:
 * - stopped → starting (start())
 * - starting → leased (lease adquirido) o stopped (lease falló)
 * - leased → recovering o running
 * - recovering → running
 * - running → stopping (stop())
 * - stopping → stopped
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

/**
 * Gestor de ciclo de vida del bridge con state machine.
 */
export class BridgeLifecycle {
  private _state: BridgeLifecycleState = "stopped";
  private readonly listeners: Set<(state: BridgeLifecycleState) => void> = new Set();

  /** Estado actual del lifecycle */
  get state(): BridgeLifecycleState {
    return this._state;
  }

  /** @returns true si está en estado running */
  get isRunning(): boolean {
    return this._state === "running";
  }

  /**
   * Indica si el bridge está listo para operaciones.
   * Incluye estados running, recovering y leased.
   */
  get isReady(): boolean {
    return this._state === "running" || this._state === "recovering" || this._state === "leased";
  }

  /**
   * Verifica si una transición es válida desde el estado actual.
   * @param to - Estado destino
   * @returns true si la transición es válida
   */
  canTransition(to: BridgeLifecycleState): boolean {
    return TRANSITIONS[this._state]?.includes(to) ?? false;
  }

  /**
   * Ejecuta una transición de estado.
   * @param to - Estado destino
   * @throws Error si la transición no es válida
   */
  transition(to: BridgeLifecycleState): void {
    if (!this.canTransition(to)) {
      throw new Error(`[BridgeLifecycle] Invalid transition: ${this._state} -> ${to}`);
    }
    const from = this._state;
    this._state = to;
    this.listeners.forEach((fn) => fn(to));
  }

  /**
   * Registra un callback para escuchar cambios de estado.
   * @param fn - Callback llamado con el nuevo estado
   * @returns Función para desregistrar el callback
   */
  onStateChange(fn: (state: BridgeLifecycleState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Assertion que lanza si no está en estado running.
   * @throws Error si no está running
   */
  assertRunning(): void {
    if (!this.isRunning) {
      throw new Error(`[BridgeLifecycle] Operation requires running state, current=${this._state}`);
    }
  }

  /**
   * Assertion que lanza si está stopped o stopping.
   * @throws Error si está en estado stopped o stopping
   */
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
