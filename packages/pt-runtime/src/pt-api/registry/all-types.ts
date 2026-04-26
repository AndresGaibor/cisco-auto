// All PT API types consolidated in registry subdirectory
// This file is the single source of truth for all Packet Tracer type definitions.

import type { PTIpcBase } from "./ipc-base.js";
import type { PTPort } from "./port-api.js";
import type { PTLink } from "./link-api.js";

// ============================================================================
// Core IPC interfaces
// ============================================================================

export interface PTIpc {
  getClassName(): string;
  getObjectUuid(): string;
  registerEvent(event: string, context: any, handler: Function): void;
  unregisterEvent(event: string, context: any, handler: Function): void;
  registerDelegate(event: string, context: any, handler: Function): void;
  unregisterDelegate(event: string, context: any, handler: Function): void;
  registerObjectEvent(event: string, context: any, handler: Function): void;
  unregisterObjectEvent(event: string, context: any, handler: Function): void;
  network(): PTNetwork;
  getNetwork?(): PTNetwork;
  appWindow(): PTAppWindow;
  systemFileManager(): PTFileManager;
  simulation?(): PTSimulation;
  hardwareFactory?(): PTHardwareFactory;
  ipcManager?(): PTIpcManager;
  multiUserManager?(): PTMultiUserManager;
  userAppManager?(): PTUserAppManager;
  commandLog?(): PTCommandLog;
  options?(): PTOptions;
  getObjectByUuid?(uuid: string): unknown | null;
}

// ============================================================================
// Network interfaces
// ============================================================================

export interface PTNetwork extends PTIpcBase {
  getDevice(name: string): PTDevice | null;
  getDeviceAt(index: number): PTDevice | null;
  getDeviceCount(): number;
  getLinkAt?(index: number): PTLink | null;
  getLinkCount?(): number;
  getTotalDeviceAttributeValue?(attribute: string): number;
}

// ============================================================================
// Port interfaces
// ============================================================================

export interface PTPort extends PTIpcBase {
  getName(): string;
  getIpAddress(): string;
  getSubnetMask(): string;
  getMacAddress(): string;
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
  isPowerOn(): boolean;
  setPower(on: boolean): void;
  getLightStatus(): number;
  getBandwidth(): number;
  setBandwidth(kbps: number): void;
  getBia(): string;
  getChannel(): number;
  setChannel(chan: number): void;
  getClockRate(): number;
  setClockRate(rate: number): void;
  getDescription(): string;
  setDescription(desc: string): void;
  getHardwareQueue(): any;
  getQosQueue(): any;
  getEncapProcess(): any;
  getKeepAliveProcess(): any;
  getHigherProcessCount(): number;
  getRemotePortName(): string;
  getTerminalTypeShortString(): string;
  getType(): number;
  isAutoCross(): boolean;
  isBandwidthAutoNegotiate(): boolean;
  setBandwidthAutoNegotiate(auto: boolean): void;
  isDuplexAutoNegotiate(): boolean;
  setDuplexAutoNegotiate(auto: boolean): void;
  isEthernetPort(): boolean;
  isFullDuplex(): boolean;
  setFullDuplex(full: boolean): void;
  isStraightPins(): boolean;
  isWirelessPort(): boolean;
  getLink(): PTLink | null;
  deleteLink(): void;
  getConnectorType?(): string;
  getDelay?(): number;
  setDelay?(delay: number): void;
  getOwnerDevice?(): PTDevice | null;
}

// ============================================================================
// Link interface
// ============================================================================

export interface PTLink {
  getClassName?(): string;
  getObjectUuid?(): string;
  getConnectionType?(): number;
  getPort1?(): PTPort | null;
  getPort2?(): PTPort | null;
}

// ============================================================================
// Module interfaces
// ============================================================================

export interface PTModule extends PTIpcBase {
  getSlotCount(): number;
  getSlotTypeAt(index: number): number;
  getModuleCount(): number;
  getModuleAt(index: number): PTModule | null;
  addModuleAt(moduleId: string, slotIndex: number): boolean;
  removeModuleAt(slotIndex: number): boolean;
  addSlot(type: number): boolean;
  getModuleNameAsString?(): string;
  getModuleNumber?(): number;
  getSlotPath?(): string;
  getModuleType?(): number;
  getPortCount(): number;
  getPortAt(index: number): PTPort | null;
  getOwnerDevice(): PTDevice | null;
  getDescriptor?(): string;
}

