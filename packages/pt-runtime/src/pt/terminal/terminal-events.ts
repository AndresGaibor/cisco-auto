// packages/pt-runtime/src/pt/terminal/terminal-events.ts
// Enhanced event types from PT TerminalLine API

export interface TerminalEvent {
  type: "commandStarted" | "outputWritten" | "commandEnded" | "modeChanged" | "promptChanged" | "moreDisplayed";
  device: string;
  timestamp: number;
}

export interface CommandStartedEvent extends TerminalEvent {
  type: "commandStarted";
  command: string;
}

export interface OutputWrittenEvent extends TerminalEvent {
  type: "outputWritten";
  output: string;
  newOutput?: string;
  data?: string;
}

export interface CommandEndedEvent extends TerminalEvent {
  type: "commandEnded";
  status: number;
  command: string;
}

export interface ModeChangedEvent extends TerminalEvent {
  type: "modeChanged";
  from: string;
  to: string;
}

export interface PromptChangedEvent extends TerminalEvent {
  type: "promptChanged";
  prompt: string;
}

export interface MoreDisplayedEvent extends TerminalEvent {
  type: "moreDisplayed";
  active: boolean;
}

export type AnyTerminalEvent =
  | CommandStartedEvent
  | OutputWrittenEvent
  | CommandEndedEvent
  | ModeChangedEvent
  | PromptChangedEvent
  | MoreDisplayedEvent;

// PT-specific status codes
export enum CommandStatus {
  OK = 0,
  AMBIGUOUS = 1,
  INVALID = 2,
  INCOMPLETE = 3,
  NOT_IMPLEMENTED = 4,
}

export function isStatusOk(status: number): boolean {
  return status === CommandStatus.OK;
}