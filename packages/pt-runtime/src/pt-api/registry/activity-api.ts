// PTProcess, PTIpcManager, PTMultiUserManager, PTUserAppManager interfaces
import type { PTIpcBase } from "./ipc-base.js";

// ============================================================================
// Activity / Process interfaces
// ============================================================================

/**
 * Represents an internal OS or hardware process within a device.
 */
export interface PTProcess extends PTIpcBase {
  getProcessId(): number; // [CONFIRMED];
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