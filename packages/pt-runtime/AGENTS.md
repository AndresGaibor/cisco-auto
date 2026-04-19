# AGENTS.md — @cisco-auto/pt-runtime

> Guía de desarrollo para agentes de IA que trabajan en el paquete pt-runtime.

## Propósito del Paquete

Generador de scripts PT (`main.js`, `runtime.js`, `catalog.js`) y API de tipos para Packet Tracer. El runtime se ejecuta dentro de PT y controla dispositivos via IPC.

> **FRONTERA ARQUITECTURAL**: `pt-runtime` es un **thin kernel** que contiene lifecycle, dispatch, primitives PT-safe, terminal engine, y adapters `omni` de bajo nivel. **NO contiene lógica de negocio**. Ver `docs/architecture/runtime-control-boundary.md`.

## Arquitectura General

```
src/
├── pt/                    # Código para PT Script Module (main.js)
│   ├── kernel/           # Boot, execution engine, kernel state, command queue, lease manager
│   └── terminal/         # Terminal engine, session state, prompt parsing
├── handlers/             # Handlers para operaciones (device-crud, device-discovery, device-listing, link, vlan, dhcp)
├── pt-api/               # Tipos PT (IPC API, constants, processes)
├── domain/               # Runtime result, deferred job plan
├── runtime/              # Runtime types, contracts, metrics, logger
├── core/                 # Middleware, registry, dispatcher, builder
├── utils/                # Helpers, parser generator, constants
├── build/                # Generadores de scripts (renderMainV2, renderRuntimeV2, renderCatalog)
└── value-objects/        # CableType, DeviceName, InterfaceName, SessionMode
```

## CLASES, FUNCIONES, MÉTODOS Y VARIABLES CLAVE

### Documentación PT (docs/) — FUENTE DE VERDAD

#### PT-API.md

