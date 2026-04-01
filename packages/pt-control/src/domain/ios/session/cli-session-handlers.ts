import { inferPromptState, isPrivilegedMode, isConfigMode } from "./prompt-state";
import { createErrorResult } from "./command-result";
import type { CommandResult } from "./command-result";
import type { CommandHandler } from "./command-handler";
import type { CliSessionState } from "./cli-session-state";

export class InteractiveStateHandler {
  constructor(
    private state: CliSessionState,
    private handler: CommandHandler,
    private enablePassword: string,
    private checkSilenceTimeout: () => boolean,
  ) {}

  async ensurePrivileged(): Promise<boolean> {
    if (isPrivilegedMode(this.state.mode)) {
      return true;
    }

    const result = await this.execute("enable");

    if (isPrivilegedMode(this.state.mode)) {
      return true;
    }

    if (this.state.mode === "awaiting-password" && this.enablePassword) {
      await this.execute(this.enablePassword);
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

  async enterConfigCommand(command: string): Promise<CommandResult> {
    const configResult = await this.ensureConfigMode();
    if (!configResult) {
      return createErrorResult("Failed to enter config mode");
    }

    return this.executeAndWait(command);
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

  async handleCopyDestination(filename = ""): Promise<boolean> {
    if (!this.state.awaitingCopyDestination) {
      return true;
    }

    const cmd = filename || "\n";
    const result = await this.execute(cmd);

    this.state.awaitingCopyDestination = false;
    return result.ok;
  }

  async handleReloadConfirm(confirm: boolean): Promise<boolean> {
    if (!this.state.awaitingReloadConfirm) {
      return true;
    }

    const cmd = confirm ? "y" : "n";
    const result = await this.execute(cmd);

    this.state.awaitingReloadConfirm = false;
    return result.ok;
  }

  async handleEraseConfirm(confirm = false): Promise<boolean> {
    if (!this.state.awaitingEraseConfirm) {
      return true;
    }

    const cmd = confirm ? "y" : "n";
    const result = await this.execute(cmd);

    this.state.awaitingEraseConfirm = false;
    return result.ok;
  }

  async handlePaging(): Promise<void> {
    if (!this.state.paging) return;

    while (this.state.paging) {
      if (this.checkSilenceTimeout()) {
        this.state.paging = false;
        break;
      }

      const [, raw] = await this.handler.enterCommand(" ");
      const promptState = inferPromptState(raw);

      if (promptState.mode !== "paging" && promptState.mode !== "unknown") {
        this.state.paging = false;
        this.state.mode = promptState.mode;
      }
    }
  }

  async continuePaging(): Promise<void> {
    if (!this.state.paging) return;

    const [, raw] = await this.handler.enterCommand("q");
    const promptState = inferPromptState(raw);

    this.state.paging = false;
    if (promptState.mode !== "unknown") {
      this.state.mode = promptState.mode;
    }
  }

  private async execute(command: string): Promise<CommandResult> {
    const [status, raw] = await Promise.resolve(this.handler.enterCommand(command));

    // Infer prompt state from output to update mode
    const lastLine = raw.trim().split('\n').map(l => l.trim()).filter(Boolean).at(-1) ?? "";
    const promptState = inferPromptState(lastLine);
    if (promptState.mode !== "unknown" && promptState.mode !== "paging") {
      this.state.mode = promptState.mode;
    }

    return { ok: status === 0, raw, status } as CommandResult;
  }

  private async executeAndWait(command: string): Promise<CommandResult> {
    const result = await this.execute(command);
    if (this.state.paging) {
      while (this.state.paging && !this.checkSilenceTimeout()) {
        const [, raw] = await this.handler.enterCommand(" ");
        result.raw += raw;
        const promptState = inferPromptState(raw);
        if (promptState.mode !== "paging") {
          this.state.paging = false;
        }
      }
    }
    return result;
  }
}
