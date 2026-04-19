// ============================================================================
// IosSetupGuard - Helper semántico para validar estado de setup IOS
// ============================================================================
// Detecta y clasifica el setup dialog usando PromptClassifier.
// NO ejecuta comandos - opera sobre contratos del motor terminal.

import type { IosDeviceType } from "./ios-commands.js";
import { PromptClassifier, IosPromptState } from "./prompt-classifier.js";
import { getStrategy } from "./ios-commands.js";

/**
 * Opciones para IosSetupGuard
 */
export interface SetupGuardOptions {
  maxAttempts?: number;
}

/**
 * Resultado de la detección de setup
 */
export interface SetupDetectionResult {
  wasActive: boolean;
  dismissed: boolean;
  attempts: number;
  finalState: IosPromptState;
}

/**
 * Comando de dismiss generado por el guard (para que el caller lo ejecute)
 */
export interface DismissCommand {
  command: string;
  strategy: 'setup_dialog' | 'press_return' | 'none';
}

/**
 * IosSetupGuard - Helper semántico para validar estado de setup IOS
 *
 * NO ejecuta comandos. Provee validación pura y comandos para dismiss.
 * El caller (que tiene el TerminalPort) es responsable de ejecutar.
 */
export class IosSetupGuard {
  private readonly classifier: PromptClassifier;
  private readonly maxAttempts: number;

  constructor(options?: SetupGuardOptions) {
    this.classifier = new PromptClassifier();
    this.maxAttempts = options?.maxAttempts ?? 3;
  }

  /**
   * Clasifica el output del terminal y determina si hay setup dialog activo
   */
  classifyOutput(output: string): IosPromptState[] {
    return this.classifier.classify(output);
  }

  /**
   * Valida si el output indica setup dialog activo que necesita dismiss
   */
  isSetupDialogActive(output: string): boolean {
    const estados = this.classifier.classify(output);
    return estados.includes(IosPromptState.SETUP_DIALOG);
  }

  /**
   * Valida si el output indica "press RETURN" activo
   */
  isPressReturnActive(output: string): boolean {
    const estados = this.classifier.classify(output);
    return estados.includes(IosPromptState.PRESS_RETURN);
  }

  /**
   * Genera el comando de dismiss apropiado según el tipo de setup activo
   */
  generateDismissCommand(
    output: string,
    deviceType: IosDeviceType,
  ): DismissCommand {
    const estados = this.classifier.classify(output);

    if (estados.includes(IosPromptState.SETUP_DIALOG)) {
      const strategy = getStrategy(deviceType);
      const dismissCmd = strategy.dismissSetupCommand();
      if (dismissCmd) {
        return { command: dismissCmd, strategy: 'setup_dialog' };
      }
    }

    if (estados.includes(IosPromptState.PRESS_RETURN)) {
      const strategy = getStrategy(deviceType);
      const pressReturnCmd = strategy.pressReturnCommand();
      if (pressReturnCmd !== null) {
        return { command: pressReturnCmd, strategy: 'press_return' };
      }
    }

    return { command: '', strategy: 'none' };
  }

  /**
   * Valida que una sesión está en el modo correcto antes de ejecutar
   */
  validateSessionMode(
    currentState: IosPromptState,
    expectedMode: 'user' | 'privileged' | 'config' | 'setup',
  ): boolean {
    switch (expectedMode) {
      case 'setup':
        return currentState === IosPromptState.SETUP_DIALOG;
      case 'user':
        return currentState === IosPromptState.NORMAL || currentState === IosPromptState.AWAITING_INPUT;
      case 'privileged':
        return currentState === IosPromptState.NORMAL;
      case 'config':
        return currentState === IosPromptState.AWAITING_INPUT;
      default:
        return false;
    }
  }

  /**
   * Procesa el output del terminal y retorna el resultado de detección
   * NO ejecuta comandos - solo analiza y provee comandos a ejecutar por el caller
   */
  detect(output: string, deviceType?: IosDeviceType): SetupDetectionResult {
    let wasActive = false;
    let dismissed = false;
    let finalState = IosPromptState.NORMAL;

    const estados = this.classifier.classify(output);

    if (!deviceType || deviceType === "pc") {
      finalState = estados[0] ?? IosPromptState.NORMAL;
      return {
        wasActive: false,
        dismissed: false,
        attempts: 0,
        finalState,
      };
    }

    if (estados.includes(IosPromptState.SETUP_DIALOG)) {
      wasActive = true;
      finalState = IosPromptState.SETUP_DIALOG;
    } else if (estados.includes(IosPromptState.PRESS_RETURN)) {
      wasActive = true;
      finalState = IosPromptState.PRESS_RETURN;
    } else {
      finalState = estados[0] ?? IosPromptState.NORMAL;
    }

    return {
      wasActive,
      dismissed,
      attempts: wasActive ? 1 : 0,
      finalState,
    };
  }
}

/**
 * Factory para crear guards con configuración común
 */
export function createSetupGuard(options?: SetupGuardOptions): IosSetupGuard {
  return new IosSetupGuard(options);
}
