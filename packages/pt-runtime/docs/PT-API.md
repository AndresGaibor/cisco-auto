# PT IPC API Reference

> Documented: 2026-04-15
> Source: `src/pt-api/pt-api-registry.ts`, `docs/PT-API-COMPLETE.md`
> Status: ✅ Complete — all interfaces verified against PT 9.0.0.0810

---

## Global Scope

PT Script Engine exposes these globals in all scripts:

```javascript
var ipc;       // PTIpc — Inter-process communication
var fm;        // PTFileManager — File operations (may be undefined in some PT versions)
var dprint;    // Function — PT Activity Log output
var self;      // PTGlobalScope — Global object (use instead of globalThis)
```

> **NOTE:** `globalThis` is NOT available in PT QTScript. Always use `self` or `(typeof self !== "undefined") ? self : this`.

> **Note:** The real PT runtime was deep-scanned across 47 device types. See `docs/PT-API-COMPLETE.md` for the verified `typeId` map, process inventory, and event surfaces.

---

## IPC Access

```javascript
ipc.network()              // → PTNetwork
ipc.appWindow()            // → PTAppWindow
ipc.systemFileManager()    // → PTFileManager (may be undefined in PT 9.0)
ipc.simulation()           // → PTSimulation (optional)
ipc.hardwareFactory()      // → PTHardwareFactory (optional)
ipc.ipcManager()           // → PTIpcManager (optional)
ipc.multiUserManager()     // → PTMultiUserManager (optional)
ipc.userAppManager()       // → PTUserAppManager (optional)
ipc.commandLog()            // → unknown (optional)
ipc.options()              // → unknown (optional)
ipc.getObjectByUuid(uuid)  // → unknown | null
ipc.getObjectUuid(obj)     // → string | null
ipc.registerEvent(event, context, handler)        // void
ipc.unregisterEvent(event, context, handler)     // void
ipc.registerDelegate(event, context, handler)     // void
ipc.unregisterDelegate(event, context, handler)  // void
ipc.registerObjectEvent(event, context, handler)  // void
ipc.unregisterObjectEvent(event, context, handler) // void
```

### Runtime findings

- `registerEvent()` was observed as `registerEvent(eventName, context, handler)`.
- `registerDelegate()` and `registerObjectEvent()` are present on many objects but usually expose the same base registration surface.
- `getProcess()` exists on many devices and returns family-specific process objects such as DHCP, VLAN, routing, ACL, DNS, HTTP, SSH, and IoT control processes.
- `getRootModule()` is the main entry point for modular devices; use it before traversing module trees.
- `serializeToXml()` is available on most large device families and can be used to snapshot object state for offline inspection.

### Alternative IPC Access

```javascript
$ipc()                    // Function — same as ipc when called
$ipc.network()           // → PTNetwork
$ipcObject               // unknown — raw IPC object
_ScriptModule = {
  ipcCall(className, method, args),   // low-level IPC call
  ipcObjectCall(className, method, args),
  getIpcApi(),                        // → PTIpc (same as ipc)
  registerIpcEventByID(eventId, handler),
  unregisterIpcEventByID(eventId),
  unregisterAllIpcEvents()
}
```

---

## PTNetwork

Network inventory — enumerate all devices and links.

```typescript
interface PTNetwork {
  getDevice(name: string): PTDevice | null;
  getDeviceAt(index: number): PTDevice | null;
  getDeviceCount(): number;
  getLinkAt?(index: number): PTLink | null;   // optional
  getLinkCount?(): number;                     // optional
  getTotalDeviceAttributeValue?(attribute: string): number; // optional
}
```

---

## PTDevice

Represents a device in the simulation.

```typescript
interface PTDevice {
  // Identity
  getName(): string;
  setName(name: string): void;
  getModel(): string;
  getType(): number;           // device type ID (0=router, 1=switch, 8=pc, 9=server)

  // Power
  getPower(): boolean;
  setPower(on: boolean): void;
  skipBoot(): void;

  // CLI
  getCommandLine(): PTCommandLine | null;

  // Ports
  getPortCount(): number;
  getPortAt(index: number): PTPort | null;
  getPort(name: string): PTPort | null;

  // Modules
  addModule(slot: string, module: string): boolean;
  removeModule(slot: string): boolean;
  getRootModule?(): PTModule | null;   // for modular routers (2811, 2911, 1941)

  // Position
  moveToLocation(x: number, y: number): boolean;
  moveToLocationCentered(x: number, y: number): boolean;
  getX?(): number;                      // canvas X coordinate
  getY?(): number;                      // canvas Y coordinate

  // DHCP
  getDhcpFlag(): boolean;
  setDhcpFlag(enabled: boolean): void;

  // Process
  getProcess?<T = unknown>(name: string): T | null;

  // Serialization
  serializeToXml?(): string;
}
```

