// PTApiPort: interfaz abstracta para la API de Packet Tracer
// Los archivos PT-adjacent (que reciben `terminal` como param) usan esta interfaz
// en vez de depender directamente del objeto PT terminal.
// Esto permite que la lógica pura sea testeable fuera de Packet Tracer.

export interface PTApiPort {
  enterChar(ch: string): void;
  getPrompt(): string;
  sendCmd(cmd: string): void;
  sendCmdEnd(): void;
  getOutput(): string;
  clear(): void;
  log(msg: string): void;
  wait(millis: number): void;
  sleep(millis: number): Promise<void>;
  getDeviceName(): string;
  getModel(): string;
  isConnected(): boolean;
}

export interface TerminalState {
  prompt: string;
  mode: string;
  awaitingConfirm: boolean;
  awaitingPassword: boolean;
  paging: boolean;
}
