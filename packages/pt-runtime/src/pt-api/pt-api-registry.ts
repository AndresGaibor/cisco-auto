// ============================================================================
// Registro de la API PT - fuente unica de verdad para tipos nativos de Packet Tracer
// ============================================================================

export interface PTIpc {
  network(): PTNetwork;
  appWindow(): PTAppWindow;
  systemFileManager(): PTFileManager;
  simulation?(): PTSimulation;
  hardwareFactory?(): PTHardwareFactory;
  ipcManager?(): PTIpcManager;
  multiUserManager?(): PTMultiUserManager;
  userAppManager?(): PTUserAppManager;
  commandLog?(): unknown;
  options?(): unknown;
  getObjectByUuid?(uuid: string): unknown | null;
  getObjectUuid?(obj: unknown): string | null;
  registerEvent?(event: string, context: any, handler: Function): void;
  unregisterEvent?(event: string, context: any, handler: Function): void;
  registerDelegate?(event: string, context: any, handler: Function): void;
  unregisterDelegate?(event: string, context: any, handler: Function): void;
  registerObjectEvent?(event: string, context: any, handler: Function): void;
  unregisterObjectEvent?(event: string, context: any, handler: Function): void;
}

// ============================================================================
// Global Classes (discovered in PT Console)
// These classes exist as globals and can be instantiated with new
// ============================================================================

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
  // Full FileManager interface
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
  moveSrcFileToDestFile(src: string, dest: string): boolean;
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
  isMaximized(): boolean;
  isMinimized(): boolean;
  getWidth(): number;
  getHeight(): number;
  getX(): number;
  getY(): number;
  fileNew(...args: any[]): void;
  fileOpen(path?: string): void;
  fileOpenFromBytes?(bytes: Uint8Array, name: string): void;
  fileOpenFromURL?(url: string): void;
  fileSave(): void;
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
  showNormal(): void;
  showMaximized(): void;
  showMinimized(): void;
  raise(): void;
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

// ============================================================================
// Global function aliases (discovered in PT Console)
// ============================================================================

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
 * Script module instance
 */
declare var _ScriptModule: {
  ipcCall: (className: string, method: string, args: any[]) => any;
  ipcObjectCall: (className: string, method: string, args: any[]) => any;
  getIpcApi: () => PTIpc;
  registerIpcEventByID: (eventId: string, handler: Function) => void;
  unregisterIpcEventByID: (eventId: string) => void;
  unregisterAllIpcEvents: () => void;
};