```typescript
// Globals en todos los scripts PT
var ipc; // PTIpc — Inter-process communication
var fm; // PTFileManager — File operations (puede ser undefined en algunas versiones PT)
var dprint; // Function — PT Activity Log output
var self; // PTGlobalScope — Global object (usar en vez de globalThis)

// Acceso IPC
ipc.network(); // → PTNetwork
ipc.appWindow(); // → PTAppWindow
ipc.systemFileManager(); // → PTFileManager (puede ser undefined en PT 9.0)
ipc.simulation(); // → PTSimulation
ipc.hardwareFactory(); // → PTHardwareFactory
ipc.getObjectByUuid(uuid); // → unknown | null
ipc.getObjectUuid(obj); // → string | null
ipc.registerEvent(event, context, handler);
ipc.unregisterEvent(event, context, handler);
ipc.registerDelegate(event, context, handler);
ipc.unregisterObjectEvent(event, context, handler);

// PTNetwork - Inventario de red
interface PTNetwork {
  getDevice(name: string): PTDevice | null;
  getDeviceAt(index: number): PTDevice | null;
  getDeviceCount(): number;
  getLinkAt?(index: number): PTLink | null;
  getLinkCount?(): number;
}

// PTDevice
interface PTDevice {
  getName(): string;
  setName(name: string): void;
  getModel(): string;
  getType(): number; // 0=router, 1=switch, 8=pc, 9=server
  getPower(): boolean;
  setPower(on: boolean): void;
  skipBoot(): void;
  getCommandLine(): PTCommandLine | null;
  getPortCount(): number;
  getPortAt(index: number): PTPort | null;
  getPort(name: string): PTPort | null;
  addModule(slot: string, module: string): boolean;
  removeModule(slot: string): boolean;
  getRootModule?(): PTModule | null;
  moveToLocation(x: number, y: number): boolean;
  moveToLocationCentered(x: number, y: number): boolean;
  getX?(): number;
  getY?(): number;
  getDhcpFlag(): boolean;
  setDhcpFlag(enabled: boolean): void;
  serializeToXml?(): string;
  getProcess?<T>(name: string): T | null;
}

// PTCommandLine - Terminal IOS
interface PTCommandLine {
  enterCommand(cmd: string): void; // async, resultados via eventos
  getPrompt(): string;
  getMode(): string;
  getCommandInput(): string;
  enterChar(charCode: number, modifier: number): void;
  registerEvent(eventName: PTTerminalEventName, context: null, handler): void;
  unregisterEvent(eventName: PTTerminalEventName, context: null, handler): void;
}

// Terminal Events (PTTerminalEventName)
type PTTerminalEventName =
  | "commandStarted" // Command began execution
  | "outputWritten" // Output data accumulated
  | "commandEnded" // Command finished (status available)
  | "modeChanged" // IOS mode changed (exec/config/etc)
  | "promptChanged" // Prompt text updated
  | "moreDisplayed" // --More-- pager activated
  | "directiveSent" // directive sent to terminal
  | "commandSelectedFromHistory" // user selected from history
  | "commandAutoCompleted" // CLI auto-completed
  | "cursorPositionChanged"; // cursor moved

// PTPort
interface PTPort {
  getName(): string;
  getIpAddress(): string;
  getSubnetMask(): string;
  setIpSubnetMask(ip: string, mask: string): void;
  getDefaultGateway(): string;
  setDefaultGateway(gateway: string): void;
  isPortUp(): boolean;
  isProtocolUp(): boolean;
  getMacAddress(): string;
  setDhcpEnabled(enabled: boolean): void;
  setDhcpClientFlag(enabled: boolean): void;
  isDhcpClientOn(): boolean;
  setIpv6Enabled(enabled: boolean): void;
  getIpv6Enabled(): boolean;
  getIpv6Address(): string;
  setInboundFirewallService(state: string): void;
  getInboundFirewallService(): string;
  getMtu(): number;
  setMtu(mtu: number): void;
}

// PTAppWindow
interface PTAppWindow {
  getActiveWorkspace(): PTWorkspace;
  getVersion(): string; // e.g. "9.0.0.0810"
  getBasePath(): string;
  getTempFileLocation(): string;
  getUserFolder(): string;
  isPTSA(): boolean;
  isRealtimeMode(): boolean;
  isSimulationMode(): boolean;
  fileNew(...args: any[]): void;
  fileOpen(path?: string): void;
  fileSave(): void;
  fileSaveAs(path?: string): void;
  exit(): void;
  exitNoConfirm(): void;
  showMessageBox(message: string, title?: string): number;
  getClipboardText(): string;
  setClipboardText(text: string): void;
  listDirectory(path: string): string[];
  writeToPT?(data: string): void;
}

// PTWorkspace
interface PTWorkspace {
  getLogicalWorkspace(): PTLogicalWorkspace;
  isLogicalView?(): boolean;
  isGeoView?(): boolean;
  isRackView?(): boolean;
  zoomIn?(): void;
  zoomOut?(): void;
  zoomReset?(): void;
  getEnvironmentTimeInSeconds?(): number;
  pauseEnvironmentTime?(): void;
  resumeEnvironmentTime?(): void;
  resetEnvironment?(): void;
}

// PTLogicalWorkspace - Topología
interface PTLogicalWorkspace {
  addDevice(typeId: number, model: string, x: number, y: number): string | null;
  removeDevice(name: string): boolean;
  deleteObject(name: string): boolean;
  createLink(device1Name, port1Name, device2Name, port2Name, cableType): PTLink | null;
  autoConnectDevices(device1Name: string, device2Name: string): void; // SOLO 2 args
  deleteLink(deviceName: string, portName: string): boolean;
  getCanvasRectIds?(): string[];
  getRectItemData?(rectId: string): Record<string, unknown> | null;
}

// PTFileManager
interface PTFileManager {
  getFileContents(path: string): string;
  getFileBinaryContents?(path: string): Uint8Array;
  writePlainTextToFile(path: string, content: string): void;
  writeTextToFile?(path: string, content: string): void;
  fileExists(path: string): string | boolean;
  directoryExists(path: string): boolean;
  getFilesInDirectory(path: string): string[];
  makeDirectory(path: string): boolean;
  removeFile(path: string): boolean;
  moveSrcFileToDestFile(src: string, dest: string): boolean;
  copySrcFileToDestFile?(src: string, dest: string): boolean;
  getFileSize?(path: string): number;
  getFileCheckSum?(path: string): string;
  encrypt?(content: string): string;
  decrypt?(content: string): string;
  zipDirectory?(srcDir: string, destFile: string): boolean;
  unzipFile?(zipFile: string): boolean;
  getFileWatcher?(path: string): PTFileWatcher | null;
}

// PTFileWatcher
interface PTFileWatcher {
  register?(path: string, handler: (event: string) => void): void;
  unregister?(path?: string): void;
}

// PTModule
interface PTModule {
  getSlotCount(): number;
  getSlotTypeAt(index: number): number; // 0=eLineCard, 1=eNetworkModule, 2=eInterfaceCard
  getModuleCount(): number;
  getModuleAt(index: number): PTModule | null;
  addModuleAt(moduleId: string, slotIndex: number): boolean;
  getModuleNameAsString?(): string;
  getSlotPath?(): string;
}

// Device Type Constants
const PT_DEVICE_TYPE = {
  router: 0,
  switch: 1,
  hub: 2,
  pc: 8,
  server: 9,
  multilayerSwitch: 16,
  firewall: 27,
  iot: 34,
};

// Cable Type Constants
const PT_CABLE_TYPE = {
  auto: -1,
  straight: 0,
  cross: 1,
  fiber: 2,
  serial: 3,
  console: 4,
  phone: 5,
  wireless: 8,
};
```

