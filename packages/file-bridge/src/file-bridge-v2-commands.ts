/**
 * FileBridge V2 - IOS Command Pusher
 *
 * Sends IOS configuration commands to Packet Tracer via FileBridge V2.
 * Replaces the HTTP-based pushCommands from packages/bridge.
 *
 * Architecture: CLI → commands/*.json → PT → results/*.json → CLI
 */

import { FileBridgeV2 } from "./file-bridge-v2.js";

export interface PushResult {
  success: boolean;
  commandId?: string;
  error?: string;
}

function getDevDir(): string {
  return process.env.PT_DEV_DIR || `${process.env.HOME ?? ""}/pt-dev`;
}

/**
 * Send IOS configuration commands to a device via FileBridge V2.
 *
 * @param deviceId - Device name in Packet Tracer
 * @param commands - Array of IOS commands to execute
 * @param timeoutMs - Timeout in milliseconds (default: 120000)
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
    const result = await bridge.sendCommandAndWait<{ device: string; commands: string[]; save?: boolean }, { ok: boolean; error?: string }>(
      "configIos",
      { device: deviceId, commands, save: true },
      timeoutMs,
    );

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
 * Send a raw code string to PT for evaluation.
 * Uses the "code" handler in the runtime.
 */
export async function pushCode(
  code: string,
  timeoutMs = 120_000,
): Promise<PushResult> {
  const devDir = getDevDir();
  const bridge = new FileBridgeV2({ root: devDir });

  bridge.start();

  try {
    const result = await bridge.sendCommandAndWait<{ code: string }, { ok: boolean; error?: string }>(
      "code",
      { code },
      timeoutMs,
    );

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
