// Tipos de red (Packet Tracer IPC)
// Interfaz base para todos los objetos IPC de Packet Tracer

import type { PTIpcBase } from "./ipc-base.js";

// Forward declarations para evitar dependencias circulares
interface PTDevice {}
interface PTAppWindow {}
interface PTFileManager {}
interface PTSimulation {}
interface PTHardwareFactory {}
interface PTIpcManager {}
interface PTMultiUserManager {}
interface PTUserAppManager {}
interface PTCommandLog {}
interface PTOptions {}

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
// Link interface
// ============================================================================

export interface PTLink {
  getClassName?(): string;
  getObjectUuid?(): string;
  getConnectionType?(): number;
  getPort1?(): PTPort | null;
  getPort2?(): PTPort | null;
}

// Forward declaration para PTPort (definido en port.ts)
interface PTPort {}