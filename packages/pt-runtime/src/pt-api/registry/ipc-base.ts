// PTIpcBase and PTIpc — root interface for all Packet Tracer IPC objects

/**
 * Root interface for all Packet Tracer IPC objects.
 * Every object in PT (Devices, Ports, Modules, Processes) inherits from this base.
 */
export interface PTIpcBase {
  getClassName(): string; // [CONFIRMED];
  getObjectUuid(): string; // [CONFIRMED];
  registerEvent(event: string, context: any, handler: Function): void;
  unregisterEvent(event: string, context: any, handler: Function): void;
  registerDelegate(event: string, context: any, handler: Function): void;
  unregisterDelegate(event: string, context: any, handler: Function): void;
  registerObjectEvent(event: string, context: any, handler: Function): void;
  unregisterObjectEvent(event: string, context: any, handler: Function): void;
}

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
  // getNetwork() is an alias present in some PT versions — prefer network()
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

// Forward declarations resolved via barrel
interface PTNetwork {}
interface PTAppWindow {}
interface PTFileManager {}
interface PTSimulation {}
interface PTHardwareFactory {}
interface PTIpcManager {}
interface PTMultiUserManager {}
interface PTUserAppManager {}
interface PTCommandLog {}
interface PTOptions {}