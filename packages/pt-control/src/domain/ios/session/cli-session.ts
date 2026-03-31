// ============================================================================
// CLI Session - Stateful IOS command execution
// ============================================================================

import { Buffer } from "node:buffer";
import {
  inferPromptState,
  type IosMode,
  type PromptState,
  isPrivilegedMode,
  isConfigMode,
  needsResponse,
} from "./prompt-state";
import {
  type CommandResult,
  createSuccessResult,
  createErrorResult,
  isPagingResult,
  isPasswordPrompt,
  isConfirmPrompt,
} from "./command-result";

export interface CommandHandler {
  enterCommand(cmd: string): [number, string] | Promise<[number, string]>;
}

export interface CliSessionOptions {
  /** Timeout for command execution in ms (default: 30000) */
  commandTimeout?: number;
  /** Enable silent timeout detection (default: true) */
  enableSilentTimeout?: boolean;
  /** Password for enable (if required) */
  enablePassword?: string;
  /** Max in-memory history entries (default: 500) */
  maxHistorySize?: number;
  /** Max bytes of paging output to accumulate before truncating (default: 1MB) */
  maxPagingBufferBytes?: number;
}

export interface CommandHistoryEntry {
  command: string;
  result: CommandResult;
  timestamp: number;
}

export interface CliSessionState extends PromptState {
  paging: boolean;
  awaitingConfirm: boolean;
}

export interface CliSessionMemoryStats {
  historyEntries: number;
  estimatedBytes: number;
}

const DEFAULT_MAX_HISTORY = 500;
const DEFAULT_MAX_PAGING_BUFFER = 1024 * 1024; // 1MB

export class CliSession {
  private state: CliSessionState;
  private handler: CommandHandler;
  private history: CommandHistoryEntry[] = [];
  private options: Required<CliSessionOptions>;
  private lastCommandTime: number = 0;

  constructor(deviceName: string, handler: CommandHandler, options: CliSessionOptions = {}) {
    this.handler = handler;
    this.options = {
      commandTimeout: options.commandTimeout ?? 30000,
      enableSilentTimeout: options.enableSilentTimeout ?? true,
      enablePassword: options.enablePassword ?? "",
      maxHistorySize: options.maxHistorySize ?? DEFAULT_MAX_HISTORY,
      maxPagingBufferBytes: options.maxPagingBufferBytes ?? DEFAULT_MAX_PAGING_BUFFER,
    };
    this.state = {
      mode: "user-exec",
      deviceName,
      paging: false,
      awaitingConfirm: false,
    };
    this.lastCommandTime = Date.now();
  }

  getState(): CliSessionState {
    return { ...this.state };
  }

  getHistory(): CommandHistoryEntry[] {
    return [...this.history];
  }

  private addToHistory(entry: CommandHistoryEntry): void {
    this.history.push(entry);

    const maxSize = this.options.maxHistorySize;
    if (maxSize <= 0) {
      return;
    }

    if (this.history.length > maxSize) {
      const removeCount = Math.max(1, Math.floor(maxSize * 0.2));
      this.history.splice(0, removeCount);
    }
  }

  /**
   * Check if command timed out due to silence
   */
  private checkSilenceTimeout(): boolean {
    if (!this.options.enableSilentTimeout) return false;
    const elapsed = Date.now() - this.lastCommandTime;
    return elapsed > this.options.commandTimeout;
  }

