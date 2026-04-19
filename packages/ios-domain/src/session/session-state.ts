/**
 * CLI SESSION - HISTORY AND STATE MANAGEMENT
 * 
 * Manejo del historial y estado de sesiones CLI
 */

export interface CommandResult {
  ok: boolean;
  output: string;
  status: number;
  mode: string;
  paging: boolean;
  rawOutput: string;
}

export interface CommandHistoryEntry {
  command: string;
  result: CommandResult;
  timestamp: number;
}

export interface CliSessionState {
  paging: boolean;
  awaitingConfirm: boolean;
  awaitingPassword: boolean;
  mode: string;
  prompt: string;
  lastCommandTime: number;
  timeout: number;
  commandCount: number;
}

export class CliSessionHistory {
  private entries: CommandHistoryEntry[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;
  }

  addEntry(command: string, result: CommandResult): void {
    this.entries.push({
      command,
      result,
      timestamp: Date.now(),
    });

    // Mantener límite de tamaño
    if (this.entries.length > this.maxSize) {
      this.entries = this.entries.slice(-this.maxSize);
    }
  }

  getEntries(): CommandHistoryEntry[] {
    return [...this.entries];
  }

  getLastEntry(): CommandHistoryEntry | undefined {
    return this.entries[this.entries.length - 1];
  }

  getLastCommand(): string | undefined {
    return this.entries[this.entries.length - 1]?.command;
  }

  findCommand(query: string): CommandHistoryEntry[] {
    return this.entries.filter(entry =>
      entry.command.includes(query)
    );
  }

  clear(): void {
    this.entries = [];
  }

  getSize(): number {
    return this.entries.length;
  }
}

export class CliSessionStateManager {
  private state: CliSessionState = {
    paging: false,
    awaitingConfirm: false,
    awaitingPassword: false,
    mode: 'user-exec',
    prompt: '>',
    lastCommandTime: 0,
    timeout: 30000,
    commandCount: 0,
  };

  getState(): CliSessionState {
    return { ...this.state };
  }

  updateState(partial: Partial<CliSessionState>): void {
    this.state = { ...this.state, ...partial };
  }

  setPaging(enabled: boolean): void {
    this.state.paging = enabled;
  }

  setAwaitingConfirm(awaiting: boolean): void {
    this.state.awaitingConfirm = awaiting;
  }

  setAwaitingPassword(awaiting: boolean): void {
    this.state.awaitingPassword = awaiting;
  }

  setMode(mode: string): void {
    this.state.mode = mode;
  }

  setPrompt(prompt: string): void {
    this.state.prompt = prompt;
  }

  incrementCommandCount(): void {
    this.state.commandCount++;
    this.state.lastCommandTime = Date.now();
  }

  isInConfigMode(): boolean {
    return this.state.mode.includes('config');
  }

  isInPrivilegedMode(): boolean {
    return this.state.mode.includes('exec');
  }

  reset(): void {
    this.state = {
      paging: false,
      awaitingConfirm: false,
      awaitingPassword: false,
      mode: 'user-exec',
      prompt: '>',
      lastCommandTime: 0,
      timeout: 30000,
      commandCount: 0,
    };
  }
}