export interface PTHardwareFactory {
  getDeviceType?(name: string): number;
  getCableType?(name: string): number;
  getClassName?(): string;
  getObjectUuid?(): string;
}

// ============================================================================
// Device interfaces
// ============================================================================

export interface PTDevice extends PTIpcBase {
  getName(): string;
  setName(name: string): void;
  getModel(): string;
  getType(): number;
  getPower(): boolean;
  setPower(on: boolean): void;
  skipBoot(): undefined;
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
  getX?(): number;
  getY?(): number;
  serializeToXml?(): string;
  activityTreeToXml?(): string;
  addCustomVar(name: string, value: string): void;
  getCustomVar(name: string): string;
  addSound(soundId: string, path: string): void;
  destroySounds(): undefined;
  addUserDesktopApp(appId: string): void;
  addUserDesktopAppFrom(appId: string, source: string): void;
  addUserDesktopAppFromGlobal(appId: string): void;
  removeUserDesktopApp(appId: string): void;
  isDesktopAvailable(): boolean;
  getProcess<T = PTProcess>(name: string): T | null;
  getRootModule?(): PTModule | null;
  getUpTime?(): number;
  getSerialNumber?(): string;
  isBooting?(): boolean;
  restoreToDefault?(): void;
  addDeviceExternalAttributes(attrs: any): void;
  clearDeviceExternalAttributes(): undefined;
}

/** Router port interface */
export interface PTRouterPort extends PTPort {
  getOspfCost(): number;
  setOspfCost(cost: number): void;
  getOspfPriority(): number;
  setOspfPriority(prio: number): void;
  getOspfHelloInterval(): number;
  setOspfHelloInterval(ms: number): void;
  getOspfDeadInterval(): number;
  setOspfDeadInterval(ms: number): void;
  getOspfAuthKey(): string;
  setOspfAuthKey(key: string): void;
  getOspfAuthType(): number;
  addOspfMd5Key(keyId: number, key: string): void;
  removeOspfMd5Key(keyId: number): void;
  addEntryEigrpPassive(as: number, network: string, wildcard: string): void;
  removeEntryEigrpPassive(as: number, network: string, wildcard: string): void;
  isRipPassive(): boolean;
  setRipPassive(passive: boolean): void;
  isRipSplitHorizon(): boolean;
  setRipSplitHorizon(enabled: boolean): void;
  getIpv6Addresses(): string[];
  addIpv6Address(ip: string, prefix: number): void;
  removeIpv6Address(ip: string): void;
  removeAllIpv6Addresses(): void;
  getIpv6LinkLocal(): string;
  setIpv6LinkLocal(ip: string): void;
  isInIpv6Multicast(): boolean;
  getNatMode(): number;
  setNatMode(mode: number): void;
  getAclInID(): string;
  setAclInID(id: string): void;
  getAclOutID(): string;
  setAclOutID(id: string): void;
  setZoneMemberName(name: string): void;
  getZoneMemberName(): string;
  getClockRate(): number;
  setClockRate(rate: number): void;
  getBandwidthInfo(): any;
  setBandwidthInfo(bw: number, delay: number): void;
  isBandwidthAutoNegotiate(): boolean;
  setBandwidthAutoNegotiate(auto: boolean): void;
  isDuplexAutoNegotiate(): boolean;
  setDuplexAutoNegotiate(auto: boolean): void;
}

/** Switch port interface */
export interface PTSwitchPort extends PTPort {
  getAccessVlan(): number;
  setAccessVlan(vlanId: number): void;
  getNativeVlanId(): number;
  setNativeVlanId(vlanId: number): void;
  getVoipVlanId(): number;
  setVoipVlanId(vlanId: number): void;
  addTrunkVlans(vlans: number[]): void;
  removeTrunkVlans(vlans: number[]): void;
  isAccessPort(): boolean;
  isAdminModeSet(): boolean;
  isNonegotiate(): boolean;
  setNonegotiateFlag(enabled: boolean): void;
  getPortSecurity(): any | null;
  getStpStatus?(): string;
}

