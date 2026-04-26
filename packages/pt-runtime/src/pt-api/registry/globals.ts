// Ambient class declarations (_Network, _SystemFileManager, _AppWindow, etc.)
// These are global classes discovered in PT Console — not instantiated via import
// NOTE: This file is ambient-only and not imported directly by consumers.
// Real types are in the individual registry files.

/**
 * Global Network class - access devices directly
 * Usage: var net = new _Network();
 */
declare class _Network {
  constructor();
  getDevice(name: string): PTDevice | null;
  getDeviceAt(index: number): PTDevice | null;
  getDeviceCount(): number;
  getLinkAt(index: number): PTLink | null;
  getLinkCount(): number;
  getTotalDeviceAttributeValue?(attribute: string): number;
  registerObjectEvent?(event: string, context: any, handler: Function): void;
  unregisterObjectEvent?(event: string, context: any, handler: Function): void;
  registerEvent?(event: string, context: any, handler: Function): void;
  unregisterEvent?(event: string, context: any, handler: Function): void;
  getClassName?(): string;
  getObjectUuid?(): string;
}

/**
 * Global SystemFileManager class
 * Usage: var fm = new _SystemFileManager();
 */
declare class _SystemFileManager {
  constructor();
  getFileContents(path: string): string;
  getFileBinaryContents?(path: string): Uint8Array;
  writePlainTextToFile(path: string, content: string): void;
  writeBinaryToFile?(path: string, content: Uint8Array): void;
  writeTextToFile?(path: string, content: string): void;
  fileExists(path: string): string | boolean;
  directoryExists(path: string): boolean;
  makeDirectory(path: string): boolean;
  getFileModificationTime(path: string): number;
  getFilesInDirectory(path: string): string[];
  removeFile(path: string): boolean;
  removeDirectory?(path: string): boolean;
  moveSrcFileToDestFile(src: string, dest: string, overwrite?: boolean): boolean;
  copySrcFileToDestFile?(src: string, dest: string): boolean;
  copySrcDirectoryToDestDirectory?(src: string, dest: string): boolean;
  getFileSize?(path: string): number;
  getFileCheckSum?(path: string): string;
  getFilePermissions?(path: string): string;
  setFilePermissions?(path: string, permissions: string): boolean;
  getEncryptedFileContents?(path: string): string;
  encrypt?(content: string): string;
  encryptBinary?(content: Uint8Array): Uint8Array;
  encryptFile?(src: string, dest: string): boolean;
  decrypt?(content: string): string;
  decryptBinary?(content: Uint8Array): Uint8Array;
  decryptFile?(src: string, dest: string): boolean;
  zipDirectory?(srcDir: string, destFile: string): boolean;
  zipDirectoryTo?(srcDir: string, destFile: string): boolean;
  unzipFile?(zipFile: string): boolean;
  unzipFileTo?(zipFile: string, destDir: string): boolean;
  getFileWatcher?(path: string, ...args: any[]): PTFileWatcher | null;
  getAbsolutePath?(path: string): string;
  getRelativePath?(path: string, base: string): string;
  isAbsolutePath?(path: string): boolean;
  convertToNativeSeparators?(path: string): string;
  convertFromNativeSeparators?(path: string): string;
  registerObjectEvent?(event: string, context: any, handler: Function): void;
  unregisterObjectEvent?(event: string, context: any, handler: Function): void;
  registerEvent?(event: string, context: any, handler: Function): void;
  unregisterEvent?(event: string, context: any, handler: Function): void;
  getClassName?(): string;
  getObjectUuid?(): string;
}

/**
 * Global AppWindow class
 * Usage: var app = new _AppWindow();
 */