---

#### PT-GLOBAL-SCOPE.md

```typescript
// 70 globals documentados en PT 9.0.0.0810

// Confirmed Globals
ipc              // PT IPC entry point
dprint(msg)      // Log to PT Activity Log (arity 0)
_ScriptModule    // Script module instance — 49 methods
_Parser          // Low-level IPC parser (arity 2)
$ipc             // IPC function wrapper (arity 0)
$ipcObject       // Raw IPC object accessor
console          // Console with log available
this             // Global object (use instead of self)
self             // undefined — use this
globalThis       // undefined
fm               // undefined — use ipc.systemFileManager()

// Data Storage
$putData(key: string, value: string): void
$getData(key: string): string
$removeData(key: string): void
// NOTE: Only strings — objects become "[object Object]"

// Base64
Base64.encode(str: string): string
Base64.decode(str: string): string

// GUID
guid(): string  // Returns UUID v4 string

// scriptEngine
scriptEngine.evaluate(code: string): any
scriptEngine.evaluateCall(fnName: string, args: Array): any

// MD5 (⚠️ Object, Not Function)
var md = new MD5();
md.append(str: string): void
md.getHash(): ArrayBuffer
md.toHex(arrayBuffer: ArrayBuffer): string
md.toHexString(): string

// Network Server APIs
$createHttpServer()   // → HTTP server
$createTcpServer()     // → TCP server
$createTcpSocket()     // → TCP client
$createUdpSocket()     // → UDP socket
$createWebSocket()     // → WebSocket client

// Security System
$se(): undefined
$sec(className: string, methodName: string): undefined
$secexists(eventName: string): boolean
$secreg(eventName: string, handler: function): string  // returns UUID
$secunreg(eventName: string): undefined
$seev(eventName: string, value?: any): undefined

// AssessmentModel
AssessmentModel.getAssessmentItemValue(itemId: string): any
AssessmentModel.isAssessmentItemCorrect(itemId: string): boolean
AssessmentModel.getRunningConfig(deviceId: string): string
AssessmentModel.getTimeElapsed(): number
AssessmentModel.startPeriodicPDU(pduId: string, intervalMs: number): void

// _ScriptModule (49 methods)
_ScriptModule.getFileContents(path: string): string
_ScriptModule.writeTextToFile(path: string, content: string): void
_ScriptModule.getFileSize(path: string): number
_ScriptModule.getFileModificationTime(path: string): number
_ScriptModule.getFileCheckSum(path: string): string
_ScriptModule.copySrcFileToDestFile(src: string, dest: string): boolean
_ScriptModule.getIpcApi(): PTIpc
_ScriptModule.ipcCall(className: string, method: string, args: Array): any
_ScriptModule.setTimeout(fn: function, ms: number): number
_ScriptModule.setInterval(fn: function, ms: number): number
_ScriptModule.debug(msg: string): void
_ScriptModule.addScriptFile(path: string, label: string): void
```