/** Host port interface */
export interface PTHostPort extends PTPort {}

/** Multi-layer switch port (L2/L3) */
export interface PTRoutedSwitchPort extends PTSwitchPort, PTRouterPort {
  isRoutedPort(): boolean;
  setRoutedPort(routed: boolean): void;
}

// ============================================================================
// Specialized Device interfaces
// ============================================================================

export interface PTServer extends PTDevice {
  enableCip(): undefined;
  disableCip(): undefined;
  enableOpc(): undefined;
  disableOpc(): undefined;
  enableProfinet(): undefined;
  disableProfinet(): undefined;
  addProgrammingSerialOutputs(): void;
  clearProgrammingSerialOutputs(): undefined;
  getAreaLeftX(): number;
  getAreaTopY(): number;
  getAreaRightX(): number;
  getAreaBottomY(): number;
}

export interface PTAsa extends PTDevice {
  addBookmark(name: string, url: string): void;
  removeBookmark(name: string): void;
  getBookmarkCount(): number;
  getWebvpnUserManager(): any;
  setHostName(name: string): void;
  setEnablePassword(pwd: string): void;
  setEnableSecret(secret: string): void;
  addBootSystem(path: string): void;
  clearBootSystem(): void;
  addUserPassEntry(user: string, pass: string, level: number): void;
  clearFtpPasswd(): undefined;
}

export interface PTCloud extends PTDevice {
  addPhoneConnection(port1: string, port2: string): void;
  addPortConnection(port1: string, port2: string): void;
  addSubLinkConnection(
    port1: string,
    vpi1: number,
    vci1: number,
    port2: string,
    vpi2: number,
    vci2: number,
  ): void;
  removePortConnection(port1: string, port2: string): void;
  removeAllPortConnection(): void;
  isDslConnection(): boolean;
}

export interface PTMcu extends PTDevice {
  analogWrite(pin: number, value: number): void;
  digitalWrite(pin: number, value: number): void;
  analogRead(pin: number): number;
  digitalRead(pin: number): number;
  getSlotsCount(): number;
  getAnalogSlotsCount(): number;
  getDigitalSlotsCount(): number;
  getComponentAtSlot(slot: number): any;
  getComponentByName(name: string): any;
  addSerialOutputs(pin: number, data: string): void;
  clearSerialOutputs(): void;
  enableIec61850(): void;
  disableIec61850(): void;
  enableGoosePublisherOnPort(portName: string): void;
  disableGoosePublisherOnPort(portName: string): void;
  setSubComponentIndex(index: number): void;
  getSubComponentIndex(): number;
}

/** Alias for SBC (matches MCU surface in PT) */
export type PTSbc = PTMcu;

export interface PTCloudSerialPort extends PTPort {
  addDlci(vpi: number, name: string): void;
  removeDlci(vpi: number): void;
  getDlciCount(): number;
  getDlciAt(index: number): number;
}

export interface PTCloudPotsPort extends PTPort {
  getPhoneNumber(): string;
  setPhoneNumber(num: string): void;
}

// ============================================================================
// CLI / Terminal interfaces
// ============================================================================

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

