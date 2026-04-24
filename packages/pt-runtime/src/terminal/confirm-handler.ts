// ============================================================================
// Confirm Handler - Maneja prompts de confirmación [yes/no], [y/n], Press RETURN to accept
// ============================================================================

import { detectConfirmPrompt } from "./prompt-detector";

export interface ConfirmState {
  active: boolean;
  confirmed: boolean;
  dismissed: boolean;
  autoConfirm: boolean;
}

export function createConfirmState(autoConfirm: boolean = true): ConfirmState {
  return {
    active: false,
    confirmed: false,
    dismissed: false,
    autoConfirm,
  };
}

/**
 * Detecta si el output contiene un prompt de confirmación.
 * 
 * @param output -Chunk de output del terminal
 * @returns true si es un prompt de confirmación
 */
export function isConfirmPrompt(output: string): boolean {
  return detectConfirmPrompt(output);
}

/**
 * Determina qué tipo de confirmación es necesaria.
 * 
 * @param output -Chunk de output del terminal
 * @returns "yes" para [yes/no], "return" para solo RETURN, o null
 */
export function resolveConfirmType(output: string): "yes" | "return" | null {
  const lower = output.toLowerCase();
  if (lower.indexOf("[yes/no]") !== -1 || lower.indexOf("(y/n)") !== -1) {
    return "yes";
  }
  if (lower.indexOf("press return") !== -1 || lower.indexOf("accept") !== -1) {
    return "return";
  }
  return null;
}

/**
 * Activa el estado de confirmación.
 * 
 * @param state -Estado actual
 * @returns Estado actualizado
 */
export function activateConfirm(state: ConfirmState): ConfirmState {
  return { ...state, active: true };
}

/**
 * Confirma el prompt.
 * 
 * @param state -Estado actual
 * @returns Estado actualizado
 */
export function confirm(state: ConfirmState): ConfirmState {
  return { ...state, confirmed: true, active: false };
}

/**
 * Dismissible el prompt sin confirmar.
 * 
 * @param state -Estado actual
 * @returns Estado actualizado
 */
export function dismissConfirm(state: ConfirmState): ConfirmState {
  return { ...state, dismissed: true, active: false };
}

/**
 * Resetea el estado de confirmación.
 * 
 * @param state -Estado actual
 * @returns Estado inicializado
 */
export function resetConfirm(state: ConfirmState): ConfirmState {
  return createConfirmState(state.autoConfirm);
}

export interface ConfirmHandlerConfig {
  autoConfirm?: boolean;
  enabled?: boolean;
}

export function createConfirmHandler(config: ConfirmHandlerConfig = {}): {
  state: ConfirmState;
  handleOutput: (output: string) => boolean;
  confirm: () => void;
  dismiss: () => void;
  reset: () => void;
  shouldAutoConfirm: () => boolean;
} {
  let state = createConfirmState(config.autoConfirm ?? true);

  return {
    get state() {
      return state;
    },
    handleOutput(_output: string): boolean {
      if (isConfirmPrompt(_output)) {
        state = activateConfirm(state);
        return true;
      }
      return false;
    },
    confirm() {
      state = confirm(state);
    },
    dismiss() {
      state = dismissConfirm(state);
    },
    reset() {
      state = createConfirmState(config.autoConfirm ?? true);
    },
    shouldAutoConfirm(): boolean {
      return config.enabled !== false && state.active && state.autoConfirm;
    },
  };
}