---

#### PT-API-COMPLETE.md

```typescript
// 47 dispositivos verificados con typeId y className
// Mapa real (parte):

typeId  | Modelo       | Clase
-------|--------------|-------
0      | 2911         | Router
1      | 2960-24TT    | CiscoDevice
2      | Cloud-PT     | Cloud
8      | PC-PT        | Pc
9      | Server-PT    | Server
16     | MLS-3650     | Router
27     | ASA-5505     | ASA
36     | MCU-PT       | MCU
37     | SBC-PT       | SBC

// Procesos encontrados
DhcpServerProcess, DhcpServerMainProcess, VlanManager, RoutingProcess, StpMainProcess
```

---

### pt-api/pt-api-registry.ts

```typescript
// PTIpc - Interface principal de IPC
interface PTIpc {
  network(): PTNetwork;
  getNetwork?(): PTNetwork;
  appWindow(): PTAppWindow;
  systemFileManager(): PTFileManager;
  simulation?(): PTSimulation;
  hardwareFactory?(): PTHardwareFactory;
  ipcManager?(): PTIpcManager;
  multiUserManager?(): PTMultiUserManager;
  userAppManager?(): PTUserAppManager;
  getObjectByUuid?(uuid: string): unknown | null;
  getObjectUuid?(obj: unknown): string | null;
  registerEvent?(event: string, context: any, handler: Function): void;
  unregisterEvent?(event: string, context: any, handler: Function): void;
}

// _Network class (instantiate with new)
declare class _Network {
  constructor();
  getDevice(name: string): PTDevice | null;
  getDeviceAt(index: number): PTDevice | null;
  getDeviceCount(): number;
  getLinkAt(index: number): PTLink | null;
  getLinkCount(): number;
}

// _SystemFileManager class
declare class _SystemFileManager {
  constructor();
  getFileContents(path: string): string;
  writePlainTextToFile(path: string, content: string): void;
  fileExists(path: string): string | boolean;
  // ... full interface en PTFileManager
}

// _AppWindow class
declare class _AppWindow {
  constructor();
  getActiveWorkspace(): PTWorkspace;
  getVersion(): string;
  fileOpen(path?: string): void;
  fileSave(): void;
  exit(): void;
}

// _Parser - Low-level IPC
declare class _Parser {
  static ipcCall(className: string, method: string, args: any[]): any;
  static createObject(className: string, ...args: any[]): any;
}

// _ScriptModule fallback
declare var _ScriptModule: {
  getFileContents(path: string): string;
  writeTextToFile(path: string, content: string): void;
  getFileSize(path: string): number;
  getIpcApi(): PTIpc;
  ipcCall(className: string, method: string, args: any[]): any;
  setTimeout(fn: Function, ms: number): number;
  // ... 49 methods total
};

// PT_DEVICE_TYPE_CONSTANTS
export const PT_DEVICE_TYPE_CONSTANTS: Record<string, number> = {
  router: 0,
  switch: 1,
  hub: 2,
  pc: 8,
  server: 9,
  multilayerSwitch: 16,
  firewall: 27,
  iot: 34,
};

// PT_CABLE_TYPE_CONSTANTS
export const PT_CABLE_TYPE_CONSTANTS: Record<string, number> = {
  auto: -1,
  straight: 0,
  cross: 1,
  fiber: 2,
  serial: 3,
  console: 4,
  phone: 5,
  wireless: 8,
};
```

---

### pt/kernel/main.ts

```typescript
export interface Kernel {
  boot(): void;
  shutdown(): void;
  isRunning(): boolean;
  startDeferredJob(plan: DeferredJobPlan): string;
  getDeferredJob(jobId: string): ActiveJob | null;
}

export function createKernel(config: KernelConfig);
```

**KernelConfig:**

```typescript
interface KernelConfig {
  devDir: string;
  commandsDir: string;
  inFlightDir: string;
  resultsDir: string;
  deadLetterDir: string;
  logsDir: string;
  commandsTraceDir: string;
  pollIntervalMs: number;
  deferredPollIntervalMs: number;
  heartbeatIntervalMs: number;
  demoRuntime?: boolean;
}
```