export interface PTCommandLine {
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

export interface PTCommandLog {
  getLogCount(): number;
  getLogAt(index: number): string;
  clearLog(): void;
  getClassName?(): string;
  getObjectUuid?(): string;
}

// ============================================================================
// Workspace interfaces
// ============================================================================

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
  isMaximized(): undefined;
  isMinimized(): undefined;
  fileNew(): void;
  fileOpen(path?: string): void;
  fileOpenFromBytes?(bytes: Uint8Array, name: string): void;
  fileOpenFromURL?(url: string): void;
  fileSave(): boolean;
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
  getSecondaryToolbar?(): unknown;
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
  showNormal(): undefined;
  showMaximized(): undefined;
  showMinimized(): undefined;
  setMaximumSize(width: number, height: number): void;
  setMinimumSize(width: number, height: number): void;
  setWindowGeometry?(x: number, y: number, width: number, height: number): void;
  setWindowTitle?(title: string): void;
  raise(): undefined;
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
  helpPath?(path?: string): void;
  getListOfFilesSaved?(): string[];
  getListOfFilesToOpen?(): string[];
  promptFileOpenFolder?(): string | null;
  deletePTConf?(): void;
  getProcessId?(): number;
  getSessionId?(): string;
  writeToPT(data: string): void;
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
  removeObject(name: string): boolean;
  deleteObject(name: string): boolean;
  createLink(
    device1Name: string,
    port1Name: string,
    device2Name: string,
    port2Name: string,
    cableType: number,
  ): PTLink | null;
  autoConnectDevices(device1Name: string, device2Name: string): void;
  deleteLink(deviceName: string, portName: string): boolean;
  getCanvasRectIds?(): string[];
  getCanvasEllipseIds?(): string[];
  getCanvasItemIds?(): string[];
  getCanvasLineIds?(): string[];
  getCanvasNoteIds?(): string[];
  getCanvasPolygonIds?(): string[];
  getRectItemData?(rectId: string): Record<string, unknown> | null;
  getRectData?(rectId: string): Record<string, unknown> | null;
  getCluster?(clusterId: string): unknown | null;
  getWorkspaceImage?(): string | null;
  addCluster?(x: number, y: number, label: string): unknown | null;
  addNote?(x: number, y: number, scale: number, text: string): unknown | null;
  addTextPopup?(x: number, y: number, scale: number, type: number, text: string): unknown | null;
  addRemoteNetwork?(x: number, y: number, network: string, mask: string): unknown | null;
  removeCluster?(clusterId: string): boolean;
  removeCanvasItem?(itemId: string): boolean;
  removeTextPopup?(popupId: string): boolean;
  removeRemoteNetwork?(networkId: string): boolean;
  changeNoteText?(noteId: string, text: string): boolean;
  setCanvasItemRealPos?(itemId: string, x: number, y: number): boolean;
  setDeviceCustomImage?(deviceName: string, imagePath: string): boolean;
  showClusterContents?(clusterId: string): void;
  unCluster?(clusterId: string): void;
  clearLayer?(layerId: number): void;
  drawCircle?(x: number, y: number, radius: number, color: string): unknown | null;
  drawLine?(x1: number, y1: number, x2: number, y2: number, color: string): unknown | null;
  centerOn?(x: number, y: number): void;
  centerOnComponentByName?(deviceName: string): void;
  devicesAt?(
    x: number,
    y: number,
    width: number,
    height: number,
    includeClusters: boolean,
  ): unknown[];
}

// ============================================================================
// Simulation interfaces
// ============================================================================

export interface PTSimulation {
  backward(): void;
  forward(): void;
  resetSimulation(): void;
  setSimulationMode(enabled: boolean): void;
  isSimulationMode(): boolean;
  createFrameInstance(): any;
  getCurrentSimTime(): number;
  getClassName?(): string;
  getObjectUuid?(): string;
}

export interface PTOptions {
  setAnimation(enabled: boolean): void;
  setSound(enabled: boolean): void;
  setHideDevLabel(enabled: boolean): void;
  setDeviceModelShown(enabled: boolean): void;
  setMainToolbarShown(enabled: boolean): void;
  setCliTabHidden(enabled: boolean): void;
  getClassName?(): string;
  getObjectUuid?(): string;
}

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

// ============================================================================
// File Manager interfaces
// ============================================================================

