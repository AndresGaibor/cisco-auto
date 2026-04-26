// PTAppWindow, PTWorkspace, PTLogicalWorkspace interfaces
import type { PTIpcBase } from "./ipc-base.js";

// ============================================================================
// Workspace interfaces
// ============================================================================

export interface PTAppWindow {
  getActiveWorkspace(): PTWorkspace;
  getVersion(): string; // [CONFIRMED];
  getBasePath(): string; // [CONFIRMED];
  getTempFileLocation(): string; // [CONFIRMED];
  getUserFolder(): string; // [CONFIRMED];
  isPTSA(): boolean; // [CONFIRMED];
  isRealtimeMode(): boolean; // [CONFIRMED];
  isSimulationMode(): boolean; // [CONFIRMED];
  isLogicalMode(): boolean; // [CONFIRMED];
  isPhysicalMode(): boolean; // [CONFIRMED];
  isMaximized(): undefined; // [CONFIRMED];
  isMinimized(): undefined; // [CONFIRMED];
  fileNew(): void;
  fileOpen(path?: string): void;
  fileOpenFromBytes?(bytes: Uint8Array, name: string): void;
  fileOpenFromURL?(url: string): void;
  fileSave(): boolean; // [CONFIRMED];
  fileSaveAs(path?: string): void;
  fileSaveAsPkz?(path: string): void;
  fileSaveAsAsync?(path: string, callback: Function): void;
  fileSaveToBytes?(): Uint8Array;
  exit(): void;
  exitNoConfirm(): void;
  showMessageBox(message: string, title?: string): number;
  showMessageBoxWithCustomButtons?(message: string, title: string, buttons: string[]): number;
  openURL(url: string): void;
  getClipboardText(): string; // [CONFIRMED];
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
  getWidth(): number; // [CONFIRMED];
  getHeight(): number; // [CONFIRMED];
  getX(): number; // [CONFIRMED];
  getY(): number; // [CONFIRMED];
  setVisible(visible: boolean): void;
  showNormal(): undefined; // [CONFIRMED];
  showMaximized(): undefined; // [CONFIRMED];
  showMinimized(): undefined; // [CONFIRMED];
  setMaximumSize(width: number, height: number): void;
  setMinimumSize(width: number, height: number): void;
  setWindowGeometry?(x: number, y: number, width: number, height: number): void;
  setWindowTitle?(title: string): void;
  raise(): undefined; // [CONFIRMED];
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
  // Devices
  addDevice(typeId: number, model: string, x: number, y: number): string | null;
  removeDevice(name: string): boolean;
  removeObject(name: string): boolean;
  deleteObject(name: string): boolean;

  // Links
  createLink(
    device1Name: string,
    port1Name: string,
    device2Name: string,
    port2Name: string,
    cableType: number,
  ): PTLink | null;
  autoConnectDevices(device1Name: string, device2Name: string): void;
  deleteLink(deviceName: string, portName: string): boolean;

  // Canvas items
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

  // Canvas manipulation
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

  // View
  centerOn?(x: number, y: number): void;
  centerOnComponentByName?(deviceName: string): void;

  // Find devices in area
  devicesAt?(
    x: number,
    y: number,
    width: number,
    height: number,
    includeClusters: boolean,
  ): unknown[];
}

// Forward declaration — PTLink is defined in link-api.ts
export interface PTLink {
  getClassName?(): string;
  getObjectUuid?(): string;
  getConnectionType?(): number;
  getPort1?(): unknown | null;
  getPort2?(): unknown | null;
}