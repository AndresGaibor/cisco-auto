// confirm step handler — extracted from runTerminalPlan

import type { FileBridgePort } from "../../../application/ports/file-bridge.port.js";
import type { TerminalPlanTimeouts } from "../../../ports/runtime-terminal-port.js";
import { normalizeStatus } from "../status-normalizer.js";

export interface ConfirmHandlerDeps {
  bridge: FileBridgePort;
  device: string;
  isHost: boolean;
  handlerName: "execIos" | "execPc";
  defaultTimeouts: TerminalPlanTimeouts;
}

export interface ConfirmResult {
  raw?: string;
  status?: number;
  skipped?: boolean;
}

export async function handleConfirmStep(
  deps: ConfirmHandlerDeps,
  stepIndex: number,
): Promise<{
  event: Record<string, unknown>;
  result: ConfirmResult;
}> {
  const { bridge, device, isHost, handlerName, defaultTimeouts } = deps;

  const confirmResult = await bridge.sendCommandAndWait<any>(
    handlerName,
    {
      type: handlerName,
      device,
      command: "y",
      parse: false,
      ensurePrivileged: false,
      allowPager: false,
      allowConfirm: false,
      commandTimeoutMs: defaultTimeouts.commandTimeoutMs,
      stallTimeoutMs: defaultTimeouts.stallTimeoutMs,
    },
    defaultTimeouts.commandTimeoutMs + 5000,
  );

  const res = confirmResult?.value ?? confirmResult ?? {};
  const raw = String(res.output ?? res.raw ?? (typeof res.value === "string" ? res.value : "") ?? "");
  const status = normalizeStatus(res);

  const event = {
    stepIndex,
    kind: "confirm",
    command: "y",
    status,
    output: raw,
    sessionKind: isHost ? "host" : "ios",
  };

  return {
    event,
    result: { raw, status },
  };
}