export interface PTFileManager {
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
  getEncryptedFileBinaryContents?(path: string): Uint8Array;
  encrypt?(content: string): string;
  encryptBinary?(content: Uint8Array): Uint8Array;
  encryptFile?(src: string, dest: string): boolean;
  decrypt?(content: string): string;
  decryptBinary?(content: Uint8Array): Uint8Array;
  decryptFile?(src: string, dest: string): boolean;
  zipDirectory?(srcDir: string, destFile: string): boolean;
  zipDirectoryTo?(srcDir: string, destFile: string): boolean;
  zipDirectoryWithPassword?(srcDir: string, destFile: string, password: string): boolean;
  zipDirectoryToWithPassword?(srcDir: string, destFile: string, password: string): boolean;
  unzipFile?(zipFile: string): boolean;
  unzipFileTo?(zipFile: string, destDir: string): boolean;
  unzipFileWithPassword?(zipFile: string, password: string): boolean;
  unzipFileToWithPassword?(zipFile: string, destDir: string, password: string): boolean;
  getAbsolutePath?(path: string): string;
  getRelativePath?(path: string, base: string): string;
  isAbsolutePath?(path: string): boolean;
  isRelativePath?(path: string): boolean;
  convertToNativeSeparators?(path: string): string;
  convertFromNativeSeparators?(path: string): string;
  getFileWatcher?(path: string): PTFileWatcher | null;
  getOpenFileName?(filter?: string): string | null;
  getOpenFileNames?(filter?: string): string[];
  getSaveFileName?(defaultName?: string): string | null;
  getSelectedDirectory?(): string | null;
  getClassName?(): string;
  getObjectUuid?(): string;
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

// ============================================================================
// Constants
// ============================================================================

export const PT_DEVICE_TYPE_CONSTANTS: Record<string, number> = {
  router: 0,
  switch: 1,
  hub: 2,
  bridge: 3,
  repeater: 4,
  coaxialSplitter: 5,
  wireless: 7,
  pc: 8,
  server: 9,
  printer: 10,
  wirelessRouter: 11,
  ipPhone: 12,
  dslModem: 13,
  cableModem: 14,
  multilayerSwitch: 16,
  laptop: 18,
  tablet: 19,
  smartphone: 20,
  wirelessEndDevice: 21,
  wiredEndDevice: 22,
  tv: 23,
  homeVoip: 24,
  analogPhone: 25,
  firewall: 27,
  iot: 34,
  sniffer: 35,
  mcu: 36,
  sbc: 37,
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

export const PT_API_METHOD_INDEX: Record<string, string[]> = {
  PTIpc: ["network", "appWindow", "systemFileManager", "simulation", "hardwareFactory", "ipcManager", "multiUserManager", "userAppManager", "commandLog", "options"],
  PTAppWindow: ["getActiveWorkspace", "getVersion", "fileNew", "fileOpen", "fileSave", "fileSaveAs", "fileSaveAsPkz", "getClipboardText", "setClipboardText", "openURL", "getWidth", "getHeight", "getX", "getY", "showNormal", "showMaximized", "showMinimized", "setWindowGeometry"],
  PTWorkspace: ["getLogicalWorkspace", "getGeoView", "getRackView", "zoomIn", "zoomOut", "zoomReset", "getEnvironmentTimeInSeconds", "pauseEnvironmentTime", "resumeEnvironmentTime", "resetEnvironment"],
  PTLogicalWorkspace: ["addDevice", "removeDevice", "removeObject", "deleteObject", "createLink", "autoConnectDevices", "deleteLink", "addCluster", "addNote", "addTextPopup", "addRemoteNetwork", "changeNoteText", "setCanvasItemRealPos", "setDeviceCustomImage", "clearLayer", "drawCircle", "drawLine", "getCanvasRectIds", "getCanvasEllipseIds", "getCanvasItemIds", "getCanvasNoteIds", "getRectItemData", "centerOn", "centerOnComponentByName", "devicesAt"],
  PTNetwork: ["getDevice", "getDeviceAt", "getDeviceCount", "getLinkAt", "getLinkCount"],
  PTDevice: ["getName", "setName", "getModel", "getType", "getPower", "setPower", "skipBoot", "getCommandLine", "getPortCount", "getPortAt", "getPort", "addModule", "removeModule", "setDhcpFlag", "getDhcpFlag", "moveToLocation", "moveToLocationCentered", "getX", "getY", "serializeToXml", "getProcess", "getRootModule", "isBooting", "restoreToDefault", "getUpTime", "getSerialNumber"],
  PTModule: ["getSlotCount", "getSlotTypeAt", "getModuleCount", "getModuleAt", "addModuleAt", "removeModuleAt", "getPortCount", "getPortAt", "getOwnerDevice"],
  PTServer: ["enableCip", "disableCip", "enableOpc", "disableOpc", "enableProfinet", "disableProfinet", "addProgrammingSerialOutputs", "clearProgrammingSerialOutputs", "addUserDesktopApp", "removeUserDesktopApp", "isDesktopAvailable"],
  PTAsa: ["addBookmark", "removeBookmark", "getBookmarkCount", "getWebvpnUserManager", "setHostName", "setEnablePassword", "setEnableSecret"],
  PTCloud: ["addPhoneConnection", "addPortConnection", "addSubLinkConnection", "removePortConnection", "removeAllPortConnection", "isDslConnection"],
  PTMcu: ["analogWrite", "digitalWrite", "analogRead", "digitalRead", "getSlotsCount", "getAnalogSlotsCount", "getDigitalSlotsCount", "getComponentAtSlot", "getComponentByName", "enableIec61850", "disableIec61850", "enableGoosePublisherOnPort", "setSubComponentIndex"],
  PTWirelessRouter: ["addNatEntry", "removeNatEntry", "setDMZEntry", "isRemoteManagementEnable"],
  PTSimulation: ["backward", "forward", "resetSimulation", "setSimulationMode", "isSimulationMode", "createFrameInstance", "getCurrentSimTime"],
  PTOptions: ["setAnimation", "setSound", "setHideDevLabel", "setDeviceModelShown", "setMainToolbarShown", "setCliTabHidden"],
  PTCommandLog: ["getLogCount", "getLogAt", "clearLog"],
  PTCommandLine: ["enterCommand", "getPrompt", "getMode", "getCommandInput", "enterChar", "registerEvent", "unregisterEvent"],
  PTPort: ["getName", "getIpAddress", "getSubnetMask", "setIpSubnetMask", "getDefaultGateway", "setDefaultGateway", "getDnsServerIp", "setDnsServerIp", "setDhcpEnabled", "setDhcpClientFlag", "isDhcpClientOn", "setIpv6Enabled", "getIpv6Enabled", "getIpv6Address", "setIpv6AddressAutoConfig", "setv6DefaultGateway", "getv6DefaultGateway", "setv6ServerIp", "getv6ServerIp", "setIpv6Mtu", "getIpv6Mtu", "isPortUp", "isProtocolUp", "isPowerOn", "setPower", "setInboundFirewallService", "getInboundFirewallService", "setMtu", "getMtu", "setIpMtu", "getIpMtu", "getBia", "isEthernetPort", "isWirelessPort", "getBandwidth", "setBandwidth", "getDelay", "setDelay", "isFullDuplex", "setFullDuplex"],
  PTRouterPort: ["getOspfCost", "setOspfCost", "getOspfPriority", "setOspfPriority", "getOspfHelloInterval", "getOspfDeadInterval", "getOspfAuthKey", "getOspfAuthType", "addOspfMd5Key", "removeOspfMd5Key", "addEntryEigrpPassive", "removeEntryEigrpPassive", "isRipPassive", "setRipPassive", "isRipSplitHorizon", "setRipSplitHorizon", "getIpv6Addresses", "addIpv6Address", "getNatMode", "setNatMode", "getAclInID", "setAclInID", "getAclOutID", "setAclOutID", "setZoneMemberName", "getZoneMemberName", "getClockRate", "setClockRate"],
  PTSwitchPort: ["getAccessVlan", "setAccessVlan", "getNativeVlanId", "setNativeVlanId", "getVoipVlanId", "setVoipVlanId", "addTrunkVlans", "removeTrunkVlans", "isAccessPort", "isAdminModeSet", "isNonegotiate", "setNonegotiateFlag", "getPortSecurity", "getStpStatus"],
  PTRoutedSwitchPort: ["isRoutedPort", "setRoutedPort"],
  PTCloudSerialPort: ["addDlci", "removeDlci", "getDlciCount", "getDlciAt"],
  PTCloudPotsPort: ["getPhoneNumber", "setPhoneNumber"],
};