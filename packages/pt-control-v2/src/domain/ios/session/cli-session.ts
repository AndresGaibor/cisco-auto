// ============================================================================
// CLI Session - Stateful IOS command execution
// ============================================================================

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
  enterCommand(cmd: string): [number, string];
}

export interface CliSessionOptions {
  /** Timeout for command execution in ms (default: 30000) */
  commandTimeout?: number;
  /** Enable silent timeout detection (default: true) */
  enableSilentTimeout?: boolean;
  /** Password for enable (if required) */
  enablePassword?: string;
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

  /**
   * Check if command timed out due to silence
   */
  private checkSilenceTimeout(): boolean {
    if (!this.options.enableSilentTimeout) return false;
    const elapsed = Date.now() - this.lastCommandTime;
    return elapsed > this.options.commandTimeout;
  }

  /**
   * Execute a command and handle state transitions
   */
  execute(command: string): CommandResult {
    this.lastCommandTime = Date.now();

    const [status, raw] = this.handler.enterCommand(command);
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

    this.history.push({
      command,
      result,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Execute command and accumulate all paging output
   */
  executeAndWait(command: string): CommandResult {
    const result = this.execute(command);

    if (result.paging) {
      this.accumulatePagingOutput(result);
    }

    return result;
  }

  /**
   * Accumulate all paging output until prompt returns
   */
  private accumulatePagingOutput(initialResult: CommandResult): void {
    let accumulatedOutput = initialResult.raw;

    while (this.state.paging) {
      if (this.checkSilenceTimeout()) {
        this.state.paging = false;
        initialResult.error = "Timeout waiting for paging to complete";
        break;
      }

      const [status, raw] = this.handler.enterCommand(" ");
      accumulatedOutput += raw;

      const promptState = inferPromptState(raw);

      if (!promptState.paging && promptState.mode !== "unknown") {
        this.state.paging = false;
        this.state.mode = promptState.mode;
      }

      this.lastCommandTime = Date.now();
    }

    initialResult.raw = accumulatedOutput;
  }

  /**
   * Ensure privileged exec mode, handling enable password if required
   */
  async ensurePrivileged(): Promise<boolean> {
    if (isPrivilegedMode(this.state.mode)) {
      return true;
    }

    const result = this.execute("enable");

    // Check if we're now in privileged mode
    if (isPrivilegedMode(this.state.mode)) {
      return true;
    }

    // If password is required and we have it, send it
    if (this.state.mode === "awaiting-password" && this.options.enablePassword) {
      const passwordResult = this.execute(this.options.enablePassword);
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

    const result = this.execute("configure terminal");
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

      const [status, raw] = this.handler.enterCommand(" ");
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

    const [status, raw] = this.handler.enterCommand("q");
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
    const result = this.execute(cmd);

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

  reset(): void {
    this.state = {
      mode: "user-exec",
      deviceName: this.state.deviceName,
      paging: false,
      awaitingConfirm: false,
    };
    this.history = [];
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
