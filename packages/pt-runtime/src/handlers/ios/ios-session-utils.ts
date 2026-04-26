// ============================================================================
// IOS Session Utilities - Shared helpers for IOS handler functions
// ============================================================================

import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";

const DEFAULT_COMMAND_TIMEOUT = 8000;
const DEFAULT_STALL_TIMEOUT = 15000;

// PTCommandLine del API de PT - tipo requerido por CommandExecutor
export interface PTTerminal {
  enterCommand(cmd: string): void;
  getPrompt(): string;
  getMode(): string;
  getOutput?(): string;
  getAllOutput?(): string;
  getCommandInput(): string;
  enterChar(charCode: number, modifier: number): void;
  registerEvent(eventName: string, context: null, handler: (src: unknown, args: unknown) => void): void;
  unregisterEvent(eventName: string, context: null, handler: (src: unknown, args: unknown) => void): void;
  flush?(): void;
}

export { DEFAULT_COMMAND_TIMEOUT, DEFAULT_STALL_TIMEOUT };

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

export function getTerminalDevice(api: PtRuntimeApi, deviceName: string): any {
  try {
    // Intentar acceso directo vía ipc.network (más fiable en PT v9)
    // @ts-ignore
    const net = (typeof ipc !== "undefined") ? ipc.network() : null;
    if (net) {
        const dev = net.getDevice(deviceName);
        if (dev && dev.getCommandLine) {
            return dev.getCommandLine();
        }
    }

    // Fallback al api wrapper
    const device = api.getDeviceByName(deviceName);
    if (!device) return null;
    const cli = (device as any).getCommandLine?.();
    return cli || null;
  } catch(e) {
    return null;
  }
}

export function inferExpectedModeAfterCommand(command: string): any {
  const cmd = command.trim().toLowerCase();

  if (/^(conf|config|configure)(\s+t|\s+terminal)?$/.test(cmd)) {
    return "global-config";
  }

  if (/^interface\s+/.test(cmd)) {
    return "config-if";
  }

  if (/^line\s+/.test(cmd)) {
    return "config-line";
  }

  if (/^router\s+/.test(cmd)) {
    return "config-router";
  }

  if (/^vlan\s+\d+/.test(cmd)) {
    return "config-vlan";
  }

  if (/^end$/.test(cmd) || /^\^z$/.test(cmd)) {
    return "privileged-exec";
  }

  return undefined;
}
