/**
 * Command Pusher para IOS via FileBridge V2.
 *
 * Envía comandos IOS a Packet Tracer a través del bridge de archivos.
 * Reemplaza el pushCommands basado en HTTP del paquete anterior.
 *
 * Arquitectura: CLI → commands/*.json → PT → results/*.json → CLI
 */

import { FileBridgeV2 } from "./file-bridge-v2.js";

/**
 * Resultado de una operación de push de comandos.
 */
export interface PushResult {
  /** Indica si el comando fue exitoso */
  success: boolean;
  /** ID del comando si fue aceptado */
  commandId?: string;
  /** Mensaje de error si falló */
  error?: string;
}

/**
 * Espera hasta que el bridge esté listo o expire el timeout.
 * Polls el estado del bridge con intervalo fijo.
 *
 * @param bridge - Instancia del bridge con método isReady()
 * @param timeoutMs - Tiempo máximo de espera
 * @param pollMs - Intervalo de polling (default: 50ms)
 * @returns true si el bridge quedó listo antes del timeout
 */
export async function waitForBridgeReady(
  bridge: { isReady(): boolean },
  timeoutMs: number,
  pollMs = 50,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (bridge.isReady()) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  return bridge.isReady();
}

function getDevDir(): string {
  return process.env.PT_DEV_DIR || `${process.env.HOME ?? ""}/pt-dev`;
}

/**
 * Envía comandos de configuración IOS a un dispositivo via FileBridge V2.
 *
 * Crea un bridge temporal, lo inicia, envía el comando configIos,
 * y espera el resultado con el timeout especificado.
 *
 * @param deviceId - Nombre del dispositivo en Packet Tracer
 * @param commands - Array de comandos IOS a ejecutar
 * @param timeoutMs - Timeout en ms (default: 120000)
 * @returns PushResult con éxito/error
 * @example
 * ```ts
 * const result = await pushCommands("Router0", ["hostname MiRouter", "ip address 192.168.1.1 255.255.255.0"]);
 * if (result.success) {
 *   console.log(`Comandos aplicados en ${result.commandId}`);
 * }
 * ```
 */
export async function pushCommands(
  deviceId: string,
  commands: string[],
  timeoutMs = 120_000,
): Promise<PushResult> {
  const devDir = getDevDir();
  const bridge = new FileBridgeV2({ root: devDir });

  bridge.start();

  try {
    const bridgeReady = await waitForBridgeReady(bridge, timeoutMs);
    if (!bridgeReady) {
      return {
        success: false,
        error: "Bridge not ready",
      };
    }

    const result = await bridge.sendCommandAndWait<
      { device: string; commands: string[]; save?: boolean },
      { ok: boolean; error?: string }
    >("configIos", { device: deviceId, commands, save: true }, timeoutMs);

    if (result.ok) {
      return { success: true, commandId: result.id };
    } else {
      return {
        success: false,
        error: result.error?.message ?? "Unknown error",
        commandId: result.id,
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await bridge.stop();
  }
}

/**
 * Envía código JavaScript raw a PT para evaluación.
 * Usa el handler "code" en el runtime de PT.
 *
 * @param code - Código JavaScript a ejecutar en PT
 * @param timeoutMs - Timeout en ms (default: 120000)
 * @returns PushResult con éxito/error
 */
export async function pushCode(code: string, timeoutMs = 120_000): Promise<PushResult> {
  const devDir = getDevDir();
  const bridge = new FileBridgeV2({ root: devDir });

  bridge.start();

  try {
    const bridgeReady = await waitForBridgeReady(bridge, timeoutMs);
    if (!bridgeReady) {
      return {
        success: false,
        error: "Bridge not ready",
      };
    }

    const result = await bridge.sendCommandAndWait<
      { code: string },
      { ok: boolean; error?: string }
    >("code", { code }, timeoutMs);

    if (result.ok) {
      return { success: true, commandId: result.id };
    } else {
      return {
        success: false,
        error: result.error?.message ?? "Unknown error",
        commandId: result.id,
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await bridge.stop();
  }
}