---

### pt/kernel/runtime-loader.ts

```typescript
export interface RuntimeLoader {
  load(): void;
  loadDemo(): void;
  reloadIfNeeded(isBusyCheck: () => boolean): void;
  getLastMtime(): number;
  getRuntimeFn(): ((payload: Record<string, unknown>, api: RuntimeApi) => unknown) | null;
  hasPendingReload(): boolean;
}

export function createRuntimeLoader(config: { runtimeFile: string }): RuntimeLoader;
```

**RuntimeApi (injectada al runtime):**

```typescript
interface RuntimeApi {
  ipc: unknown;
  getDeviceByName(name: string): DeviceRef | null;
  listDevices(): string[];
  querySessionState(deviceName: string): SessionStateSnapshot | null;
  getWorkspace(): unknown;
  now(): number;
  safeJsonClone<T>(data: T): T;
  normalizePortName(name: string): string;
  dprint(msg: string): void;
  createJob(plan: DeferredJobPlan): string;
  getJobState(ticket: string): KernelJobState | null;
  getActiveJobs(): Array<{ id: string; device: string; finished: boolean; state: string }>;
  jobPayload(ticket: string): Record<string, unknown> | null;
}
```

---

### pt/kernel/execution-engine.ts

```typescript
export type JobPhase =
  | "pending"
  | "waiting-ensure-mode"
  | "waiting-command"
  | "waiting-confirm"
  | "waiting-prompt"
  | "waiting-save"
  | "waiting-delay"
  | "completed"
  | "error";

export interface JobStepResult {
  stepIndex: number;
  stepType: DeferredStepType;
  command: string;
  raw: string;
  status: number | null;
  error?: string;
  completedAt: number;
}

export interface JobContext {
  plan: DeferredJobPlan;
  currentStep: number;
  phase: JobPhase;
  outputBuffer: string;
  startedAt: number;
  updatedAt: number;
  stepResults: JobStepResult[];
  lastMode: string;
  lastPrompt: string;
  paged: boolean;
  waitingForCommandEnd: boolean;
  finished: boolean;
  result: TerminalResult | null;
  error: string | null;
  errorCode: string | null;
  pendingDelay: number | null;
  waitingForConfirm: boolean;
}

export interface ActiveJob {
  id: string;
  device: string;
  context: JobContext;
  pendingCommand: Promise<TerminalResult> | null;
}

export interface ExecutionEngine {
  startJob(plan: DeferredJobPlan): ActiveJob;
  advanceJob(jobId: string): void;
  getJob(jobId: string): ActiveJob | null;
  getActiveJobs(): ActiveJob[];
  isJobFinished(jobId: string): boolean;
}

export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine;
export function toKernelJobState(ctx: JobContext): KernelJobState;
```

---

### pt/kernel/command-queue.ts

```typescript
export interface CommandQueue {
  poll(): CommandEnvelope | null;
  cleanup(filename: string): void;
  count(): number;
}

export interface CommandEnvelope {
  id: string;
  device: string;
  command: string;
  options?: ExecuteOptions;
  createdAt: number;
}

export function createCommandQueue(config: {
  commandsDir: string;
  inFlightDir: string;
  deadLetterDir: string;
}): CommandQueue;
```

---

### pt/kernel/lease.ts

```typescript
export interface LeaseManager {
  validate(): boolean;
  waitForLease(onValid: () => void): void;
  stop(): void;
}

export function createLeaseManager(config: {
  devDir: string;
  checkIntervalMs: number;
}): LeaseManager;
```

---

### pt/kernel/heartbeat.ts

```typescript
export interface HeartbeatManager {
  write(): void;
  start(): void;
  stop(): void;
  setActiveCommand(id: string | null): void;
  setQueuedCount(count: number): void;
}

export function createHeartbeat(config: { devDir: string; intervalMs: number }): HeartbeatManager;
```

---

### pt/kernel/directories.ts