---

## PTCommandLine

IOS CLI terminal. Commands are async — results come via events.

```typescript
interface PTCommandLine {
  // Command execution (async)
  enterCommand(cmd: string): void;    // returns void — listen for events
  enterChar(charCode: number, modifier: number): void;

  // State
  getPrompt(): string;
  getMode(): string;
  getCommandInput(): string;

  // Events
  registerEvent(
    eventName: PTTerminalEventName,
    context: null,
    handler: (source: any, args: any) => void
  ): void;
  unregisterEvent(
    eventName: PTTerminalEventName,
    context: null,
    handler: (source: any, args: any) => void
  ): void;
}
```

### Terminal Events (PTTerminalEventName)

```typescript
type PTTerminalEventName =
  | "commandStarted"              // Command began execution
  | "outputWritten"               // Output data accumulated
  | "commandEnded"                // Command finished (status available)
  | "modeChanged"                 // IOS mode changed (exec/config/etc)
  | "promptChanged"                // Prompt text updated
  | "moreDisplayed"                // --More-- pager activated
  | "directiveSent"                // directive sent to terminal
  | "commandSelectedFromHistory"   // user selected from history
  | "commandAutoCompleted"         // CLI auto-completed
  | "cursorPositionChanged";       // cursor moved
```

### Event Args

```typescript
interface PTOutputWrittenArgs {
  newOutput: string;
  isDebug?: boolean;
}

interface PTCommandStartedArgs {
  inputCommand: string;
  completeCommand: string;
  inputMode: string;
  processedCommand?: string;
}

interface PTCommandEndedArgs {
  status: number;    // 0 = OK
}

interface PTModeChangedArgs {
  newMode: string;
}

interface PTPromptChangedArgs {
  newPrompt: string;
}

interface PTMoreDisplayedArgs {
  active: boolean;
}
```

---

## PTPort

Network interface on a device.

```typescript
interface PTPort {
  // Basic
  getName(): string;
  getIpAddress(): string;
  getSubnetMask(): string;
  setIpSubnetMask(ip: string, mask: string): void;
  getDefaultGateway(): string;
  setDefaultGateway(gateway: string): void;

  // DHCP
  getDnsServerIp(): string;
  setDnsServerIp(dns: string): void;
  setDhcpEnabled(enabled: boolean): void;
  setDhcpClientFlag(enabled: boolean): void;
  isDhcpClientOn(): boolean;

  // IPv6
  getIpv6Enabled(): boolean;
  setIpv6Enabled(enabled: boolean): void;
  getIpv6Address(): string;
  setIpv6AddressAutoConfig(enabled: boolean): void;
  getv6DefaultGateway(): string;
  setv6DefaultGateway(gateway: string): void;
  getv6ServerIp(): string;
  setv6ServerIp(dns: string): void;
  getIpv6Mtu(): number;
  setIpv6Mtu(mtu: number): void;

  // Status
  isPortUp(): boolean;
  isProtocolUp(): boolean;

  // Firewall
  setInboundFirewallService(state: string): void;
  getInboundFirewallService(): string;
  getInboundFirewallServiceStatus(): string;
  setInboundIpv6FirewallService(state: string): void;
  getInboundIpv6FirewallService(): string;
  getInboundIpv6FirewallServiceStatus(): string;

  // MTU
  getMtu(): number;
  setMtu(mtu: number): void;
  getIpMtu(): number;
  setIpMtu(mtu: number): void;

  // Connector
  getConnectorType?(): string;
}
```

---

## PTAppWindow

PT application window control.