export interface PTAppWindow {
  getActiveWorkspace(): PTWorkspace;
  getVersion(): string;
  getBasePath(): string;
  getTempFileLocation(): string;
  getUserFolder(): string;
  isPTSA(): boolean;
  isRealtimeMode(): boolean;
  isSimulationMode(): boolean;
  isLogicalMode(): boolean;
  isPhysicalMode(): boolean;
  isMaximized(): boolean;
  isMinimized(): boolean;
  fileNew(): void;
  fileOpen(path?: string): void;
  fileOpenFromBytes?(bytes: Uint8Array, name: string): void;
  fileOpenFromURL?(url: string): void;
  fileSave(): void;
  fileSaveAs(path?: string): void;
  fileSaveAsPkz?(path: string): void;
  fileSaveAsAsync?(path: string, callback: Function): void;
  fileSaveToBytes?(): Uint8Array;
  exit(): void;
  exitNoConfirm(): void;
  showMessageBox(message: string, title?: string): number;
  showMessageBoxWithCustomButtons?(message: string, title: string, buttons: string[]): number;
  openURL(url: string): void;
  getClipboardText(): string;
  setClipboardText(text: string): void;
  listDirectory(path: string): string[];
  getDialogManager?(): unknown;
  getActiveDialog?(): unknown;
  getSimulationPanel?(): unknown;
  getSimulationToolbar?(): unknown;
  getPDUListWindow?(): unknown;
  getMenuBar?(): unknown;
  getLogicalToolbar?(): unknown;
  getPhysicalToolbar?(): unknown;
  getCommonToolbar?(): unknown;
  getToolBar?(): unknown;
  getSecondaryToolBar?(): unknown;
  getPhysicalLocationDialog?(): unknown;
  getEnvironmentDialog?(): unknown;
  getInstructionDlg?(): unknown;
  getInfoDialog?(): unknown;
  getPaletteDialog?(): unknown;
  getPrintDialog?(): void;
  getActivityWizard?(): unknown;
  getAdminDialog?(): unknown;
  getPLSwitch?(): unknown;
  getRSSwitch?(): unknown;
  getWebViewManager?(): unknown;
  getMainViewAreaWidth?(): number;
  getMainViewAreaHeight?(): number;
  getMaximumWidth?(): number;
  getMaximumHeight?(): number;
  getMinimumWidth?(): number;
  getMinimumHeight?(): number;
  getWidth(): number;
  getHeight(): number;
  getX(): number;
  getY(): number;
  setVisible(visible: boolean): void;
  showNormal(): void;
  showMaximized(): void;
  showMinimized(): void;
  setMaximumSize(width: number, height: number): void;
  setMinimumSize(width: number, height: number): void;
  setWindowGeometry?(x: number, y: number, width: number, height: number): void;
  setWindowTitle?(title: string): void;
  raise(): void;
  suppressInstructionDlg?(suppress: boolean): void;
  setPreventClose?(prevent: boolean): void;
  isPreventClose?(): boolean;
  setDisabled?(disabled: boolean): void;
  isInterfaceLocked?(): boolean;
  isActivityWizardOpen?(): boolean;
  setCheckOutdatedDevices?(check: boolean): void;
  setPTSAMode?(enabled: boolean): void;
  setPTSAPluginVisible?(visible: boolean): void;
  setPLFrameVisible?(visible: boolean): void;
  setRSFrameVisible?(visible: boolean): void;
  writeToPT?(data: string): void;
  helpPath?(path?: string): void;
  getListOfFilesSaved?(): string[];
  getListOfFilesToOpen?(): string[];
  promptFileOpenFolder?(): string | null;
  deletePTConf?(): void;
  getProcessId?(): number;
  getSessionId?(): string;
}

export interface PTWorkspace {
  getLogicalWorkspace(): PTLogicalWorkspace;
  getGeoView?(): unknown;
  getRackView?(): unknown;
  getRootPhysicalObject?(): unknown;
  getCurrentPhysicalObject?(): unknown;
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
  switchToPhysicalObject?(obj: unknown): void;
  getZLevel?(): number;
  setBaseZLevel?(level: number): void;
  zoomIn?(): void;
  zoomOut?(): void;
  zoomReset?(): void;
  setLogicalBackgroundPath?(path: string): void;
  setVisible?(visible: boolean): void;
  fillColor?(color: string): void;
  hasProperty?(name: string): boolean;
  getProperty?(name: string): unknown;
  setProperty?(name: string, value: unknown): void;
  getProperties?(): Record<string, unknown>;
  setThingCustomText?(obj: unknown, text: string): void;
  setThingRotation?(obj: unknown, rotation: number): void;
  setComponentOpacity?(obj: unknown, opacity: number): void;
  setComponentRotation?(obj: unknown, rotation: number): void;
  setParentGraphicFromComponent?(obj: unknown, component: unknown): void;
  moveItemInWorkspace?(obj: unknown, x: number, y: number): void;
  getEnvironmentTimeInSeconds?(): number;
  pauseEnvironmentTime?(): void;
  resumeEnvironmentTime?(): void;
  resetEnvironment?(): void;
  getClassName?(): string;
  getObjectUuid?(): string;
}

export interface PTLogicalWorkspace {
  addDevice(typeId: number, model: string, x: number, y: number): string | null;
  removeDevice(name: string): boolean;
  deleteDevice(name: string): boolean;
  removeObject(name: string): boolean;
  deleteObject(name: string): boolean;
  createLink(
    device1Name: string,
    port1Name: string,
    device2Name: string,
    port2Name: string,
    cableType: number,
  ): PTLink | null;
  deleteLink(deviceName: string, portName: string): boolean;
  /** Get all canvas rectangle (zone) IDs — may not be available in all PT versions */
  getCanvasRectIds?(): string[];
  /**
   * Get data for a rect item (x, y, width, height, label, etc.)
   * Variant names: getRectItemData / getRectData depending on PT version
   */
  getRectItemData?(rectId: string): Record<string, unknown> | null;
  getRectData?(rectId: string): Record<string, unknown> | null;
  /** Find devices within a canvas area */
  devicesAt?(
    x: number,
    y: number,
    width: number,
    height: number,
    includeClusters: boolean,
  ): unknown[];
}

