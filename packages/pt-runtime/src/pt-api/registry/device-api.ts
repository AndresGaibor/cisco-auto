// PTDevice, PTPort, PTRouterPort, PTSwitchPort, PTHostPort, PTRoutedSwitchPort

import type { PTIpcBase } from "./ipc-base.js";

// Forward declarations to break circular imports
interface PTCommandLine {}
interface PTModule {}
interface PTProcess {}
interface PTPort {}

// ============================================================================
// Device interfaces
// ============================================================================

export interface PTDevice extends PTIpcBase {
  getName(): string; // [CONFIRMED];
  setName(name: string): void;
  getModel(): string; // [CONFIRMED];
  getType(): number; // [CONFIRMED];
  getPower(): boolean; // [CONFIRMED];
  setPower(on: boolean): void;
  skipBoot(): undefined; // [CONFIRMED];
  getCommandLine(): PTCommandLine | null;
  getPortCount(): number; // [CONFIRMED];
  getPortAt(index: number): PTPort | null;
  getPort(name: string): PTPort | null;
  addModule(slot: string, module: string): boolean;
  removeModule(slot: string): boolean;
  setDhcpFlag(enabled: boolean): void;
  getDhcpFlag(): boolean; // [CONFIRMED];
  moveToLocation(x: number, y: number): boolean;
  moveToLocationCentered(x: number, y: number): boolean;
  getX?(): number;
  getY?(): number;
  serializeToXml?(): string;
  activityTreeToXml?(): string;

  // Customization & Media
  addCustomVar(name: string, value: string): void;
  getCustomVar(name: string): string;
  addSound(soundId: string, path: string): void;
  destroySounds(): undefined; // [CONFIRMED];

  // App Management
  addUserDesktopApp(appId: string): void;
  addUserDesktopAppFrom(appId: string, source: string): void;
  addUserDesktopAppFromGlobal(appId: string): void;
  removeUserDesktopApp(appId: string): void;
  isDesktopAvailable(): boolean; // [CONFIRMED];

  // Internal State
  getProcess<T = PTProcess>(name: string): T | null;
  getRootModule?(): PTModule | null;
  getUpTime?(): number;
  getSerialNumber?(): string;
  isBooting?(): boolean;
  restoreToDefault?(): void;

  // Advanced Identification
  addDeviceExternalAttributes(attrs: any): void;
  clearDeviceExternalAttributes(): undefined; // [CONFIRMED];
}

// Re-export PTPort so consumers get it from device-api
export { PTPort };