```typescript
export interface DirectoryManager {
  ensureDirectories(): void;
  directories: {
    devDir: string;
    commandsDir: string;
    inFlightDir: string;
    resultsDir: string;
    deadLetterDir: string;
    logsDir: string;
    commandsTraceDir: string;
  };
}

export function createDirectoryManager(config: {
  devDir: string;
  commandsDir: string;
  inFlightDir: string;
  resultsDir: string;
  deadLetterDir: string;
  logsDir: string;
  commandsTraceDir: string;
}): DirectoryManager;
```

---

### pt/kernel/kernel-state.ts

```typescript
export interface KernelState {
  isRunning: boolean;
  isShuttingDown: boolean;
  activeCommand: CommandEnvelope | null;
  activeCommandFilename: string | null;
}

export function createKernelState(): KernelState;
```

---

### pt/terminal/terminal-engine.ts

```typescript
export interface TerminalEngine {
  attach(device: string, term: PTCommandLine): void;
  detach(device: string): void;
  getSession(device: string): SessionStateSnapshot | null;
  getMode(device: string): IosMode;
  isBusy(device: string): boolean;
  executeCommand(
    device: string,
    command: string,
    options?: ExecuteOptions,
  ): Promise<TerminalResult>;
  continuePager(device: string): void;
  confirmPrompt(device: string): void;
}

export interface ExecuteOptions {
  timeoutMs?: number;
  stopOnError?: boolean;
  expectMode?: IosMode;
}

export interface TerminalResult {
  ok: boolean;
  output: string;
  status: number;
  session: SessionStateSnapshot;
  mode: IosMode;
}

export function createTerminalEngine(config: TerminalEngineConfig): TerminalEngine;
```

---

### pt/terminal/terminal-session.ts

```typescript
export interface TerminalSessionState {
  device: string;
  mode: string;
  prompt: string;
  paging: boolean;
  awaitingConfirm: boolean;
  lastOutputAt: number;
  busyJobId: string | null;
  healthy: boolean;
}

export function createTerminalSession(device: string): TerminalSessionState;
export function toSnapshot(state: TerminalSessionState): SessionStateSnapshot;
export function updateMode(state: TerminalSessionState, mode: string): TerminalSessionState;
export function updatePrompt(state: TerminalSessionState, prompt: string): TerminalSessionState;
export function setPaging(state: TerminalSessionState, paging: boolean): TerminalSessionState;
export function setBusy(state: TerminalSessionState, jobId: string | null): TerminalSessionState;
```

---

### pt/terminal/prompt-parser.ts

```typescript
export type IosMode =
  | "user-exec"
  | "priv-exec"
  | "config"
  | "config-if"
  | "config-line"
  | "config-router"
  | "config-subif"
  | "config-vlan"
  | "unknown";

export function parsePrompt(prompt: string): IosMode;
export function isPrivileged(mode: IosMode): boolean;
export function isConfigMode(mode: IosMode): boolean;
```

---

### handlers/ios-session.ts

```typescript
export interface RuntimeSessionState {
  mode: string;
  paging: boolean;
  awaitingConfirm: boolean;
  awaitingPassword: boolean;
  awaitingDnsLookup: boolean;
}

export function inferModeFromPrompt(prompt: string): string;
export function updateSessionFromOutput(session: RuntimeSessionState, output: string): void;
export function isInConfigMode(mode: string): boolean;
export function isInPrivilegedMode(mode: string): boolean;
```

---

### handlers/device-crud.ts

```typescript
export interface AddDevicePayload {
  type: "addDevice";
  model?: string;
  name?: string;
  x?: number;
  y?: number;
  deviceType?: number;
}

export interface RemoveDevicePayload {
  type: "removeDevice";
  name: string;
}

export interface RenameDevicePayload {
  type: "renameDevice";
  oldName: string;
  newName: string;
}

export interface MoveDevicePayload {
  type: "moveDevice";
  name: string;
  x: number;
  y: number;
}

export function handleAddDevice(payload: AddDevicePayload, deps: HandlerDeps): HandlerResult;
export function handleRemoveDevice(payload: RemoveDevicePayload, deps: HandlerDeps): HandlerResult;
export function handleRenameDevice(payload: RenameDevicePayload, deps: HandlerDeps): HandlerResult;
export function handleMoveDevice(payload: MoveDevicePayload, deps: HandlerDeps): HandlerResult;
```