export interface PTNetwork {
  getDevice(name: string): PTDevice | null;
  getDeviceAt(index: number): PTDevice | null;
  getDeviceCount(): number;
  getLinkAt?(index: number): PTLink | null;
  getLinkCount?(): number;
  getTotalDeviceAttributeValue?(attribute: string): number;
}

export interface PTModule {
  getSlotCount(): number;
  getSlotTypeAt(index: number): number;
  getModuleCount(): number;
  getModuleAt(index: number): PTModule | null;
  addModuleAt(moduleId: string, slotIndex: number): boolean;
  getModuleNameAsString?(): string;
  getSlotPath?(): string;
  getModuleType?(): number;
}

export interface PTDevice {
  getName(): string;
  setName(name: string): void;
  getModel(): string;
  getType(): number;
  getPower(): boolean;
  setPower(on: boolean): void;
  skipBoot(): void;
  getCommandLine(): PTCommandLine | null;
  getPortCount(): number;
  getPortAt(index: number): PTPort | null;
  getPort(name: string): PTPort | null;
  addModule(slot: string, module: string): boolean;
  removeModule(slot: string): boolean;
  setDhcpFlag(enabled: boolean): void;
  getDhcpFlag(): boolean;
  moveToLocation(x: number, y: number): boolean;
  moveToLocationCentered(x: number, y: number): boolean;
  /** Canvas position — may not be available in all PT versions */
  getX?(): number;
  getY?(): number;
  /** Serialize device config to XML string */
  serializeToXml?(): string;
  /**
   * Get a named process attached to this device.
   * Use `getProcessByCandidates()` from pt-processes.ts to handle name variants.
   * @example device.getProcess("DhcpServerMainProcess")
   */
  getProcess?<T = unknown>(name: string): T | null;
  /** Get the root module of this device's module tree (for modular routers) */
  getRootModule?(): PTModule | null;
}

export interface PTCommandLine {
  /**
   * Enter a command in the IOS terminal.
   * NOTE: Returns void per PT TerminalLine API. Actual command state
   * is delivered via events: commandStarted, outputWritten, commandEnded,
   * modeChanged, promptChanged, moreDisplayed.
   * @see https://tutorials.ptnetacad.net/help/default/IpcAPI/class_terminal_line.html
   */
  enterCommand(cmd: string): void;
  getPrompt(): string;
  getMode(): string;
  getCommandInput(): string;
  enterChar(charCode: number, modifier: number): void;
  registerEvent(
    eventName: PTTerminalEventName,
    context: null,
    handler: (source: any, args: any) => void,
  ): void;
  unregisterEvent(
    eventName: PTTerminalEventName,
    context: null,
    handler: (source: any, args: any) => void,
  ): void;
}

export type PTTerminalEventName =
  | "commandStarted"
  | "outputWritten"
  | "commandEnded"
  | "modeChanged"
  | "promptChanged"
  | "moreDisplayed"
  | "directiveSent"
  | "commandSelectedFromHistory"
  | "commandAutoCompleted"
  | "cursorPositionChanged";

export interface PTOutputWrittenArgs {
  newOutput: string;
  isDebug?: boolean;
}

export interface PTCommandStartedArgs {
  inputCommand: string;
  completeCommand: string;
  inputMode: string;
  processedCommand?: string;
}

export interface PTCommandEndedArgs {
  status: number;
}

export interface PTModeChangedArgs {
  newMode: string;
}

export interface PTPromptChangedArgs {
  newPrompt: string;
}

export interface PTMoreDisplayedArgs {
  active: boolean;
}

