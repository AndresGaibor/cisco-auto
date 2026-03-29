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

  constructor(deviceName: string, handler: CommandHandler) {
    this.handler = handler;
    this.state = {
      mode: "user-exec",
      deviceName,
      paging: false,
      awaitingConfirm: false,
    };
  }

  getState(): CliSessionState {
    return { ...this.state };
  }

  getHistory(): CommandHistoryEntry[] {
    return [...this.history];
  }

  execute(command: string): CommandResult {
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

  async ensurePrivileged(): Promise<boolean> {
    if (isPrivilegedMode(this.state.mode)) {
      return true;
    }

    const result = this.execute("enable");
    return result.ok;
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
    return result.ok;
  }

  async handlePaging(): Promise<void> {
    if (!this.state.paging) return;

    while (this.state.paging) {
      const [status, raw] = this.handler.enterCommand(" ");
      const promptState = inferPromptState(raw);

      if (!promptState.paging && promptState.mode !== "unknown") {
        this.state.paging = false;
        this.state.mode = promptState.mode;
      }
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

    return this.execute(command);
  }

  reset(): void {
    this.state = {
      mode: "user-exec",
      deviceName: this.state.deviceName,
      paging: false,
      awaitingConfirm: false,
    };
    this.history = [];
  }
}

export function createCliSession(deviceName: string, handler: CommandHandler): CliSession {
  return new CliSession(deviceName, handler);
}