```typescript
interface PTAppWindow {
  // Workspace
  getActiveWorkspace(): PTWorkspace;
  getVersion(): string;           // e.g. "9.0.0.0810"
  getBasePath(): string;
  getTempFileLocation(): string;
  getUserFolder(): string;

  // Mode
  isPTSA(): boolean;
  isRealtimeMode(): boolean;
  isSimulationMode(): boolean;
  isLogicalMode(): boolean;
  isPhysicalMode(): boolean;

  // Window geometry
  getWidth(): number;
  getHeight(): number;
  getX(): number;
  getY(): number;
  isMaximized(): boolean;
  isMinimized(): boolean;
  setMaximumSize(width: number, height: number): void;
  setMinimumSize(width: number, height: number): void;
  setWindowGeometry?(x: number, y: number, width: number, height: number): void;
  setWindowTitle?(title: string): void;

  // Visibility
  setVisible(visible: boolean): void;
  showNormal(): void;
  showMaximized(): void;
  showMinimized(): void;
  raise(): void;
  zoomIn?(): void;
  zoomOut?(): void;
  zoomReset?(): void;

  // File
  fileNew(...args: any[]): void;
  fileOpen(path?: string): void;
  fileOpenFromBytes?(bytes: Uint8Array, name: string): void;
  fileOpenFromURL?(url: string): void;
  fileSave(): void;
  fileSaveAs(path?: string): void;
  fileSaveAsPkz?(path: string): void;
  fileSaveAsAsync?(path: string, callback: Function): void;
  fileSaveToBytes?(): Uint8Array;

  // Dialogs
  showMessageBox(message: string, title?: string): number;
  showMessageBoxWithCustomButtons?(message: string, title: string, buttons: string[]): number;
  openURL(url: string): void;

  // Clipboard
  getClipboardText(): string;
  setClipboardText(text: string): void;

  // Directory
  listDirectory(path: string): string[];

  // UI panels (all return unknown)
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

  // Area dimensions
  getMainViewAreaWidth?(): number;
  getMainViewAreaHeight?(): number;
  getMaximumWidth?(): number;
  getMaximumHeight?(): number;
  getMinimumWidth?(): number;
  getMinimumHeight?(): number;

  // Security / lifecycle
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
  exit(): void;
  exitNoConfirm(): void;
}
```

---

## PTWorkspace

Container for logical/physical/geographical views.

```typescript
interface PTWorkspace {
  getLogicalWorkspace(): PTLogicalWorkspace;

  // Views
  getGeoView?(): unknown;
  getRackView?(): unknown;
  isLogicalView?(): boolean;
  isGeoView?(): boolean;
  isRackView?(): boolean;
  switchToPhysicalObject?(obj: unknown): void;

  // Z-level
  getZLevel?(): number;
  setBaseZLevel?(level: number): void;

  // Zoom
  zoomIn?(): void;
  zoomOut?(): void;
  zoomReset?(): void;

  // Background
  setLogicalBackgroundPath?(path: string): void;
  setVisible?(visible: boolean): void;
  fillColor?(color: string): void;

  // Properties
  hasProperty?(name: string): boolean;
  getProperty?(name: string): unknown;
  setProperty?(name: string, value: unknown): void;
  getProperties?(): Record<string, unknown>;

  // Object manipulation
  setThingCustomText?(obj: unknown, text: string): void;
  setThingRotation?(obj: unknown, rotation: number): void;
  setComponentOpacity?(obj: unknown, opacity: number): void;
  setComponentRotation?(obj: unknown, rotation: number): void;
  setParentGraphicFromComponent?(obj: unknown, component: unknown): void;
  moveItemInWorkspace?(obj: unknown, x: number, y: number): void;

  // Environment time (simulation)
  getEnvironmentTimeInSeconds?(): number;
  pauseEnvironmentTime?(): void;
  resumeEnvironmentTime?(): void;
  resetEnvironment?(): void;

  // Root object
  getRootPhysicalObject?(): unknown;
  getCurrentPhysicalObject?(): unknown;

  // Enumeration
  devicesAt?(
    x: number,
    y: number,
    width: number,
    height: number,
    includeClusters: boolean
  ): unknown[];

  // Identity
  getClassName?(): string;
  getObjectUuid?(): string;
}
```

---

## PTLogicalWorkspace

Topology manipulation — add/remove devices and links.

