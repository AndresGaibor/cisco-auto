// ============================================================================
// IosSetupGuard - Garantiza que el dispositivo IOS está listo antes de ejecutar comandos
// ============================================================================
// Detecta y dismiss automáticamente el setup dialog usando PromptClassifier

import type { FileBridgePort } from "../../ports/file-bridge.port.js";
import { PromptClassifier, IosPromptState } from "./prompt-classifier.js";
import { IosDeviceType, getStrategy } from "./ios-commands.js";

/**
 * Opciones para IosSetupGuard
 */
export interface SetupGuardOptions {
  maxWaitMs?: number;
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
  durationMs: number;
}

/**
 * IosSetupGuard - Core Logic para garantizar que el dispositivo IOS está listo
 */
export class IosSetupGuard {
  private readonly classifier: PromptClassifier;
  private readonly maxWaitMs: number;
  private readonly maxAttempts: number;

  constructor(
    private readonly bridge: FileBridgePort,
    options?: SetupGuardOptions,
  ) {
    this.classifier = new PromptClassifier();
    this.maxWaitMs = options?.maxWaitMs ?? 5000;
    this.maxAttempts = options?.maxAttempts ?? 3;
  }

  async ensureReady(
    device: string,
    deviceType?: IosDeviceType,
  ): Promise<SetupDetectionResult> {
    const inicio = Date.now();
    let attempts = 0;
    let wasActive = false;
    let dismissed = false;
    let finalState = IosPromptState.NORMAL;

    try {
      const estadoResult = await this.bridge.sendCommandAndWait<any>("execIos", {
        device,
        command: "",
      });

      if (!estadoResult.ok || !estadoResult.value) {
        return {
          wasActive: false,
          dismissed: false,
          attempts: 0,
          finalState: IosPromptState.NORMAL,
          durationMs: Date.now() - inicio,
        };
      }

      const output = estadoResult.value.raw ?? "";
      const estados = this.classifier.classify(output);

      if (!deviceType || deviceType === "pc") {
        finalState = estados[0] ?? IosPromptState.NORMAL;
        return {
          wasActive: false,
          dismissed: false,
          attempts: 1,
          finalState,
          durationMs: Date.now() - inicio,
        };
      }

      if (estados.includes(IosPromptState.SETUP_DIALOG)) {
        wasActive = true;
        const strategy = getStrategy(deviceType);
        const dismissCmd = strategy.dismissSetupCommand();

        if (dismissCmd) {
          await this.bridge.sendCommandAndWait("execIos", {
            device,
            command: dismissCmd,
          });
          dismissed = true;
          attempts = 1;
        }
        finalState = IosPromptState.NORMAL;
      } else if (estados.includes(IosPromptState.PRESS_RETURN)) {
        wasActive = true;
        const strategy = getStrategy(deviceType);
        const pressReturnCmd = strategy.pressReturnCommand();

        if (pressReturnCmd !== null) {
          await this.bridge.sendCommandAndWait("execIos", {
            device,
            command: pressReturnCmd,
          });
          dismissed = true;
          attempts = 1;
        }
        finalState = IosPromptState.NORMAL;
      } else {
        finalState = estados[0] ?? IosPromptState.NORMAL;
      }

      return {
        wasActive,
        dismissed,
        attempts,
        finalState,
        durationMs: Date.now() - inicio,
      };
    } catch {
      return {
        wasActive: false,
        dismissed: false,
        attempts,
        finalState,
        durationMs: Date.now() - inicio,
      };
    }
  }
}