export interface PTPort {
  getName(): string;
  getIpAddress(): string;
  getSubnetMask(): string;
  setIpSubnetMask(ip: string, mask: string): void;
  getDefaultGateway(): string;
  setDefaultGateway(gateway: string): void;
  getDnsServerIp(): string;
  setDnsServerIp(dns: string): void;
  setDhcpEnabled(enabled: boolean): void;
  setDhcpClientFlag(enabled: boolean): void;
  isDhcpClientOn(): boolean;
  setIpv6Enabled(enabled: boolean): void;
  getIpv6Enabled(): boolean;
  getIpv6Address(): string;
  setIpv6AddressAutoConfig(enabled: boolean): void;
  setv6DefaultGateway(gateway: string): void;
  getv6DefaultGateway(): string;
  setv6ServerIp(dns: string): void;
  getv6ServerIp(): string;
  setIpv6Mtu(mtu: number): void;
  getIpv6Mtu(): number;
  isPortUp(): boolean;
  isProtocolUp(): boolean;
  setInboundFirewallService(state: string): void;
  getInboundFirewallService(): string;
  getInboundFirewallServiceStatus(): string;
  setInboundIpv6FirewallService(state: string): void;
  getInboundIpv6FirewallService(): string;
  getInboundIpv6FirewallServiceStatus(): string;
  setMtu(mtu: number): void;
  getMtu(): number;
  setIpMtu(mtu: number): void;
  getIpMtu(): number;
  getConnectorType?(): string;
}

export interface PTLink {
  getClassName?(): string;
  getObjectUuid?(): string;
}

export interface PTHardwareFactory {
  getDeviceType?(name: string): number;
  getCableType?(name: string): number;
  getClassName?(): string;
  getObjectUuid?(): string;
}

export interface PTSimulation {
  getClassName?(): string;
  getObjectUuid?(): string;
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

export interface PTFileManager {
  // Basic operations
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
  moveSrcFileToDestFile(src: string, dest: string): boolean;

  // Copy operations
  copySrcFileToDestFile?(src: string, dest: string): boolean;
  copySrcDirectoryToDestDirectory?(src: string, dest: string): boolean;

  // File info
  getFileSize?(path: string): number;
  getFileCheckSum?(path: string): string;
  getFilePermissions?(path: string): string;
  setFilePermissions?(path: string, permissions: string): boolean;

  // Encryption
  getEncryptedFileContents?(path: string): string;
  getEncryptedFileBinaryContents?(path: string): Uint8Array;
  encrypt?(content: string): string;
  encryptBinary?(content: Uint8Array): Uint8Array;
  encryptFile?(src: string, dest: string): boolean;
  decrypt?(content: string): string;
  decryptBinary?(content: Uint8Array): Uint8Array;
  decryptFile?(src: string, dest: string): boolean;

  // Compression
  zipDirectory?(srcDir: string, destFile: string): boolean;
  zipDirectoryTo?(srcDir: string, destFile: string): boolean;
  zipDirectoryWithPassword?(srcDir: string, destFile: string, password: string): boolean;
  zipDirectoryToWithPassword?(srcDir: string, destFile: string, password: string): boolean;
  unzipFile?(zipFile: string): boolean;
  unzipFileTo?(zipFile: string, destDir: string): boolean;
  unzipFileWithPassword?(zipFile: string, password: string): boolean;
  unzipFileToWithPassword?(zipFile: string, destDir: string, password: string): boolean;

  // Path utilities
  getAbsolutePath?(path: string): string;
  getRelativePath?(path: string, base: string): string;
  isAbsolutePath?(path: string): boolean;
  isRelativePath?(path: string): boolean;
  convertToNativeSeparators?(path: string): string;
  convertFromNativeSeparators?(path: string): string;

  // File watcher (para hot reload)
  getFileWatcher?(path: string): PTFileWatcher | null;

  // Dialogs
  getOpenFileName?(filter?: string): string | null;
  getOpenFileNames?(filter?: string): string[];
  getSaveFileName?(defaultName?: string): string | null;
  getSelectedDirectory?(): string | null;

  // System
  getClassName?(): string;
  getObjectUuid?(): string;

