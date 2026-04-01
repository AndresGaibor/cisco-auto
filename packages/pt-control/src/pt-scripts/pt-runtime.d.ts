/**
 * Packet Tracer Runtime Type Declarations
 * 
 * These types describe the global objects available in the Packet Tracer
 * JavaScript runtime environment. This allows TypeScript to provide
 * IntelliSense and type checking for PT scripts.
 */

// ============================================================================
// Packet Tracer Network API
// ============================================================================

interface PTDevice {
  getName(): string;
  getModel(): string;
  getType(): string;
  getPower(): boolean;
  getPortCount(): number;
  getPortAt(index: number): PTPort;
  getPortByName(name: string): PTPort | null;
}

interface PTPort {
  getName(): string;
  getIpAddress(): string;
  setIpAddress(ip: string): void;
  getSubnetMask(): string;
  setSubnetMask(mask: string): void;
  getMacAddress(): string;
  getLinkStatus(): 'up' | 'down';
  getSpeed(): string;
  getDuplex(): 'auto' | 'full' | 'half';
}

interface PTNetwork {
  getDeviceCount(): number;
  getDeviceAt(index: number): PTDevice;
  getDeviceByName(name: string): PTDevice | null;
  getLinkCount(): number;
}

// ============================================================================
// Packet Tracer File Manager API
// ============================================================================

interface PTFileManager {
  fileExists(path: string): boolean;
  getFileContents(path: string): string;
  writePlainTextToFile(path: string, contents: string): void;
  writeBinaryToFile(path: string, data: Uint8Array): void;
  deleteFile(path: string): void;
  createDirectory(path: string): void;
  directoryExists(path: string): boolean;
  listFilesInDirectory(path: string): string[];
}

interface PTFileWatcher {
  addPath(path: string): void;
  removePath(path: string): void;
  registerEvent(
    eventType: 'fileChanged' | 'fileCreated' | 'fileDeleted',
    filter: unknown | null,
    callback: (source: string, args: { path: string; type: string }) => void
  ): void;
}

// ============================================================================
// Packet Tracer IPC API
// ============================================================================

interface PTIPC {
  network(): PTNetwork;
  systemFileManager(): PTFileManager;
  sendCommand(command: string, payload: unknown): unknown;
  registerHandler(commandType: string, handler: (payload: unknown) => unknown): void;
}

// ============================================================================
// Packet Tracer UI API
// ============================================================================

interface PTUI {
  showMessage(title: string, message: string, type?: 'info' | 'warning' | 'error'): void;
  log(message: string): void;
}

// ============================================================================
// Global PT Runtime Objects
// ============================================================================

/**
 * Packet Tracer IPC interface - provides access to network, file system, and commands
 */
declare var ipc: PTIPC;

/**
 * Debug print function - outputs to PT console/log
 */
declare var dprint: (msg: string) => void;

/**
 * Development directory path (set at build time)
 */
declare var DEV_DIR: string;

// ============================================================================
// Runtime State Types (for internal use)
// ============================================================================

interface PTRuntimeState {
  fm: PTFileManager | null;
  fw: PTFileWatcher | null;
  snapshotInterval: number | null;
  commandFile: string;
  eventsFile: string;
  stateFile: string;
}

interface PTCommand {
  id: string;
  payload: {
    type: string;
    [key: string]: unknown;
  };
  ts: number;
}

interface PTEvent {
  type: string;
  ts: number;
  id?: string;
  ok?: boolean;
  value?: unknown;
  message?: string;
  count?: number;
}

// ============================================================================
// Handler Type Helpers
// ============================================================================

type PTCommandHandler = (payload: Record<string, unknown>) => Record<string, unknown>;

interface PTCommandHandlers {
  [commandType: string]: PTCommandHandler;
}
