export interface CommandHandler {
  enterCommand(cmd: string): [number, string] | Promise<[number, string]>;
}