  // Events (IPC style)
  registerEvent?(event: string, context: any, handler: Function): void;
  registerDelegate?(event: string, context: any, handler: Function): void;
  unregisterEvent?(event: string, context: any, handler: Function): void;
  unregisterDelegate?(event: string, context: any, handler: Function): void;
  registerObjectEvent?(event: string, context: any, handler: Function): void;
  unregisterObjectEvent?(event: string, context: any, handler: Function): void;
}

export interface PTFileWatcher {
  register?(path: string, handler: (event: string) => void): void;
  unregister?(path?: string): void;
}

export interface PTGlobalScope {
  ipc: PTIpc;
  fm: PTFileManager;
  dprint: (message: string) => void;
  DEV_DIR: string;
}

export const PT_API_METHOD_INDEX: Record<string, string[]> = {
  PTIpc: ["network", "appWindow", "systemFileManager"],
  PTAppWindow: ["getActiveWorkspace"],
  PTWorkspace: ["getLogicalWorkspace"],
  PTLogicalWorkspace: [
    "addDevice",
    "removeDevice",
    "deleteDevice",
    "removeObject",
    "deleteObject",
    "createLink",
    "deleteLink",
  ],
  PTNetwork: ["getDevice", "getDeviceAt", "getDeviceCount"],
  PTDevice: [
    "getName",
    "setName",
    "getModel",
    "getType",
    "getPower",
    "setPower",
    "skipBoot",
    "getCommandLine",
    "getPortCount",
    "getPortAt",
    "getPort",
    "addModule",
    "removeModule",
    "setDhcpFlag",
    "getDhcpFlag",
    "moveToLocation",
    "moveToLocationCentered",
  ],
  PTCommandLine: [
    "enterCommand",
    "getPrompt",
    "getMode",
    "getCommandInput",
    "enterChar",
    "registerEvent",
    "unregisterEvent",
  ],
  PTPort: [
    "getName",
    "getIpAddress",
    "getSubnetMask",
    "setIpSubnetMask",
    "getDefaultGateway",
    "setDefaultGateway",
    "getDnsServerIp",
    "setDnsServerIp",
    "setDhcpEnabled",
    "setDhcpClientFlag",
    "isDhcpClientOn",
    "setIpv6Enabled",
    "getIpv6Enabled",
    "getIpv6Address",
    "setIpv6AddressAutoConfig",
    "setv6DefaultGateway",
    "getv6DefaultGateway",
    "setv6ServerIp",
    "getv6ServerIp",
    "setIpv6Mtu",
    "getIpv6Mtu",
    "isPortUp",
    "isProtocolUp",
    "setInboundFirewallService",
    "getInboundFirewallService",
    "getInboundFirewallServiceStatus",
    "setInboundIpv6FirewallService",
    "getInboundIpv6FirewallService",
    "getInboundIpv6FirewallServiceStatus",
    "setMtu",
    "getMtu",
    "setIpMtu",
    "getIpMtu",
  ],
  PTFileManager: ["getFileContents", "writePlainTextToFile", "fileExists"],
  ipc: ["network", "appWindow", "systemFileManager"],
  "ipc.network()": ["getDevice", "getDeviceAt", "getDeviceCount"],
  "ipc.appWindow()": ["getActiveWorkspace"],
  "ipc.appWindow().getActiveWorkspace()": ["getLogicalWorkspace"],
  "ipc.appWindow().getActiveWorkspace().getLogicalWorkspace()": [
    "addDevice",
    "removeDevice",
    "deleteDevice",
    "removeObject",
    "deleteObject",
    "createLink",
    "deleteLink",
  ],
  "ipc.systemFileManager()": ["getFileContents", "writePlainTextToFile", "fileExists"],
};

export const PT_DEVICE_TYPE_CONSTANTS: Record<string, number> = {
  router: 0,
  switch: 1,
  hub: 2,
  repeater: 3,
  bridge: 4,
  wireless: 5,
  wanEmulator: 6,
  multilayerSwitch: 16,
  cloud: 7,
  pc: 8,
  server: 9,
  printer: 10,
  ipPhone: 11,
  laptop: 12,
  tablet: 13,
  smartphone: 14,
  wirelessEndDevice: 15,
  wiredEndDevice: 17,
  tv: 18,
  homeVoip: 19,
  analogPhone: 20,
  iot: 21,
  sniffer: 22,
  mcu: 23,
  sbc: 24,
};

export const PT_CABLE_TYPE_CONSTANTS: Record<string, number> = {
  auto: -1,
  straight: 0,
  cross: 1,
  fiber: 2,
  serial: 3,
  console: 4,
  phone: 5,
  cable: 6,
  roll: 7,
  wireless: 8,
  coaxial: 9,
  custom: 10,
  octal: 11,
  cellular: 12,
  usb: 13,
};
