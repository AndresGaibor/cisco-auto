import { Buffer } from "node:buffer";
import type { PromptState, IosMode } from "./prompt-state";
import type { CommandResult } from "./command-result";

export interface CliSessionState extends PromptState {
  paging: boolean;
  awaitingConfirm: boolean;
  awaitingPassword: boolean;
  awaitingDnsLookup: boolean;
  awaitingCopyDestination: boolean;
  awaitingReloadConfirm: boolean;
  awaitingEraseConfirm: boolean;
  desynced: boolean;
}

export interface CommandHistoryEntry {
  command: string;
  result: CommandResult;
  timestamp: number;
}

export interface CliSessionMemoryStats {
  historyEntries: number;
  estimatedBytes: number;
}

export interface SessionHealth {
  desynced: boolean;
  paging: boolean;
  awaitingConfirm: boolean;
  awaitingPassword: boolean;
  awaitingDnsLookup: boolean;
  awaitingCopyDestination: boolean;
  awaitingReloadConfirm: boolean;
  awaitingEraseConfirm: boolean;
  lastCommandAgeMs: number;
  historyEntries: number;
  estimatedBytes: number;
  mode: IosMode;
}

export function createInitialState(deviceName: string): CliSessionState {
  return {
    mode: "user-exec",
    deviceName,
    paging: false,
    awaitingConfirm: false,
    awaitingPassword: false,
    awaitingDnsLookup: false,
    awaitingCopyDestination: false,
    awaitingReloadConfirm: false,
    awaitingEraseConfirm: false,
    desynced: false,
  };
}

export function calculateMemoryStats(history: CommandHistoryEntry[]): CliSessionMemoryStats {
  const estimatedBytes = history.reduce((total, entry) => {
    return total
      + Buffer.byteLength(entry.command, "utf8")
      + Buffer.byteLength(entry.result?.raw ?? "", "utf8");
  }, 0);

  return {
    historyEntries: history.length,
    estimatedBytes,
  };
}

export function calculateSessionHealth(
  state: CliSessionState,
  stats: CliSessionMemoryStats,
  lastCommandTime: number,
): SessionHealth {
  return {
    desynced: state.desynced,
    paging: state.paging,
    awaitingConfirm: state.awaitingConfirm,
    awaitingPassword: state.awaitingPassword,
    awaitingDnsLookup: state.awaitingDnsLookup,
    awaitingCopyDestination: state.awaitingCopyDestination,
    awaitingReloadConfirm: state.awaitingReloadConfirm,
    awaitingEraseConfirm: state.awaitingEraseConfirm,
    lastCommandAgeMs: Date.now() - lastCommandTime,
    historyEntries: stats.historyEntries,
    estimatedBytes: stats.estimatedBytes,
    mode: state.mode,
  };
}

export function isInteractivePrompt(mode: IosMode): boolean {
  return (
    mode === "awaiting-password" ||
    mode === "awaiting-confirm" ||
    mode === "username-prompt" ||
    mode === "login-prompt" ||
    mode === "copy-destination" ||
    mode === "reload-confirm" ||
    mode === "erase-confirm"
  );
}
