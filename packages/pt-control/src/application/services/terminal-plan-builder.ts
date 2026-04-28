import type {
  TerminalMode,
  TerminalPlan,
  TerminalPlanPolicies,
  TerminalPlanStep,
  TerminalPlanTimeouts,
} from "../../ports/runtime-terminal-port.js";

export interface BuildUniversalTerminalPlanOptions {
  id: string;
  device: string;
  command: string;
  deviceKind: "ios" | "host" | "unknown";
  mode?: "safe" | "interactive" | "raw" | "strict";
  allowConfirm?: boolean;
  allowDestructive?: boolean;
  timeoutMs?: number;
}

export function splitCommandLines(command: string): string[] {
  return command
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .filter((line) => !line.trimStart().startsWith("#"));
}

export function buildDefaultTerminalTimeouts(timeoutMs?: number): TerminalPlanTimeouts {
  return {
    commandTimeoutMs: timeoutMs ?? 30000,
    stallTimeoutMs: 15000,
  };
}

export function buildDefaultTerminalPolicies(args?: {
  allowConfirm?: boolean;
  mode?: "safe" | "interactive" | "raw" | "strict";
}): TerminalPlanPolicies {
  return {
    autoBreakWizard: true,
    autoAdvancePager: true,
    maxPagerAdvances: 80,
    maxConfirmations: args?.allowConfirm || args?.mode === "interactive" ? 5 : 0,
    abortOnPromptMismatch: args?.mode === "strict",
    abortOnModeMismatch: args?.mode !== "raw",
  };
}

function isConfigureTerminal(command: string): boolean {
  return /^(conf|config|configure)(\s+t|\s+terminal)?$/i.test(command.trim());
}

function normalizeIosCommand(line: string): string {
  return line.trim().replace(/\s+/g, " ").toLowerCase();
}

function isEnableCommand(line: string): boolean {
  return /^enable\b/i.test(line.trim());
}

function requiresPrivilegedIosCommand(line: string): boolean {
  const cmd = normalizeIosCommand(line);

  return (
    /^show running-config\b/.test(cmd) ||
    /^show startup-config\b/.test(cmd) ||
    /^show archive\b/.test(cmd) ||
    /^show tech-support\b/.test(cmd) ||
    /^write\b/.test(cmd) ||
    /^copy\b/.test(cmd) ||
    /^erase\b/.test(cmd) ||
    /^reload\b/.test(cmd) ||
    /^clear\b/.test(cmd) ||
    /^debug\b/.test(cmd) ||
    /^undebug\b/.test(cmd) ||
    isConfigureTerminal(cmd)
  );
}

function shouldPrependEnable(options: BuildUniversalTerminalPlanOptions, lines: string[]): boolean {
  return false;
}

function inferIosTargetMode(lines: string[]): TerminalMode | undefined {
  const normalized = lines.map(normalizeIosCommand);

  if (normalized.some((line) => isConfigureTerminal(line))) {
    return "global-config";
  }

  return undefined;
}

export function buildUniversalTerminalPlan(
  options: BuildUniversalTerminalPlanOptions,
): TerminalPlan {
  const lines = splitCommandLines(options.command);

  if (lines.length === 0) {
    return {
      id: options.id,
      device: options.device,
      steps: [],
      timeouts: buildDefaultTerminalTimeouts(options.timeoutMs),
      policies: buildDefaultTerminalPolicies(options),
      metadata: {
        deviceKind: options.deviceKind,
        source: "pt-control.terminal-plan-builder",
      },
    };
  }

  if (options.deviceKind === "host") {
    const steps: TerminalPlanStep[] = lines.map((line) => ({
      kind: "command",
      command: line,
      timeout: options.timeoutMs,
      allowPager: false,
      allowConfirm: Boolean(options.allowConfirm),
      expectMode: "host-prompt",
    }));

    return {
      id: options.id,
      device: options.device,
      targetMode: "host-prompt",
      steps,
      timeouts: buildDefaultTerminalTimeouts(options.timeoutMs),
      policies: buildDefaultTerminalPolicies(options),
      metadata: {
        deviceKind: "host",
        source: "pt-control.terminal-plan-builder",
      },
    };
  }

  if (options.deviceKind === "ios" && lines.length === 1 && isEnableCommand(lines[0] ?? "")) {
    return {
      id: options.id,
      device: options.device,
      targetMode: "privileged-exec",
      steps: [
        {
          kind: "ensureMode",
          expectMode: "privileged-exec",
          timeout: options.timeoutMs,
          metadata: {
            reason: "explicit-enable-command",
          },
        },
      ],
      timeouts: buildDefaultTerminalTimeouts(options.timeoutMs),
      policies: buildDefaultTerminalPolicies(options),
      metadata: {
        deviceKind: "ios",
        source: "pt-control.terminal-plan-builder",
        lineCount: lines.length,
      },
    };
  }

  const steps: TerminalPlanStep[] = [];

  if (shouldPrependEnable(options, lines)) {
    steps.push({
      kind: "ensureMode",
      expectMode: "privileged-exec",
      timeout: options.timeoutMs,
      metadata: {
        reason: "auto-enable-for-privileged-ios-command",
      },
    });
  }

  steps.push(
    ...lines.map((line) => ({
      kind: "command" as const,
      command: line,
      timeout: options.timeoutMs,
      allowPager: /^show\s+/i.test(line),
      allowConfirm: Boolean(options.allowConfirm),
    })),
  );

  return {
    id: options.id,
    device: options.device,
    targetMode: inferIosTargetMode(lines),
    steps,
    timeouts: buildDefaultTerminalTimeouts(options.timeoutMs),
    policies: buildDefaultTerminalPolicies(options),
    metadata: {
      deviceKind: "ios",
      source: "pt-control.terminal-plan-builder",
      lineCount: lines.length,
    },
  };
}
