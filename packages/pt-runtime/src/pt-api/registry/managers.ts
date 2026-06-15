// Tipos de managers (Packet Tracer)
// Procesos y managers de aplicación

import type { PTIpcBase } from "./ipc-base.js";

// ============================================================================
// Activity / Process interfaces
// ============================================================================

export interface PTProcess extends PTIpcBase {
  getProcessId(): number;
  getProcessName(): string;
  isProcessRunning(): boolean;
  stopProcess(): void;
  startProcess(): void;
}

export interface PTIpcManager {
  getClassName?(): string;
  getObjectUuid?(): string;
}

export interface PTMultiUserManager {
  getClassName?(): string;
  getObjectUuid?(): string;
}

export interface PTUserAppManager {
  getClassName?(): string;
  getObjectUuid?(): string;
}