### handlers/device-discovery.ts

```typescript
export interface ListDevicesPayload {
  type: "listDevices";
}

export type ListDevicesResult = HandlerResult & {
  devices: Array<{ name: string; model: string; type: string; power: boolean; ports: any[] }>;
  count: number;
  connectionsByDevice: Record<string, ConnectionInfo[]>;
  unresolvedLinks: Array<{...}>;
};

export function handleListDevices(payload: ListDevicesPayload, deps: HandlerDeps): ListDevicesResult;
```

### handlers/device-listing.ts

```typescript
export interface DeviceListingInput {
  net: ReturnType<HandlerDeps["getNet"]>;
  connectionsByDevice: Record<string, ConnectionInfo[]>;
  portIndex: PortOwnerIndex;
}

export interface ListedDevice {
  name: string;
  model: string;
  type: string;
  power: boolean;
  ports: any[];
}

export function composeDeviceListing(input: DeviceListingInput): ListedDevice[];
```

---

### domain/runtime-result.ts

```typescript
export function okResult(
  raw?: string,
  options?: { status?: number; parsed?: Record<string, unknown>; session?: SessionStateSnapshot },
): RuntimeSuccessResult;

export function errorResult(
  error: string,
  options?: { code?: string; raw?: string; session?: SessionStateSnapshot },
): RuntimeErrorResult;

export function deferredResult(ticket: string, job: DeferredJobPlan): RuntimeDeferredResult;
```

---

### domain/deferred-job-plan.ts

```typescript
export function createDeferredJobPlan(
  device: string,
  steps: DeferredStep[],
  options?: Partial<DeferredJobOptions>,
): DeferredJobPlan;

export function ensureModeStep(mode: string): DeferredStep;
export function commandStep(cmd: string, opts?: DeferredStep["options"]): DeferredStep;
export function confirmStep(): DeferredStep;
export function expectPromptStep(prompt: string): DeferredStep;
export function saveConfigStep(): DeferredStep;
export function closeSessionStep(): DeferredStep;
```

---

## Funciones de Build

### build/render-main-v2.ts

```typescript
export function renderMainV2(options: RenderMainV2Options): string;

interface RenderMainV2Options {
  srcDir: string;
  outputPath: string;
  injectDevDir: string;
}
```

### build/render-runtime-v2.ts

```typescript
export function renderRuntimeV2(options: RenderRuntimeV2Options): Promise<string>;
export function renderRuntimeV2Sync(options: RenderRuntimeV2Options): string;

interface RenderRuntimeV2Options {
  srcDir: string;
  outputPath: string;
  injectDevDir: string;
}
```

### build/render-catalog.ts

```typescript
export function renderCatalog(options: RenderCatalogOptions): string;

interface RenderCatalogOptions {
  srcDir: string;
}
```

### build/validate-pt-safe.ts

```typescript
export function validatePtSafe(code: string): ValidationResult;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}
```

---

## RuntimeGenerator

```typescript
export class RuntimeGenerator {
  config: RuntimeGeneratorConfig;

  constructor(config: RuntimeGeneratorConfig);
  generateMain(): string;
  generateCatalog(): string;
  generateRuntime(): string;
  generate(): Promise<{ main: string; catalog: string; runtime: string }>;
  validateGenerated(): Promise<void>;
  deploy(): Promise<void>;
  build(): Promise<void>;
}

interface RuntimeGeneratorConfig {
  outputDir: string;
  devDir: string;
}
```

---

## Value Objects

```typescript
// CableType
class CableType {
  constructor(value: number)
  equals(other: CableType): boolean
  toString(): string
  toJSON(): number
  static from(value: number): CableType
}

// DeviceName
class DeviceName {
  constructor(value: string)
  equals(other: DeviceName): boolean
  toString(): string
  toJSON(): string
  static from(value: string): DeviceName
}

// InterfaceName
class InterfaceName {
  constructor(value: string)
  equals(other: InterfaceName): boolean
  toString(): string
  toJSON(): string
  static from(value: string): InterfaceName
}

// SessionMode
class SessionMode {
  constructor(value: string)
  equals(other: SessionMode): boolean
  toString(): string
  toJSON(): string
  static from(value: string): SessionMode
```

