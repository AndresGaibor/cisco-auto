// Tipos de terminal (Packet Tracer)
// CLI, eventos y logs de comandos

// ============================================================================
// CLI / Terminal interfaces
// ============================================================================

export type PTTerminalEventName =
  | "commandStarted"
  | "outputWritten"
  | "commandEnded"
  | "modeChanged"
  | "promptChanged"
  | "moreDisplayed"
  | "directiveSent"
  | "commandSelectedFromHistory"
  | "commandAutoCompleted"
  | "cursorPositionChanged";

export interface PTOutputWrittenArgs {
  newOutput: string;
  isDebug?: boolean;
}

export interface PTCommandStartedArgs {
  inputCommand: string;
  completeCommand: string;
  inputMode: string;
  processedCommand?: string;
}

export interface PTCommandEndedArgs {
  status: number;
}

export interface PTModeChangedArgs {
  newMode: string;
}

export interface PTPromptChangedArgs {
  newPrompt: string;
}

export interface PTMoreDisplayedArgs {
  active: boolean;
}

export interface PTCommandLine {
  enterCommand(cmd: string): void;
  getPrompt(): string;
  getMode(): string;
  getCommandInput(): string;
  enterChar(charCode: number, modifier: number): void;
  registerEvent(
    eventName: PTTerminalEventName,
    context: null,
    handler: (source: any, args: any) => void,
  ): void;
  unregisterEvent(
    eventName: PTTerminalEventName,
    context: null,
    handler: (source: any, args: any) => void,
  ): void;
}

export interface PTCommandLog {
  getLogCount(): number;
  getLogAt(index: number): string;
  clearLog(): void;
  getClassName?(): string;
  getObjectUuid?(): string;
}