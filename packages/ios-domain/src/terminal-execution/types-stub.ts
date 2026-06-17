// Stub types para terminal-execution que dependen de pt-runtime
// Estos tipos son re-exportados para evitar imports cruzados entre paquetes

export interface TerminalEventRecord {
  sessionId: string;
  deviceName: string;
  eventType: string;
  timestamp: number;
  raw: string;
  normalized: string;
}

export interface CommandEnvelope {
  id: string;
  device: string;
  command: string;
  options?: ExecuteOptions;
  createdAt: number;
}

export interface ExecuteOptions {
  timeoutMs?: number;
  stopOnError?: boolean;
  expectMode?: string;
}

export interface DeferredStep {
  type: string;
  command?: string;
  expectMode?: string;
  value?: string;
  options?: Record<string, unknown>;
}

export interface SessionStateSnapshot {
  device: string;
  mode: string;
  prompt: string;
  paging: boolean;
  awaitingConfirm: boolean;
  lastOutputAt: number;
}

export interface RuntimeResult {
  ok: boolean;
  output: string;
  status: number;
  rawOutput?: string;
  error?: string;
  code?: string;
  prompt?: string;
  mode?: string;
}

export interface ResultEnvelope {
  id: string;
  device: string;
  result: RuntimeResult;
  createdAt: number;
  finishedAt?: number;
}

export interface DeviceRef {
  name: string;
  type: string;
  model: string;
}

export interface RuntimeApi {
  ipc: unknown;
  getDeviceByName(name: string): DeviceRef | null;
  listDevices(): string[];
  querySessionState(deviceName: string): SessionStateSnapshot | null;
}

export interface DeferredJobPlan {
  id: string;
  device: string;
  steps: DeferredStep[];
}
