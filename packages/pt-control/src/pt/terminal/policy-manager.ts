// ============================================================================
// PolicyManager - Gestiona el estado de política por device
// ============================================================================

import type { PolicyState, SessionMode, PolicyConfig } from './policy-types.js';
import { DEFAULT_POLICY_CONFIG } from './policy-types.js';

export class PolicyManager {
  private states: Map<string, PolicyState> = new Map();
  private config: PolicyConfig;

  constructor(config: PolicyConfig = DEFAULT_POLICY_CONFIG) {
    this.config = config;
  }

  /**
   * Obtener estado actual para un device
   */
  getState(device: string): PolicyState {
    if (!this.states.has(device)) {
      this.states.set(device, this.createInitialState(device));
    }
    return this.states.get(device)!;
  }

  /**
   * Establecer modo actual
   */
  setMode(device: string, mode: SessionMode): void {
    const state = this.getState(device);
    state.currentMode = mode;
    state.lastActivity = new Date();
  }

  /**
   * Marcar línea como dirty (comando incompleto)
   */
  markDirty(device: string): void {
    const state = this.getState(device);
    state.dirtyLine = true;
    state.lastActivity = new Date();
  }

  /**
   * Limpiar línea dirty
   */
  clearDirty(device: string): void {
    const state = this.getState(device);
    state.dirtyLine = false;
    state.lastActivity = new Date();
  }

  /**
   * Establecer timeout custom para próxima operación
   */
  setTimeout(device: string, timeoutMs: number): void {
    const state = this.getState(device);
    state.timeoutMs = timeoutMs;
  }

  /**
   * Obtener timeout efectivo (custom o default)
   */
  getEffectiveTimeout(device: string): number {
    const state = this.getState(device);
    return state.timeoutMs || this.config.defaultTimeoutMs;
  }

  /**
   * Incrementar conteo de reintentos
   */
  incrementRetry(device: string): number {
    const state = this.getState(device);
    state.retryCount++;
    return state.retryCount;
  }

  /**
   * Resetear conteo de reintentos
   */
  resetRetry(device: string): void {
    const state = this.getState(device);
    state.retryCount = 0;
  }

  /**
   * Registrar timeout consecutivo
   */
  registerTimeout(device: string): void {
    const state = this.getState(device);
    state.consecutiveTimeouts++;
    state.lastActivity = new Date();
  }

  /**
   * Resetear timeouts consecutivos
   */
  resetTimeouts(device: string): void {
    const state = this.getState(device);
    state.consecutiveTimeouts = 0;
  }

  /**
   * Verificar si hay demasiados timeouts consecutivos
   */
  hasTooManyTimeouts(device: string): boolean {
    const state = this.getState(device);
    return state.consecutiveTimeouts >= this.config.maxConsecutiveTimeouts;
  }

  /**
   * Actualizar última actividad
   */
  touch(device: string): void {
    const state = this.getState(device);
    state.lastActivity = new Date();
  }

  /**
   * Guardar output del último comando
   */
  setLastOutput(device: string, output: string): void {
    const state = this.getState(device);
    state.lastOutput = output;
  }

  /**
   * Guardar último comando
   */
  setLastCommand(device: string, command: string): void {
    const state = this.getState(device);
    state.lastCommand = command;
  }

  /**
   * Crear estado inicial
   */
  private createInitialState(device: string): PolicyState {
    return {
      device,
      currentMode: 'exec',
      dirtyLine: false,
      timeoutMs: this.config.defaultTimeoutMs,
      retryCount: 0,
      consecutiveTimeouts: 0,
      lastActivity: new Date(),
    };
  }

  /**
   * Obtener todos los estados
   */
  getAllStates(): PolicyState[] {
    return Array.from(this.states.values());
  }

  /**
   * Limpiar estado de un device
   */
  clearState(device: string): void {
    this.states.delete(device);
  }
}