  /**
   * Execute a command and handle state transitions (async for bridge-backed handlers)
   */
  async execute(command: string): Promise<CommandResult> {
    this.lastCommandTime = Date.now();

    const handlerResult = this.handler.enterCommand(command);
    const [status, raw] = handlerResult instanceof Promise ? await handlerResult : handlerResult;
    const promptState = inferPromptState(raw);

    const result: CommandResult = {
      ok: status === 0,
      raw,
      status,
    };

    if (promptState.mode === "paging") {
      result.paging = true;
      this.state.paging = true;
    } else {
      this.state.paging = false;
    }

    if (promptState.mode === "awaiting-confirm") {
      result.awaitingConfirm = true;
      this.state.awaitingConfirm = true;
    } else {
      this.state.awaitingConfirm = false;
    }

    if (promptState.mode === "awaiting-password") {
      // Password prompt detected - this is an error if we don't have a password
      if (!this.options.enablePassword) {
        result.error = "Enable password required but not provided";
      }
    }

    if (promptState.mode !== "unknown" && promptState.mode !== "paging" && promptState.mode !== "awaiting-password") {
      this.state.mode = promptState.mode;
    }

    if (promptState.deviceName) {
      this.state.deviceName = promptState.deviceName;
    }

    this.addToHistory({
      command,
      result,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Execute command and accumulate all paging output
   */
  async executeAndWait(command: string): Promise<CommandResult> {
    const result = await this.execute(command);
    if (result.paging) {
      await this.accumulatePagingOutput(result);
    }
    return result;
  }

  /**
   * Accumulate all paging output until prompt returns
   */
  private async accumulatePagingOutput(initialResult: CommandResult): Promise<void> {
    let accumulatedOutput = initialResult.raw;
    let totalBytes = Buffer.byteLength(accumulatedOutput, "utf8");
    const maxBytes = this.options.maxPagingBufferBytes;
    let truncated = false;

    while (this.state.paging) {
      if (this.checkSilenceTimeout()) {
        this.state.paging = false;
        initialResult.error = "Timeout waiting for paging to complete";
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

      if (!promptState.paging && promptState.mode !== "unknown") {
        this.state.paging = false;
        this.state.mode = promptState.mode;
      }

      this.lastCommandTime = Date.now();
    }

    initialResult.raw = accumulatedOutput;
    if (truncated) {
      initialResult.truncated = true;
    }
  }

  /**
   * Ensure privileged exec mode, handling enable password if required
   */
  async ensurePrivileged(): Promise<boolean> {
    if (isPrivilegedMode(this.state.mode)) {
      return true;
    }

    const result = await this.execute("enable");

    // Check if we're now in privileged mode
    if (isPrivilegedMode(this.state.mode)) {
      return true;
    }

    // If password is required and we have it, send it
    if (this.state.mode === "awaiting-password" && this.options.enablePassword) {
      await this.execute(this.options.enablePassword);
      return isPrivilegedMode(this.state.mode);
    }

    return result.ok && isPrivilegedMode(this.state.mode);
  }

  async ensureConfigMode(): Promise<boolean> {
    if (isConfigMode(this.state.mode)) {
      return true;
    }

    if (!isPrivilegedMode(this.state.mode)) {
      const privResult = await this.ensurePrivileged();
      if (!privResult) return false;
    }

    const result = await this.execute("configure terminal");
    return result.ok && isConfigMode(this.state.mode);
  }

  /**
   * Handle paging by sending spaces until all output is shown
   * @deprecated Use executeAndWait() instead for automatic paging accumulation
   */
  async handlePaging(): Promise<void> {
    if (!this.state.paging) return;

    while (this.state.paging) {
      if (this.checkSilenceTimeout()) {
        this.state.paging = false;
        break;
      }

      const [status, raw] = await this.handler.enterCommand(" ");
      const promptState = inferPromptState(raw);

      if (!promptState.paging && promptState.mode !== "unknown") {
        this.state.paging = false;
        this.state.mode = promptState.mode;
      }

      this.lastCommandTime = Date.now();
    }
  }

  async continuePaging(): Promise<void> {
    if (!this.state.paging) return;

    const [status, raw] = await this.handler.enterCommand("q");
    const promptState = inferPromptState(raw);

    this.state.paging = false;
    if (promptState.mode !== "unknown") {
      this.state.mode = promptState.mode;
    }
  }

  async handleConfirmation(confirm: boolean): Promise<boolean> {
    if (!this.state.awaitingConfirm) {
      return true;
    }

    const cmd = confirm ? "\n" : "no";
    const result = await this.execute(cmd);

    this.state.awaitingConfirm = false;
    return result.ok;
  }

  async enterConfigCommand(command: string): Promise<CommandResult> {
    const configResult = await this.ensureConfigMode();
    if (!configResult) {
      return createErrorResult("Failed to enter config mode");
    }

    return this.executeAndWait(command);
  }

  clearHistory(): void {
    this.history = [];
  }

  getMemoryStats(): CliSessionMemoryStats {
    const estimatedBytes = this.history.reduce((total, entry) => {
      return total
        + Buffer.byteLength(entry.command, "utf8")
        + Buffer.byteLength(entry.result?.raw ?? "", "utf8");
    }, 0);

    return {
      historyEntries: this.history.length,
      estimatedBytes,
    };
  }

  reset(): void {
    this.state = {
      mode: "user-exec",
      deviceName: this.state.deviceName,
      paging: false,
      awaitingConfirm: false,
    };
    this.clearHistory();
    this.lastCommandTime = Date.now();
  }
}

export function createCliSession(
  deviceName: string,
  handler: CommandHandler,
  options?: CliSessionOptions
): CliSession {
  return new CliSession(deviceName, handler, options);
}
