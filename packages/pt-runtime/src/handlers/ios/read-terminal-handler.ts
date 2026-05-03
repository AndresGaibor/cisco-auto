// ============================================================================
// Read Terminal Handler - Diagnostic terminal read (Minimal Sync)
// ============================================================================

import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
import type { PtResult } from "../../pt-api/pt-results.js";
import { createErrorResult, createSuccessResult } from "../result-factories";

function getTerminalDevice(api: PtRuntimeApi, deviceName: string): any {
  try {
    const globalIpc = typeof ipc !== "undefined" ? ipc : null;
    const net = globalIpc && typeof globalIpc.network === "function"
      ? globalIpc.network()
      : null;

    if (net && typeof net.getDevice === "function") {
      const dev = net.getDevice(deviceName);
      if (dev && typeof dev.getCommandLine === "function") {
        return dev.getCommandLine();
      }
    }
  } catch {}

  try {
    const device = api.getDeviceByName(deviceName);
    if (!device) return null;

    const maybeCli = (device as any).getCommandLine;
    if (typeof maybeCli === "function") {
      return maybeCli.call(device);
    }
  } catch {}

  return null;
}

function readTerminalText(terminal: any): string {
  const methods = [
    "getAllOutput",
    "getBuffer",
    "getOutput",
    "getText",
    "readAll",
    "read",
    "getHistory",
  ];

  for (let i = 0; i < methods.length; i++) {
    const method = methods[i];
    try {
      if (terminal && typeof terminal[method] === "function") {
        const value = terminal[method]();
        if (typeof value === "string") return value;
      }
    } catch {}
  }

  return "";
}

export function handleReadTerminal(payload: { device: string }, api: PtRuntimeApi): PtResult {
  const deviceName = String(payload.device || "").trim();

  if (!deviceName) {
    return createErrorResult("readTerminal requiere device", "INVALID_PAYLOAD");
  }

  const terminal = getTerminalDevice(api, deviceName);
  if (!terminal) {
    return createErrorResult("Terminal inaccessible", "NO_TERMINAL");
  }

  const raw = readTerminalText(terminal);
  let prompt = "";

  try {
    prompt = typeof terminal.getPrompt === "function" ? String(terminal.getPrompt() || "") : "";
  } catch {}

  return createSuccessResult({
    raw,
    output: raw,
    device: deviceName,
    prompt,
  });
}