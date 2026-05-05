import type {
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

const LONG_OUTPUT_SHOW_COMMAND_TIMEOUT_MS = 90_000;
const LONG_OUTPUT_SHOW_STALL_TIMEOUT_MS = 25_000;
const LONG_OUTPUT_SHOW_MAX_PAGER_ADVANCES = 120;

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

export function normalizeIosCommand(line: string): string {
  return line.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isConfigureTerminal(command: string): boolean {
  return /^(conf|config|configure)(\s+t|\s+terminal)?$/i.test(command.trim());
}

export function requiresPrivilegedIosCommand(line: string): boolean {
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

export function isExplicitConfigWrapperCommand(line: string): boolean {
  const cmd = normalizeIosCommand(line);
  return isConfigureTerminal(cmd) || cmd === "end";
}

export function isReadOnlyExecCommand(line: string): boolean {
  const cmd = normalizeIosCommand(line);

  return (
    /^show\b/.test(cmd) ||
    /^ping\b/.test(cmd) ||
    /^traceroute\b/.test(cmd) ||
    /^trace\b/.test(cmd) ||
    /^telnet\b/.test(cmd) ||
    /^ssh\b/.test(cmd) ||
    /^enable\b/.test(cmd) ||
    /^disable\b/.test(cmd) ||
    /^terminal\s+/.test(cmd) ||
    /^dir\b/.test(cmd) ||
    /^more\b/.test(cmd) ||
    /^verify\b/.test(cmd)
  );
}

export function isLongOutputIosShowCommand(line: string): boolean {
  const cmd = normalizeIosCommand(line);

  return (
    /^show\s+interfaces?\b/.test(cmd) ||
    /^show\s+tech-support\b/.test(cmd) ||
    /^show\s+controllers\b/.test(cmd) ||
    /^show\s+logging\b/.test(cmd) ||
    /^show\s+processes\b/.test(cmd) ||
    /^show\s+spanning-tree\b/.test(cmd) ||
    /^show\s+mac\s+address-table\b/.test(cmd) ||
    /^show\s+ip\s+route\b/.test(cmd)
  );
}

export function shouldPrepareLongOutputShow(
  options: BuildUniversalTerminalPlanOptions,
  lines: string[],
): boolean {
  if (options.deviceKind !== "ios") return false;
  if (options.mode === "raw") return false;
  if (lines.length !== 1) return false;

  return isLongOutputIosShowCommand(lines[0] ?? "");
}

export function buildTerminalTimeoutsForPlan(
  options: BuildUniversalTerminalPlanOptions,
  lines: string[],
): TerminalPlanTimeouts {
  if (shouldPrepareLongOutputShow(options, lines)) {
    return {
      commandTimeoutMs: Math.max(Number(options.timeoutMs ?? 0) || 0, LONG_OUTPUT_SHOW_COMMAND_TIMEOUT_MS),
      stallTimeoutMs: LONG_OUTPUT_SHOW_STALL_TIMEOUT_MS,
    };
  }

  return buildDefaultTerminalTimeouts(options.timeoutMs);
}

export function buildTerminalPoliciesForPlan(
  options: BuildUniversalTerminalPlanOptions,
  lines: string[],
): TerminalPlanPolicies {
  const policies = buildDefaultTerminalPolicies(options);

  if (shouldPrepareLongOutputShow(options, lines)) {
    return {
      ...policies,
      maxPagerAdvances: LONG_OUTPUT_SHOW_MAX_PAGER_ADVANCES,
    };
  }

  return policies;
}

export function buildExecCommandSteps(
  options: BuildUniversalTerminalPlanOptions,
  lines: string[],
  timeouts: TerminalPlanTimeouts,
): TerminalPlanStep[] {
  return lines.map((line) => {
    const longOutputShow = shouldPrepareLongOutputShow(options, lines) && isLongOutputIosShowCommand(line);

    return {
      kind: "command" as const,
      command: line,
      timeout: longOutputShow ? timeouts.commandTimeoutMs : options.timeoutMs,
      allowPager: /^show\s+/i.test(line),
      allowConfirm: Boolean(options.allowConfirm),
    };
  });
}
