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

function isExplicitConfigWrapperCommand(line: string): boolean {
  const cmd = normalizeIosCommand(line);
  return isConfigureTerminal(cmd) || cmd === "end";
}

function isReadOnlyExecCommand(line: string): boolean {
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

function isPrivilegedExecCommand(line: string): boolean {
  const cmd = normalizeIosCommand(line);

  return (
    /^write\b/.test(cmd) ||
    /^copy\b/.test(cmd) ||
    /^erase\b/.test(cmd) ||
    /^reload\b/.test(cmd) ||
    /^clear\b/.test(cmd) ||
    /^debug\b/.test(cmd) ||
    /^undebug\b/.test(cmd)
  );
}

function isConfigParentCommand(line: string): boolean {
  const cmd = normalizeIosCommand(line);

  return (
    /^interface\s+\S+/.test(cmd) ||
    /^vlan\s+\d+/.test(cmd) ||
    /^router\s+\S+/.test(cmd) ||
    /^line\s+\S+/.test(cmd) ||
    /^ip\s+access-list\s+/.test(cmd) ||
    /^class-map\b/.test(cmd) ||
    /^policy-map\b/.test(cmd) ||
    /^ip\s+dhcp\s+pool\s+\S+/.test(cmd)
  );
}

function isGlobalConfigCommand(line: string): boolean {
  const cmd = normalizeIosCommand(line);

  return (
    /^hostname\s+\S+/.test(cmd) ||
    /^vlan\s+\d+/.test(cmd) ||
    /^no\s+vlan\s+\d+/.test(cmd) ||
    /^ip\s+route\s+/.test(cmd) ||
    /^ipv6\s+route\s+/.test(cmd) ||
    /^ip\s+default-gateway\s+/.test(cmd) ||
    /^ip\s+domain-name\s+/.test(cmd) ||
    /^ip\s+name-server\s+/.test(cmd) ||
    /^ip\s+routing$/.test(cmd) ||
    /^no\s+ip\s+routing$/.test(cmd) ||
    /^no\s+ip\s+domain-lookup$/.test(cmd) ||
    /^spanning-tree\s+/.test(cmd) ||
    /^username\s+/.test(cmd) ||
    /^enable\s+(secret|password)\s+/.test(cmd) ||
    /^service\s+/.test(cmd) ||
    /^no\s+service\s+/.test(cmd) ||
    /^banner\s+/.test(cmd) ||
    /^logging\s+/.test(cmd) ||
    /^snmp-server\s+/.test(cmd) ||
    /^ntp\s+/.test(cmd) ||
    /^aaa\s+/.test(cmd) ||
    /^access-list\s+/.test(cmd) ||
    /^vtp\s+/.test(cmd)
  );
}

function isSubmodeConfigCommand(line: string): boolean {
  const cmd = normalizeIosCommand(line);

  return (
    /^description\b/.test(cmd) ||
    /^shutdown$/.test(cmd) ||
    /^no\s+shutdown$/.test(cmd) ||
    /^switchport\s+/.test(cmd) ||
    /^channel-group\s+/.test(cmd) ||
    /^encapsulation\s+/.test(cmd) ||
    /^ip\s+address\s+/.test(cmd) ||
    /^ipv6\s+address\s+/.test(cmd) ||
    /^duplex\s+/.test(cmd) ||
    /^speed\s+/.test(cmd) ||
    /^name\s+/.test(cmd) ||
    /^network\s+/.test(cmd) ||
    /^default-router\s+/.test(cmd) ||
    /^dns-server\s+/.test(cmd) ||
    /^lease\s+/.test(cmd) ||
    /^login\b/.test(cmd) ||
    /^password\s+/.test(cmd) ||
    /^transport\s+input\s+/.test(cmd) ||
    /^exec-timeout\s+/.test(cmd) ||
    /^passive-interface\s+/.test(cmd) ||
    /^neighbor\s+/.test(cmd)
  );
}

function shouldAutoWrapIosConfig(
  options: BuildUniversalTerminalPlanOptions,
  lines: string[],
): boolean {
  if (options.deviceKind !== "ios") return false;
  if (options.mode === "raw") return false;
  if (lines.length === 0) return false;

  const normalized = lines.map(normalizeIosCommand);

  if (normalized.some(isExplicitConfigWrapperCommand)) return false;

  if (normalized.every((line) => isReadOnlyExecCommand(line) || isPrivilegedExecCommand(line))) {
    return false;
  }

  const hasParent = normalized.some(isConfigParentCommand);
  const hasGlobalConfig = normalized.some(isGlobalConfigCommand);
  const hasSubmodeConfig = normalized.some(isSubmodeConfigCommand);

  if (hasGlobalConfig || hasParent) return true;

  if (hasSubmodeConfig && hasParent) return true;

  return false;
}

function buildAutoConfigSteps(lines: string[]): TerminalPlanStep[] {
  const configLines = lines
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  const last = normalizeIosCommand(configLines.at(-1) ?? "");
  const result: TerminalPlanStep[] = [
    {
      kind: "command",
      command: "configure terminal",
      metadata: {
        autoConfig: true,
        internal: true,
        autoWrapper: "configure-terminal",
      },
    },
    ...configLines.map((line) => ({
      kind: "command" as const,
      command: line,
      metadata: {
        autoConfig: true,
        originalLineCount: configLines.length,
        userCommand: true,
      },
    })),
  ];

  if (last !== "end") {
    result.push({
      kind: "command",
      command: "end",
      metadata: {
        autoConfig: true,
        internal: true,
        autoWrapper: "end",
      },
    });
  }

  return result;
}

function shouldPrependEnable(options: BuildUniversalTerminalPlanOptions, lines: string[]): boolean {
  if (options.deviceKind !== "ios") return false;
  if (options.mode === "raw") return false;
  if (lines.some(isEnableCommand)) return false;

  return lines.some(requiresPrivilegedIosCommand);
}

function inferIosTargetMode(
  lines: string[],
  options: BuildUniversalTerminalPlanOptions,
): TerminalMode | undefined {
  const normalized = lines.map(normalizeIosCommand);

  if (shouldAutoWrapIosConfig(options, lines)) {
    return "privileged-exec";
  }

  if (normalized.some((line) => isConfigureTerminal(line))) {
    return "privileged-exec";
  }

  if (shouldPrependEnable(options, lines)) {
    return "privileged-exec";
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

  const autoConfig = shouldAutoWrapIosConfig(options, lines);
  const effectiveSteps = autoConfig
    ? buildAutoConfigSteps(lines)
    : lines.map((line) => ({
        kind: "command" as const,
        command: line,
        timeout: options.timeoutMs,
        allowPager: /^show\s+/i.test(line),
        allowConfirm: Boolean(options.allowConfirm),
      }));
  const steps: TerminalPlanStep[] = [];

  if (autoConfig || shouldPrependEnable(options, lines)) {
    steps.push({
      kind: "ensureMode",
      expectMode: "privileged-exec",
      timeout: options.timeoutMs,
      metadata: {
        reason: autoConfig
          ? "auto-enable-for-auto-config"
          : "auto-enable-for-privileged-ios-command",
      },
    });
  }

  steps.push(...effectiveSteps);

  return {
    id: options.id,
    device: options.device,
    targetMode: inferIosTargetMode(lines, options),
    steps,
    timeouts: buildDefaultTerminalTimeouts(options.timeoutMs),
    policies: buildDefaultTerminalPolicies(options),
    metadata: {
      deviceKind: "ios",
      source: "pt-control.terminal-plan-builder",
      lineCount: lines.length,
      effectiveLineCount: effectiveSteps.length,
      autoConfig,
    },
  };
}