declare class _AppWindow {
  constructor();
  getActiveWorkspace(): PTWorkspace;
  getVersion(): string;
  getBasePath(): string;
  getTempFileLocation(): string;
  getUserFolder(): string;
  isPTSA(): boolean;
  isRealtimeMode(): boolean;
  isSimulationMode(): boolean;
  isMaximized(): undefined;
  isMinimized(): undefined;
  getWidth(): number;
  getHeight(): number;
  getX(): number;
  getY(): number;
  fileNew(...args: any[]): void;
  fileOpen(path?: string): void;
  fileOpenFromBytes?(bytes: Uint8Array, name: string): void;
  fileOpenFromURL?(url: string): void;
  fileSave(): boolean;
  fileSaveAs(path?: string): void;
  fileSaveAsPkz?(path: string): void;
  fileSaveToBytes?(): Uint8Array;
  exit(): void;
  exitNoConfirm(): void;
  showMessageBox(message: string, title?: string): number;
  getClipboardText(): string;
  setClipboardText(text: string): void;
  listDirectory(path: string): string[];
  zoomIn?(): void;
  zoomOut?(): void;
  zoomReset?(): void;
  setVisible(visible: boolean): void;
  showNormal(): undefined;
  showMaximized(): undefined;
  showMinimized(): undefined;
  raise(): undefined;
  writeToPT(data: string): void;
  getClassName?(): string;
  getObjectUuid?(): string;
  registerObjectEvent?(event: string, context: any, handler: Function): void;
  unregisterObjectEvent?(event: string, context: any, handler: Function): void;
}

/**
 * Global HardwareFactory class
 * Usage: var hf = new _HardwareFactory();
 */
declare class _HardwareFactory {
  constructor();
  getDeviceType(name: string): number | null;
  getCableType(name: string): number | null;
  getClassName?(): string;
  getObjectUuid?(): string;
}

/**
 * Global Workspace class (obtained from AppWindow)
 */
declare class _Workspace {
  getLogicalWorkspace(): PTLogicalWorkspace;
  getGeoView?(): unknown;
  getRackView?(): unknown;
  devicesAt?(
    x: number,
    y: number,
    width: number,
    height: number,
    includeClusters: boolean,
  ): unknown[];
  isLogicalView?(): boolean;
  isGeoView?(): boolean;
  isRackView?(): boolean;
  zoomIn?(): void;
  zoomOut?(): void;
  zoomReset?(): void;
  setVisible?(visible: boolean): void;
  getClassName?(): string;
  getObjectUuid?(): string;
}

/**
 * Global Parser class for low-level IPC calls
 * Usage: _Parser.ipcCall("ClassName", "method", [args])
 */
declare class _Parser {
  static ipcCall(className: string, method: string, args: any[]): any;
  static createObject(className: string, ...args: any[]): any;
  className: string;
  uuid: string;
}

/**
 * Global Simulation class
 */
declare class _Simulation {
  constructor();
  getClassName?(): string;
  getObjectUuid?(): string;
}

/**
 * Direct access to IPC functions
 */
declare var $ipc: {
  (): PTIpc;
  network: () => PTNetwork;
  appWindow: () => PTAppWindow;
  systemFileManager: () => PTFileManager;
};

/**
 * Alternative IPC object access
 */
declare var $ipcObject: any;

/**
 * Script module instance — always available in PT Script Module context (49 methods confirmed).
 * Used as file-access fallback when ipc.systemFileManager() is unavailable (main.js context quirk).
 */
declare var _ScriptModule: {
  getFileContents(path: string): string;
  writeTextToFile(path: string, content: string): void;
  getFileModificationTime(path: string): number;
  getFileSize(path: string): number;
  getFileCheckSum(path: string): string;
  addScriptFile(path: string, label: string): void;
  getFilesInDirectory?(path: string): string[];
  removeFile?(path: string): void;
  ipcCall(className: string, method: string, args: any[]): any;
  ipcObjectCall(className: string, method: string, args: any[]): any;
  getIpcApi(): PTIpc;
  registerIpcEventByID(eventId: string, handler: Function): void;
  unregisterIpcEventByID(eventId: string): void;
  unregisterAllIpcEvents(): void;
  setTimeout(fn: Function, ms: number): number;
  setInterval(fn: Function, ms: number): number;
  clearTimeout(id: number): void;
  clearInterval(id: number): void;
};

// Forward declarations for use in declare class/var type annotations
interface PTDevice {}
interface PTLink {}
interface PTPort {}
interface PTWorkspace {}
interface PTLogicalWorkspace {}
interface PTIpc {}
interface PTNetwork {}
interface PTAppWindow {}
interface PTFileManager {}
interface PTFileWatcher {}