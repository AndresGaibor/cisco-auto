import { Buffer } from "node:buffer";
import { inferPromptState, isPrivilegedMode, isConfigMode } from "./prompt-state";
import { createErrorResult } from "./command-result";
import type { CommandResult } from "./command-result";
import type { CommandHandler } from "./command-handler";
import type {
  SessionTranscript,
  CommandTranscriptEntry,
} from "./session-transcript";
import {
  type CliSessionState,
  type CommandHistoryEntry,
  type CliSessionMemoryStats,
  type SessionHealth,
  createInitialState,
  calculateMemoryStats,
  calculateSessionHealth,
  isInteractivePrompt,
} from "./cli-session-state";
import {
  processCommandOutput,
  updateStateFromResult,
  maintainHistory,
} from "./cli-session-utils";
import { InteractiveStateHandler } from "./cli-session-handlers";

export type { CommandHandler };
export type { CliSessionState, CommandHistoryEntry, CliSessionMemoryStats, SessionHealth };

export interface CliSessionOptions {
  commandTimeout?: number;
  enableSilentTimeout?: boolean;
  enablePassword?: string;
  maxHistorySize?: number;
  maxPagingBufferBytes?: number;
}

const DEFAULT_MAX_HISTORY = 500;
const DEFAULT_MAX_PAGING_BUFFER = 1024 * 1024; // 1MB

export class CliSession {
  private state: CliSessionState;
  private handler: CommandHandler;
  private history: CommandHistoryEntry[] = [];
  private options: Required<CliSessionOptions>;
  private lastCommandTime: number = 0;
  private desyncReason?: string;
  private interactiveHandler: InteractiveStateHandler;

  constructor(deviceName: string, handler: CommandHandler, options: CliSessionOptions = {}) {
    this.handler = handler;
    this.options = {
      commandTimeout: options.commandTimeout ?? 30000,
      enableSilentTimeout: options.enableSilentTimeout ?? true,
      enablePassword: options.enablePassword ?? "",
      maxHistorySize: options.maxHistorySize ?? DEFAULT_MAX_HISTORY,
      maxPagingBufferBytes: options.maxPagingBufferBytes ?? DEFAULT_MAX_PAGING_BUFFER,
    };
    this.state = createInitialState(deviceName);
    this.lastCommandTime = Date.now();
    this.interactiveHandler = new InteractiveStateHandler(
      this.state,
      handler,
      this.options.enablePassword,
      () => this.checkSilenceTimeout(),
    );
  }

  getState(): CliSessionState {
    return { ...this.state };
  }

  getHistory(): CommandHistoryEntry[] {
    return [...this.history];
  }

  getHealth(): SessionHealth {
    const stats = this.getMemoryStats();
    return calculateSessionHealth(this.state, stats, this.lastCommandTime);
  }

  private checkSilenceTimeout(): boolean {
    if (!this.options.enableSilentTimeout) return false;
    const elapsed = Date.now() - this.lastCommandTime;
    return elapsed > this.options.commandTimeout;
  }

  async execute(command: string): Promise<CommandResult> {
    this.lastCommandTime = Date.now();
    const modeBefore = this.state.mode;

    const handlerResult = this.handler.enterCommand(command);
    const [status, raw] = handlerResult instanceof Promise ? await handlerResult : handlerResult;

    const result = processCommandOutput(raw, command, status, modeBefore);
    updateStateFromResult(this.state, result);

    if (!result.ok && !result.failedCommand) {
      result.failedCommand = command;
    }

    maintainHistory(
      this.history,
      { command, result, timestamp: Date.now() },
      this.options.maxHistorySize,
    );

    return result;
  }

  async executeAndWait(command: string): Promise<CommandResult> {
    const result = await this.execute(command);

    if (result.awaitingDnsLookup || this.state.awaitingDnsLookup) {
      const resolved = await this.handleDnsLookup();
      if (!resolved) {
        result.classification = "dns-lookup-timeout";
        result.ok = false;
        result.error = "DNS lookup did not resolve in time";
      }
    }

    if (result.paging || this.state.paging) {
      await this.accumulatePagingOutput(result);
    }

    return result;
  }

  private async accumulatePagingOutput(initialResult: CommandResult): Promise<void> {
    let accumulatedOutput = initialResult.raw;
    let totalBytes = Buffer.byteLength(accumulatedOutput, "utf8");
    const maxBytes = this.options.maxPagingBufferBytes;
    let truncated = false;

    while (this.state.paging) {
      if (this.checkSilenceTimeout()) {
        this.state.paging = false;
        initialResult.error = initialResult.error ?? "Timeout waiting for paging to complete";
        initialResult.truncated = true;
        break;
      }

      const [, raw] = await this.handler.enterCommand(" ");
      accumulatedOutput += raw;
      totalBytes += Buffer.byteLength(raw, "utf8");

      if (maxBytes > 0 && totalBytes > maxBytes) {
        truncated = true;
        accumulatedOutput += `\n... [OUTPUT TRUNCATED: exceeded ${(maxBytes / 1024).toFixed(0)}KB limit] ...\n`;
        try {
          await this.handler.enterCommand("q");
        } catch {
          // ignore attempts to exit paging
        }
        this.state.paging = false;
        break;
      }

      const promptState = inferPromptState(raw);
      if (promptState.mode === "paging") {
        this.state.paging = true;
      } else {
        this.state.paging = false;
        if (promptState.mode !== "unknown") {
          this.state.mode = promptState.mode;
        }
      }

      this.lastCommandTime = Date.now();
    }

    initialResult.raw = accumulatedOutput;
    if (truncated) {
      initialResult.truncated = true;
    }
  }