```typescript
interface PTLogicalWorkspace {
  // Devices
  addDevice(typeId: number, model: string, x: number, y: number): string | null;
  removeDevice(name: string): boolean;
  deleteDevice(name: string): boolean;        // ⚠️ may not exist in PT 9.0
  removeObject(name: string): boolean;
  deleteObject(name: string): boolean;

  // Links
  createLink(
    device1Name: string,
    port1Name: string,
    device2Name: string,
    port2Name: string,
    cableType: number
  ): PTLink | null;                            // ⚠️ returns null in PT 9.0
  autoConnectDevices(device1Name: string, device2Name: string): void;  // ✅ WORKS
  deleteLink(deviceName: string, portName: string): boolean;           // ✅ WORKS

  // Canvas items
  getCanvasRectIds?(): string[];
  getRectItemData?(rectId: string): Record<string, unknown> | null;
  getRectData?(rectId: string): Record<string, unknown> | null;

  // Find devices in area
  devicesAt?(
    x: number,
    y: number,
    width: number,
    height: number,
    includeClusters: boolean
  ): unknown[];
}
```

> **NOTE:** `autoConnectDevices()` only takes 2 device name arguments — NOT port names. Returns `void`. Use `deleteLink(deviceName, portName)` with any one port of the link to remove it.

---

## PTFileManager

File system within PT sandbox.

```typescript
interface PTFileManager {
  // Core I/O
  getFileContents(path: string): string;
  getFileBinaryContents?(path: string): Uint8Array;
  writePlainTextToFile(path: string, content: string): void;
  writeBinaryToFile?(path: string, content: Uint8Array): void;
  writeTextToFile?(path: string, content: string): void;

  // File existence
  fileExists(path: string): string | boolean;  // returns path or false
  directoryExists(path: string): boolean;
  getFilesInDirectory(path: string): string[];
  getFileModificationTime(path: string): number;
  getFileSize?(path: string): number;
  getFileCheckSum?(path: string): string;
  getFilePermissions?(path: string): string;
  setFilePermissions?(path: string, permissions: string): boolean;

  // Directory
  makeDirectory(path: string): boolean;
  removeFile(path: string): boolean;
  removeDirectory?(path: string): boolean;

  // Move/copy
  moveSrcFileToDestFile(src: string, dest: string): boolean;
  copySrcFileToDestFile?(src: string, dest: string): boolean;
  copySrcDirectoryToDestDirectory?(src: string, dest: string): boolean;

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

  // File watcher (for hot reload)
  getFileWatcher?(path: string): PTFileWatcher | null;

  // Dialogs
  getOpenFileName?(filter?: string): string | null;
  getOpenFileNames?(filter?: string): string[];
  getSaveFileName?(defaultName?: string): string | null;
  getSelectedDirectory?(): string | null;

  // Events
  registerEvent?(event: string, context: any, handler: Function): void;
  registerDelegate?(event: string, context: any, handler: Function): void;
  unregisterEvent?(event: string, context: any, handler: Function): void;
  unregisterDelegate?(event: string, context: any, handler: Function): void;
  registerObjectEvent?(event: string, context: any, handler: Function): void;
  unregisterObjectEvent?(event: string, context: any, handler: Function): void;

  // Identity
  getClassName?(): string;
  getObjectUuid?(): string;
}
```

> **⚠️ CRITICAL:** `ipc.systemFileManager()` returned `undefined` in PT 9.0.0.0810. Do NOT assume `fm` is available. Check `typeof ipc.systemFileManager() !== 'undefined'` before use.

---

## PTFileWatcher

Watch a file for changes (used for hot reload).

```typescript
interface PTFileWatcher {
  register?(path: string, handler: (event: string) => void): void;
  unregister?(path?: string): void;
}
```

---

## PTLink

Represents a connection between two ports.

```typescript
interface PTLink {
  getClassName?(): string;
  getObjectUuid?(): string;
  getPort1?(): PTPort;     // RouterPort or SwitchPort
  getPort2?(): PTPort;
  getConnectionType?(): number;  // cable type ID
}
```

---

## PTModule

Module inserted in a modular router or expandable platform (HWIC, WIC, NM slots).

```typescript
interface PTModule {
  getSlotCount(): number;
  getSlotTypeAt(index: number): number;   // 0=eLineCard, 1=eNetworkModule, 2=eInterfaceCard
  getModuleCount(): number;
  getModuleAt(index: number): PTModule | null;
  addModuleAt(moduleId: string, slotIndex: number): boolean;
  getModuleNameAsString?(): string;
  getSlotPath?(): string;
  getModuleType?(): number;
}
```

