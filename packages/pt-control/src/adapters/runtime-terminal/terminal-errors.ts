// Terminal error mapping helpers

import type { TerminalPortResult } from "./types.js";

export function buildTerminalTransportFailure(
  message: string,
  evidence?: Record<string, unknown>,
): TerminalPortResult {
  return {
    ok: false,
    output: "",
    status: 1,
    promptBefore: "",
    promptAfter: "",
    modeBefore: "",
    modeAfter: "",
    events: [],
    warnings: [message],
    parsed: {
      ok: false,
      code: "TERMINAL_PLAN_TRANSPORT_FAILED",
      error: message,
    },
    evidence,
    confidence: 0,
  };
}

export function buildTerminalDeferredFailure(
  code: string,
  message: string,
  evidence?: Record<string, unknown>,
): TerminalPortResult {
  return {
    ok: false,
    output: "",
    status: 1,
    promptBefore: "",
    promptAfter: "",
    modeBefore: "",
    modeAfter: "",
    events: [],
    warnings: [message],
    parsed: {
      ok: false,
      code,
      error: message,
    },
    evidence,
    confidence: 0,
  };
}

export function buildTerminalParseFailure(
  message: string,
  evidence?: Record<string, unknown>,
): TerminalPortResult {
  return {
    ok: false,
    output: "",
    status: 1,
    promptBefore: "",
    promptAfter: "",
    modeBefore: "",
    modeAfter: "",
    events: [],
    warnings: [message],
    parsed: {
      ok: false,
      code: "TERMINAL_PARSE_FAILED",
      error: message,
    },
    evidence,
    confidence: 0,
  };
}

export function normalizeCommand(command: string): string {
  return String(command ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function isProbablyConfigChangingCommand(command: string): boolean {
  const cmd = normalizeCommand(command);

  if (!cmd) return false;

  return (
    cmd === "configure terminal" ||
    cmd === "conf t" ||
    cmd === "end" ||
    cmd === "exit" ||
    cmd.startsWith("interface ") ||
    cmd.startsWith("router ") ||
    cmd.startsWith("line ") ||
    cmd.startsWith("vlan ") ||
    cmd.startsWith("ip route ") ||
    cmd.startsWith("no ") ||
    cmd.startsWith("hostname ") ||
    cmd.startsWith("enable secret ") ||
    cmd.startsWith("username ")
  );
}