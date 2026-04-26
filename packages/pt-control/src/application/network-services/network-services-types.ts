export interface NetworkServiceInput {
  deviceName: string;
}

export interface DhcpServiceInput extends NetworkServiceInput {
  poolName: string;
  network: string;
  mask?: string;
}

export interface DhcpServiceResult {
  device: string;
  pool: string;
  network: string;
  commands: string[];
  commandsGenerated: number;
}

export interface NtpServiceInput extends NetworkServiceInput {
  server: string;
}

export interface NtpServiceResult {
  device: string;
  server: string;
  commands: string[];
  commandsGenerated: number;
}

export interface SyslogServiceInput extends NetworkServiceInput {
  server: string;
}

export interface SyslogServiceResult {
  device: string;
  server: string;
  commands: string[];
  commandsGenerated: number;
}

export interface NetworkServiceError {
  ok: false;
  error: {
    message: string;
    details?: Record<string, unknown>;
  };
}

export type NetworkServiceOutput<T> =
  | { ok: true; data: T; advice?: string[] }
  | NetworkServiceError;

export interface NetworkServiceControllerPort {
  start(): Promise<void>;
  stop(): Promise<void>;
  configIos(device: string, commands: string[]): Promise<void>;
}