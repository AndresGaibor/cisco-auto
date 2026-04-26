// PTModule, PTHardwareFactory interfaces
import type { PTIpcBase } from "./ipc-base.js";
import type { PTDevice } from "./device-api.js";
import type { PTPort } from "./port-api.js";

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
  getPortCount(): number; // [CONFIRMED];
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