// Payload builder — construye payloads para el bridge
// NO parsea respuestas — esa responsabilidad es de response-parser

import type { FileBridgePort } from "../../application/ports/file-bridge.port.js";
import type { TerminalMode, TerminalPlanPolicies } from "../../ports/runtime-terminal-port.js";

export interface PayloadBuilderDeps {
  bridge: FileBridgePort;
}

export interface BuildPayloadOptions {
  handlerName: string;
  device: string;
  command: string;
  targetMode?: TerminalMode;
  expectMode?: TerminalMode;
  expectPromptPattern?: string;
  allowPager?: boolean;
  allowConfirm?: boolean;
  ensurePrivileged?: boolean;
  commandTimeoutMs?: number;
  stallTimeoutMs?: number;
}

export function createPayloadBuilder(_deps: PayloadBuilderDeps) {
  function buildCommandPayload(options: BuildPayloadOptions): Record<string, unknown> {
    const {
      handlerName,
      device,
      command,
      targetMode,
      expectMode,
      expectPromptPattern,
      allowPager,
      allowConfirm,
      ensurePrivileged,
      commandTimeoutMs,
      stallTimeoutMs,
    } = options;

    return {
      type: handlerName,
      device,
      command,
      parse: false,
      ensurePrivileged,
      targetMode,
      expectedMode: expectMode,
      expectedPromptPattern: expectPromptPattern,
      allowPager,
      allowConfirm,
      commandTimeoutMs,
      stallTimeoutMs,
    };
  }

  function shouldEnsurePrivilegedForStep(args: {
    isHost: boolean;
    planTargetMode?: TerminalMode;
    command: string;
    stepIndex: number;
  }): boolean {
    if (args.isHost) return false;
    const cmd = args.command.trim().toLowerCase();
    if (isConfigureTerminalCommand(cmd)) return true;
    if (args.planTargetMode === "privileged-exec") return true;
    if (args.planTargetMode === "global-config") {
      return args.stepIndex === 0 && !isConfigureTerminalCommand(cmd);
    }
    return false;
  }

  function getDefaultTimeouts(): { commandTimeoutMs: number; stallTimeoutMs: number } {
    return {
      commandTimeoutMs: 8000,
      stallTimeoutMs: 15000,
    };
  }

  function getDefaultPolicies(): TerminalPlanPolicies {
    return {
      autoBreakWizard: true,
      autoAdvancePager: true,
      maxPagerAdvances: 50,
      maxConfirmations: 3,
      abortOnPromptMismatch: false,
      abortOnModeMismatch: true,
    };
  }

  return {
    buildCommandPayload,
    shouldEnsurePrivilegedForStep,
    getDefaultTimeouts,
    getDefaultPolicies,
  };
}

function isConfigureTerminalCommand(command: string): boolean {
  const cmd = command.trim().toLowerCase();
  return /^(conf|config|configure)(\s+t|\s+terminal)?$/.test(cmd);
}

export type PayloadBuilder = ReturnType<typeof createPayloadBuilder>;