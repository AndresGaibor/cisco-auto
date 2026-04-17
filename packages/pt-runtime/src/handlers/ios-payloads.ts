// ============================================================================
// IOS Payloads - Interfaces type-safe para comandos IOS
// ============================================================================

export interface ConfigHostPayload {
  type: "configHost";
  device: string;
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  dhcp?: boolean;
}

export interface ConfigIosPayload {
  type: "configIos";
  device: string;
  commands: string[];
  save?: boolean;
  stopOnError?: boolean;
  ensurePrivileged?: boolean;
  dismissInitialDialog?: boolean;
  commandTimeoutMs?: number;
  stallTimeoutMs?: number;
}

export interface ExecIosPayload {
  type: "execIos";
  device: string;
  command: string;
  parse?: boolean;
  ensurePrivileged?: boolean;
  dismissInitialDialog?: boolean;
  commandTimeoutMs?: number;
  stallTimeoutMs?: number;
}

export interface PollDeferredPayload {
  type: "__pollDeferred";
  ticket: string;
}

export interface ExecPcPayload {
  type: "execPc";
  device: string;
  command: string;
  timeoutMs?: number;
}