> **Runtime note:** `getRootModule()` is the entry point for traversing module trees. In the 2911/2811/1941 flow, the root module exposes slot candidates and child modules recursively.

> **Slot hierarchy (2811/2911/1941):** Modules with slots (for HWIC/WIC insertion) have type `2` (eInterfaceCard). Root module has type `18` (eNonRemovableModule). See `docs/PT-API-COMPLETE.md` § addModule() for full details.

---

## PTHardwareFactory

Resolve device/cable names to type IDs.

```typescript
interface PTHardwareFactory {
  getDeviceType?(name: string): number | null;
  getCableType?(name: string): number | null;
  getClassName?(): string;
  getObjectUuid?(): string;
}
```

---

## PTSimulation

Simulation mode control.

```typescript
interface PTSimulation {
  backward?(): void;
  forward?(): void;
  resetSimulation?(): void;
  setSimulationMode?(enabled: boolean): void;
  createFrameInstance?(): unknown;
  getCurrentSimTime?(): number;
  getClassName?(): string;
  getObjectUuid?(): string;
}
```

---

## PTIpcManager / PTMultiUserManager / PTUserAppManager

```typescript
interface PTIpcManager {
  getClassName?(): string;
  getObjectUuid?(): string;
}

interface PTMultiUserManager {
  getClassName?(): string;
  getObjectUuid?(): string;
}

interface PTUserAppManager {
  getClassName?(): string;
  getObjectUuid?(): string;
}
```

---

## Device Type Constants

```typescript
const PT_DEVICE_TYPE = {
  router:           0,    // Router className="Router"
  switch:           1,    // CiscoDevice className="CiscoDevice"
  hub:              2,
  bridge:           3,
  repeater:         4,
  wireless:         5,
  wanEmulator:     6,
  multilayerSwitch:16,    // className="Router" (3650, 3560, IE-2000, etc.)
  cloud:            7,
  pc:               8,    // className="Pc"
  server:           9,    // className="Server"
  printer:         10,
  ipPhone:         11,
  laptop:          12,
  tablet:          13,
  smartphone:       14,
  wirelessEndDevice:15,
  wiredEndDevice:  17,
  tv:              18,
  homeVoip:        19,
  analogPhone:      20,
  iot:             21,
  sniffer:         22,
  mcu:             23,
  sbc:             24,
  // ASA: 27  (className="ASA")
  // WLC: 41  (className="CiscoDevice")
  // IoT components: 39 (className="MCUComponent")
};
```

> **NOTE:** `device.getClassName()` is the canonical way to identify device type. typeId alone is ambiguous — multiple classNames share the same typeId.

---

## Cable Type Constants

```typescript
const PT_CABLE_TYPE = {
  auto:      -1,
  straight:   0,   // Copper Straight-Through
  cross:      1,   // Copper Cross-Over
  fiber:      2,   // Fiber
  serial:     3,   // Serial
  console:    4,   // Console
  phone:      5,   // Phone
  cable:      6,   // Generic Cable
  roll:       7,   // Rollover
  wireless:   8,   // Wireless
  coaxial:    9,   // Coaxial
  custom:    10,
  octal:     11,
  cellular:  12,
  usb:       13,
};
```

---

## PT-Safe Global Pattern

Use `self` instead of `globalThis` for QTScript compatibility:

```javascript
// WRONG — globalThis not defined in PT
if (typeof globalThis !== "undefined") { ... }

// CORRECT
var _global = (typeof self !== "undefined") ? self : this;
```

---

## See Also

- `docs/PT-API-COMPLETE.md` — Extensive testing results (1348 lines), verified method lists, device catalog, module catalog, boot detection, CLI automation, addModule() strategy
- `docs/PT9-Debugging.md` — Debugging approach (paste code in PT console), `ipc.systemFileManager()` unavailable discovery
- `docs/ARCHITECTURE.md` — main.js vs runtime.js boundary, data flow, directory structure
- `docs/BUILD.md` — Build pipeline, PT-safe rules, source manifests
- `src/pt-api/pt-api-registry.ts` — Source of truth for all interface definitions
