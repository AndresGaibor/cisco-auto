// Tipos de dispositivo (Packet Tracer)
// Dispositivos, módulos y constantes de tipo

import type { PTIpcBase } from "./ipc-base.js";

// Forward declarations para evitar dependencias circulares
interface PTCommandLine {}
interface PTPort {}
interface PTProcess {}

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