---

## Constantes PT

### PT Device Types (typeId)

```javascript
const PT_DEVICE_TYPE = {
  router: 0, // 2911, 1941, etc.
  switch: 1, // 2960, 3750, etc.
  hub: 2,
  bridge: 3,
  repeater: 4,
  wireless: 7, // AccessPoint-PT
  pc: 8, // PC-PT, Laptop-PT, etc.
  server: 9, // Server-PT
  printer: 10,
  wirelessRouter: 11, // Linksys-WRT300N
  ipPhone: 12, // IPPhone-7960
  multilayerSwitch: 16, // MLS-3650, etc.
  firewall: 27, // ASA-5505
  iot: 34, // IoT-* devices
  mcu: 36, // MCU-PT
  sbc: 37, // SBC-PT
};
```

### PT Cable Types

```javascript
const PT_CABLE_TYPE = {
  auto: -1,
  straight: 0, // Copper Straight-Through
  cross: 1, // Copper Cross-Over
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
```

---

## Patrones de Uso

### Ejecutar comando IOS en PT

```typescript
// 1. Obtener el terminal del dispositivo
const net = ipc.network();
const device = net.getDevice("R1");
const term = device.getCommandLine();

// 2. Registrar handler para resultados
term.registerEvent("commandEnded", null, (source, args) => {
  if (args.status === 0) {
    console.log("Command succeeded");
  }
});

// 3. Enviar comando
term.enterCommand("show ip int brief");
```

### Crear dispositivo

```typescript
const lw = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
const result = lw.addDevice(0, "2911", 200, 300); // typeId=0 (router), model, x, y
```

### Hot reload de runtime

```typescript
const runtimeLoader = createRuntimeLoader({ runtimeFile: devDir + "/runtime.js" });

// Verificar cambios periódicamente
runtimeLoader.reloadIfNeeded(() => terminal.isBusy("R1"));

// Obtener función runtime
const runtimeFn = runtimeLoader.getRuntimeFn();
if (runtimeFn) {
  const result = runtimeFn(payload, runtimeApi);
}
```

---

## Deployment

```bash
cd packages/pt-runtime
bun run deploy  # Genera main.js, runtime.js, catalog.js → ~/pt-dev/
bun run build  # Genera a dist-qtscript/
```

---

## Debugging — PT_DEBUG Flag

Por defecto, `dprint()` solo va a Activity Log y al archivo NDJSON. La ventana de PT Debug está silenciada.

### Habilitar output en ventana PT Debug

```javascript
// En la consola de PT:
self.PT_DEBUG = 1; // Habilita — ahora dprint() escribe en PT Debug window
self.PT_DEBUG = 0; // Deshabilita
```

### Flujo de logs

```
dprint("msg")
  ├── appWindow.writeToPT()  ──→ PT Debug window  (solo si PT_DEBUG=1)
  ├── native dprint()        ──→ PT Activity Log   (siempre)
  └── print()               ──→ Terminal PT        (siempre)
  + writeDebugLog()         ──→ logs/pt-debug.current.ndjson (siempre)
```

### Ver logs en CLI

```bash
bun run pt log --live        # Follow logs en tiempo real
bun run pt log --live --n 50 # Ultimos 50 entries
bun run pt log --lines 100   # Ultimos 100 logs (snapshot)
```

### Módulos de debug

- `src/pt/kernel/debug-log.ts` — Buffer rotativo NDJSON (últimos 500 eventos)
- `src/pt/kernel/main.ts` — `kernelLog()` y `kernelLogSubsystem()`
- `src/pt/kernel/runtime-loader.ts` — `visibleLog()` para runtime
- `src/pt/kernel/queue-claim.ts` — `dprint()` directo para claim operations

### Build/Debug de main.js

```bash
# Regenerar y deployar (después de cambiar kernel o runtime)
cd packages/pt-runtime && bun run deploy

# Recargar en PT: File > Open > ~/pt-dev/main.js
```
