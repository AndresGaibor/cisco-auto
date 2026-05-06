export interface SpawnResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface HostProcessPort {
  platform(): NodeJS.Platform;
  spawn(command: string, argv: string[], options?: { timeoutMs?: number }): Promise<SpawnResult>;
}