  async handleDnsLookup(): Promise<boolean> {
    if (!this.state.awaitingDnsLookup) return true;

    const startedAt = Date.now();
    const maxWaitMs = Math.min(this.options.commandTimeout, 5000);

    while (this.state.awaitingDnsLookup) {
      if (Date.now() - startedAt > maxWaitMs) {
        this.state.awaitingDnsLookup = false;
        this.state.mode = "unknown";
        this.state.desynced = true;
        this.desyncReason = "DNS lookup timeout";
        return false;
      }

      const [, raw] = await this.handler.enterCommand("");
      const promptState = inferPromptState(raw);

      if (promptState.mode !== "resolving-hostname") {
        this.state.awaitingDnsLookup = false;
        if (promptState.mode !== "unknown") {
          this.state.mode = promptState.mode;
          this.state.desynced = false;
          this.desyncReason = undefined;
        }
        return true;
      }
    }

    return true;
  }

  async resyncPrompt(): Promise<void> {
    const [, raw] = await this.handler.enterCommand("");
    const promptState = inferPromptState(raw);

    this.state.awaitingConfirm = false;
    this.state.paging = false;
    this.state.awaitingDnsLookup = false;

    if (promptState.mode !== "unknown") {
      this.state.mode = promptState.mode;
      this.state.desynced = false;
      this.desyncReason = undefined;
    } else {
      this.state.desynced = true;
      this.desyncReason = "Could not determine prompt after resync";
    }

    if (promptState.deviceName) {
      this.state.deviceName = promptState.deviceName;
    }
  }

  markDesynced(reason: string): void {
    this.state.desynced = true;
    this.desyncReason = reason;
  }

  async recoverFromUnknownState(): Promise<boolean> {
    if (!this.state.desynced && this.state.mode !== "unknown") {
      return true;
    }

    await this.resyncPrompt();

    if (this.state.mode === "unknown") {
      try {
        await this.handler.enterCommand("end");
        await this.resyncPrompt();
      } catch {}
    }

    if (this.state.mode === "unknown") {
      try {
        await this.handler.enterCommand("disable");
        await this.resyncPrompt();
      } catch {}
    }

    if (this.state.mode === "unknown") {
      try {
        await this.handler.enterCommand("\x03");
        await this.resyncPrompt();
      } catch {}
    }

    return this.state.mode !== "unknown" && !this.state.desynced;
  }

  async ensurePrivileged(): Promise<boolean> {
    return this.interactiveHandler.ensurePrivileged();
  }

  async ensureConfigMode(): Promise<boolean> {
    return this.interactiveHandler.ensureConfigMode();
  }

  async enterConfigCommand(command: string): Promise<CommandResult> {
    return this.interactiveHandler.enterConfigCommand(command);
  }

  async handlePaging(): Promise<void> {
    return this.interactiveHandler.handlePaging();
  }

  async continuePaging(): Promise<void> {
    return this.interactiveHandler.continuePaging();
  }

  async handleConfirmation(confirm: boolean): Promise<boolean> {
    return this.interactiveHandler.handleConfirmation(confirm);
  }

  async handleCopyDestination(filename = ""): Promise<boolean> {
    return this.interactiveHandler.handleCopyDestination(filename);
  }

  async handleReloadConfirm(confirm: boolean): Promise<boolean> {
    return this.interactiveHandler.handleReloadConfirm(confirm);
  }

  async handleEraseConfirm(confirm = false): Promise<boolean> {
    return this.interactiveHandler.handleEraseConfirm(confirm);
  }

  clearHistory(): void {
    this.history = [];
  }

  getMemoryStats(): CliSessionMemoryStats {
    return calculateMemoryStats(this.history);
  }

  reset(): void {
    try { this.handler.enterCommand("end"); } catch {}
    try { this.handler.enterCommand("disable"); } catch {}

    this.state = createInitialState(this.state.deviceName ?? "unknown");
    this.desyncReason = undefined;
    this.clearHistory();
    this.lastCommandTime = Date.now();
  }

  exportTranscript(): SessionTranscript {
    const deviceName = this.state.deviceName ?? "unknown";
    const entries: CommandTranscriptEntry[] = this.history.map((entry) => ({
      command: entry.command,
      raw: entry.result.raw,
      modeBefore: entry.result.modeBefore ?? "unknown",
      modeAfter: entry.result.modeAfter ?? "unknown",
      classification: entry.result.classification ?? "unknown",
      ok: entry.result.ok,
      durationMs: entry.timestamp ? entry.timestamp - this.lastCommandTime : 0,
      truncated: entry.result.truncated,
      source: "terminal" as const,
      sessionId: deviceName,
      timestamp: entry.timestamp,
      error: entry.result.error,
      warnings: entry.result.warnings,
    }));

    const allWarnings = entries.flatMap((e) => e.warnings ?? []);

    return {
      sessionId: deviceName,
      device: deviceName,
      entries,
      modeFinal: this.state.mode,
      desynced: this.state.desynced,
      lastError: this.desyncReason,
      warnings: allWarnings,
      startedAt: entries[0]?.timestamp ?? Date.now(),
      endedAt: entries[entries.length - 1]?.timestamp,
    };
  }
}

export function createCliSession(
  deviceName: string,
  handler: CommandHandler,
  options?: CliSessionOptions
): CliSession {
  return new CliSession(deviceName, handler, options);
}
