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
  const raw = command.trim();
  const cmd = raw.toLowerCase();
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
    profile.preserveCurrentMode = true;
    profile.ensurePrivileged = false;
    profile.risk = "changes-state";
    return profile;
  }

  if (cmd.startsWith("line ")) {
    profile.intent = "config-submode";
    profile.expectedMode = "config-line";
    profile.preserveCurrentMode = true;
    profile.ensurePrivileged = false;
    profile.risk = "changes-state";
    return profile;
  }

  if (cmd.startsWith("router ")) {
    profile.intent = "config-submode";
    profile.expectedMode = "config-router";
    profile.preserveCurrentMode = true;
    profile.ensurePrivileged = false;
    profile.risk = "changes-state";
    return profile;
  }

  if (/^vlan \d+$/.test(cmd)) {
    profile.intent = "config-submode";
    profile.expectedMode = "config-vlan";
    profile.preserveCurrentMode = true;
    profile.ensurePrivileged = false;
    profile.risk = "changes-state";
    return profile;
  }

  if (cmd === "exit") {
    profile.intent = "config-exit";
    profile.preserveCurrentMode = true;
    profile.ensurePrivileged = false;
    profile.risk = "changes-state";
    return profile;
  }

  if (cmd === "disable") {
    profile.intent = "config-exit";
    profile.expectedMode = "user-exec";
    profile.preserveCurrentMode = false;
    profile.ensurePrivileged = true;
    profile.allowPager = false;
    profile.allowConfirm = false;
    profile.allowEmptyOutput = true;
    profile.semanticCheck = "ios";
    profile.risk = "safe";
    profile.timeoutMs = 15000;
    profile.stallTimeoutMs = 8000;
    return profile;
  }

  if (cmd === "end" || cmd === "^z" || cmd === "ctrl+z") {
    profile.intent = "config-exit";
    profile.expectedMode = "privileged-exec";
    profile.preserveCurrentMode = true;
    profile.ensurePrivileged = false;
    profile.risk = "changes-state";
    return profile;
  }

  if (cmd === "show privilege") {
    profile.intent = "show";
    profile.allowPager = false;
    profile.ensurePrivileged = false;
    profile.preserveCurrentMode = true;
    profile.risk = "safe";
    profile.timeoutMs = 15000;
    profile.stallTimeoutMs = 8000;
    return profile;
  }

  if (cmd.startsWith("show ") || cmd.startsWith("do show ")) {
    // Команды show которые безопасно работают в user EXEC
    const safeUserExecShows = [
      "show clock",
      "show version",
      "show interfaces",
      "show ip interface brief",
      "show cdp neighbors",
      "show mac address-table",
      "show ip route",
      "show protocols",
      "show users",
      "show sessions",
      "show line",
    ];

    const isSafeUserExecShow = safeUserExecShows.some(
      (safe) => cmd === safe || cmd.startsWith(safe + " "),
    );

    if (isSafeUserExecShow) {
      profile.intent = "show";
      profile.allowPager = true;
      profile.ensurePrivileged = false;
      profile.preserveCurrentMode = true;
      profile.risk = "safe";
      profile.timeoutMs = 30000;
      profile.stallTimeoutMs = 15000;
      return profile;
    }

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

    if (
      runningConfigCommands.some((c) => cmd === c || cmd.startsWith(c + " ")) ||
      techCommands.some((c) => cmd === c || cmd.startsWith(c + " ")) ||
      loggingCommands.some((c) => cmd === c || cmd.startsWith(c + " "))
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
  const raw = command.trim();
  const cmd = raw.toLowerCase();
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