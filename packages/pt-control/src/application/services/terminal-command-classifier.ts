// CommandClassifier — Clasifica comandos IOS y Host para el terminal engine
// Fase 2 del refactor de terminal: extracción de lógica de clasificación

import type { TerminalMode } from "../../ports/runtime-terminal-port.js";

export type TerminalDeviceKind = "ios" | "host" | "unknown";

export type CommandIntent =
  | "show"
  | "config-enter"
  | "config-exit"
  | "config-submode"
  | "config-command"
  | "network-test"
  | "copy-save"
  | "destructive"
  | "interactive-auth"
  | "host-info"
  | "host-network-test"
  | "unknown";

export interface CommandProfile {
  deviceKind: TerminalDeviceKind;
  intent: CommandIntent;
  expectedMode?: TerminalMode;
  preserveCurrentMode: boolean;
  ensurePrivileged: boolean;
  allowPager: boolean;
  allowConfirm: boolean;
  autoConfirmText?: string;
  timeoutMs: number;
  stallTimeoutMs: number;
  allowEmptyOutput: boolean;
  semanticCheck: "ios" | "host" | "none";
  risk: "safe" | "changes-state" | "destructive";
}

function baseProfile(): CommandProfile {
  return {
    deviceKind: "unknown",
    intent: "unknown",
    preserveCurrentMode: false,
    ensurePrivileged: false,
    allowPager: false,
    allowConfirm: false,
    timeoutMs: 30000,
    stallTimeoutMs: 8000,
    allowEmptyOutput: false,
    semanticCheck: "none",
    risk: "changes-state",
  };
}

export function classifyIosCommand(command: string): CommandProfile {
  const cmd = command.trim();
  const profile = baseProfile();
  profile.deviceKind = "ios";

  if (cmd === "conf t" || cmd === "configure terminal") {
    profile.intent = "config-enter";
    profile.expectedMode = "global-config";
    profile.ensurePrivileged = true;
    profile.risk = "changes-state";
    return profile;
  }

  if (cmd.startsWith("interface ")) {
    profile.intent = "config-submode";
    profile.expectedMode = "config-if";
    profile.ensurePrivileged = true;
    profile.risk = "changes-state";
    return profile;
  }

  if (cmd.startsWith("line ")) {
    profile.intent = "config-submode";
    profile.expectedMode = "config-line";
    profile.ensurePrivileged = true;
    profile.risk = "changes-state";
    return profile;
  }

  if (cmd.startsWith("router ")) {
    profile.intent = "config-submode";
    profile.expectedMode = "config-router";
    profile.ensurePrivileged = true;
    profile.risk = "changes-state";
    return profile;
  }

  if (/^vlan \d+$/.test(cmd)) {
    profile.intent = "config-submode";
    profile.expectedMode = "config-vlan";
    profile.ensurePrivileged = true;
    profile.risk = "changes-state";
    return profile;
  }

  if (cmd === "exit") {
    profile.intent = "config-exit";
    profile.preserveCurrentMode = true;
    profile.ensurePrivileged = true;
    profile.risk = "changes-state";
    return profile;
  }

  if (cmd === "end" || cmd === "^z" || cmd === "Ctrl+z") {
    profile.intent = "config-exit";
    profile.expectedMode = "privileged-exec";
    profile.ensurePrivileged = true;
    profile.risk = "changes-state";
    return profile;
  }

  if (cmd.startsWith("show ") || cmd.startsWith("do show ")) {
    profile.intent = "show";
    profile.allowPager = true;
    profile.ensurePrivileged = !cmd.startsWith("do ");
    profile.risk = "safe";

    const runningConfigCommands = [
      "show running-config",
      "show running-config",
      "show run",
      "show startup-config",
      "show startup",
    ];
    const techCommands = ["show tech-support", "show tech"];
    const loggingCommands = [
      "show logging",
      "show log",
      "show logg",
    ];

    const lowerCmd = cmd.toLowerCase();
    if (
      runningConfigCommands.some((c) => lowerCmd === c || lowerCmd.startsWith(c + " ")) ||
      techCommands.some((c) => lowerCmd === c || lowerCmd.startsWith(c + " ")) ||
      loggingCommands.some((c) => lowerCmd === c || lowerCmd.startsWith(c + " "))
    ) {
      profile.timeoutMs = 60000;
      profile.stallTimeoutMs = 15000;
    }

    return profile;
  }

  if (
    cmd === "copy running-config startup-config" ||
    cmd === "write memory" ||
    cmd === "copy run start"
  ) {
    profile.intent = "copy-save";
    profile.expectedMode = "privileged-exec";
    profile.allowConfirm = true;
    profile.ensurePrivileged = true;
    profile.risk = "changes-state";
    profile.timeoutMs = 45000;
    return profile;
  }

  const destructiveCommands = ["reload", "erase", "delete", "format", "wr erase"];
  if (destructiveCommands.some((d) => cmd === d || cmd.startsWith(d + " "))) {
    profile.intent = "destructive";
    profile.ensurePrivileged = true;
    profile.risk = "destructive";
    profile.timeoutMs = 60000;
    return profile;
  }

  if (cmd === "ping" || cmd.startsWith("ping ")) {
    profile.intent = "network-test";
    profile.risk = "safe";
    profile.timeoutMs = 60000;
    return profile;
  }

  if (cmd === "traceroute" || cmd.startsWith("traceroute ")) {
    profile.intent = "network-test";
    profile.risk = "safe";
    profile.timeoutMs = 120000;
    return profile;
  }

  profile.intent = "unknown";
  profile.risk = "changes-state";
  return profile;
}

export function classifyHostCommand(command: string): CommandProfile {
  const cmd = command.trim();
  const profile = baseProfile();
  profile.deviceKind = "host";

  if (cmd === "ipconfig" || cmd === "ipconfig /all" || cmd.startsWith("ipconfig ")) {
    profile.intent = "host-info";
    profile.risk = "safe";
    profile.timeoutMs = 15000;
    profile.allowEmptyOutput = true;
    return profile;
  }

  if (cmd === "ping" || cmd.startsWith("ping ")) {
    profile.intent = "host-network-test";
    profile.risk = "safe";
    profile.timeoutMs = 60000;
    return profile;
  }

  if (cmd === "tracert" || cmd.startsWith("tracert ")) {
    profile.intent = "host-network-test";
    profile.risk = "safe";
    profile.timeoutMs = 120000;
    return profile;
  }

  const infoCommands = ["nslookup", "arp", "netstat", "arp -a", "netstat -a", "nslookup "];
  if (infoCommands.some((c) => cmd === c || cmd.startsWith(c))) {
    profile.intent = "host-info";
    profile.risk = "safe";
    profile.timeoutMs = 30000;
    profile.allowEmptyOutput = true;
    return profile;
  }

  profile.intent = "unknown";
  profile.risk = "safe";
  return profile;
}