# AGENTS.md — @cisco-auto/pt-control

> Guía de desarrollo para agentes de IA que trabajan en el paquete pt-control.

## Propósito del Paquete

CLI profesional (`bun run pt`) para controlar Cisco Packet Tracer en tiempo real. Proporciona una API de alto nivel para interactuar con dispositivos PT, gestionar topologías, y ejecutar comandos IOS.

## Arquitectura General

```
src/
├── controller/        # PTController - API de alto nivel para controlar PT
├── vdom/              # VirtualTopology - Estado de topología basado en eventos
├── types/            # Definiciones de tipos para la CLI
├── parsers/          # Parsers IOS (re-exportados de ios-domain)
├── logging/          # LogManager - Logging NDJSON con tracking de sesión
└── shared/           # Utilidades compartidas
```

## Clases, Funciones, Métodos y Variables Clave

### PTController

```typescript
// Configuración del controller
interface PTControllerConfig {
  devDir?: string;
  timeoutMs?: number;
  onEvent?: (event: PTEvent) => void;
}

// Crear controller
function createPTController(config?: PTControllerConfig): PTController;
function createDefaultPTController(): PTController;

// Interface del controller
interface PTController {
  // lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Device management
  addDevice(
    name: string,
    model: string,
    options?: { x?: number; y?: number },
  ): Promise<DeviceResult>;
  removeDevice(name: string): Promise<void>;
  renameDevice(oldName: string, newName: string): Promise<void>;
  moveDevice(name: string, x: number, y: number): Promise<void>;
  listDevices(): Promise<string[]>;
  getDeviceInfo(name: string): Promise<DeviceInfo>;

  // Link management
  addLink(device1: string, port1: string, device2: string, port2: string): Promise<void>;
  removeLink(device: string, port: string): Promise<void>;

  // IOS commands
  executeCommand(device: string, command: string): Promise<CommandResult>;
  executeShow(device: string, showCommand: string): Promise<string>;

  // Session management
  createSession(device: string): Promise<CliSession>;
  closeSession(device: string): Promise<void>;

  // Topology
  getTopology(): Promise<TopologySnapshot>;
  exportTopology(format: "json" | "yaml"): Promise<string>;
}

export class PTController {
  // Constructor
  constructor(config: PTControllerConfig);

  // Métodos principales
  async connect(): Promise<void>;
  async disconnect(): Promise<void>;
  isConnected(): boolean;
  async addDevice(
    name: string,
    model: string,
    options?: { x?: number; y?: number },
  ): Promise<DeviceResult>;
  async removeDevice(name: string): Promise<void>;
  async renameDevice(oldName: string, newName: string): Promise<void>;
  async moveDevice(name: string, x: number, y: number): Promise<void>;
  async listDevices(): Promise<string[]>;
  async getDeviceInfo(name: string): Promise<DeviceInfo>;
  async executeCommand(device: string, command: string): Promise<CommandResult>;
  async executeShow(device: string, showCommand: string): Promise<string>;
  async createSession(device: string): Promise<CliSession>;
  async closeSession(device: string): Promise<void>;
  async getTopology(): Promise<TopologySnapshot>;
}
```

### VirtualTopology (vdom/)

```typescript
// Estado de topología basado en eventos
interface VirtualTopology {
  // Devices
  getDevices(): Map<string, VDevice>;
  getDevice(name: string): VDevice | undefined;
  addDevice(device: VDevice): void;
  removeDevice(name: string): void;
  updateDevice(name: string, updates: Partial<VDevice>): void;

  // Links
  getLinks(): Map<string, VLink>;
  getLink(id: string): VLink | undefined;
  addLink(link: VLink): void;
  removeLink(id: string): void;

  // Subscriptions
  subscribe(callback: TopologyCallback): () => void;
  onDeviceAdded(callback: (device: VDevice) => void): () => void;
  onDeviceRemoved(callback: (name: string) => void): () => void;
  onLinkAdded(callback: (link: VLink) => void): () => void;
  onLinkRemoved(callback: (id: string) => void): () => void;
}

interface VDevice {
  id: string;
  name: string;
  model: string;
  type: DeviceType;
  x: number;
  y: number;
  interfaces: Map<string, VInterface>;
  powered: boolean;
}

interface VInterface {
  name: string;
  ipAddress?: string;
  subnetMask?: string;
  status: "up" | "down";
  vlan?: number;
  linkedTo?: { device: string; port: string };
}

interface VLink {
  id: string;
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  cableType: CableType;
}

function createVirtualTopology(): VirtualTopology;
```

### CliSession

```typescript
// Sesión CLI con estado para un dispositivo
interface CliSession {
  device: string;
  mode: IosMode;
  prompt: string;
  isConnected: boolean;

  // Ejecutar comandos
  execute(command: string): Promise<CommandResult>;
  executeShow(showCommand: string): Promise<string>;

  // Control de sesión
  enterPriv(): Promise<void>;
  exitPriv(): Promise<void>;
  close(): Promise<void>;

  // Esperar y responder
  waitForPrompt(timeoutMs?: number): Promise<void>;
  sendResponse(response: string): Promise<void>;
}

interface CommandResult {
  ok: boolean;
  output: string;
  status: number;
  mode: IosMode;
  paging: boolean;
}

interface CommandHistoryEntry {
  command: string;
  output: string;
  timestamp: number;
  status: number;
}

function createCliSession(device: string, term: PTCommandLine): CliSession;
```

### Parsers IOS (re-exportados de ios-domain)

```typescript
// Parser functions para outputs IOS
function parseShowIpInterfaceBrief(output: string): IpInterfaceBriefEntry[];
function parseShowVlan(output: string): VlanInfo[];
function parseShowIpRoute(output: string): RouteEntry[];
function parseShowRunningConfig(output: string): ConfigSection[];
function parseShowInterfaces(output: string): InterfaceInfo[];
function parseShowIpArp(output: string): ArpEntry[];
function parseShowMacAddressTable(output: string): MacEntry[];
function parseShowSpanningTree(output: string): StpInfo[];
function parseShowVersion(output: string): VersionInfo;
function parseShowCdpNeighbors(output: string): CdpNeighbor[];

// Acceso a parsers
function getParser(name: string): ParserFunction | undefined;
const PARSERS: Record<string, ParserFunction>;
```

### LogManager

```typescript
// Sistema de logging NDJSON con session tracking
interface LogManager {
  // Session
  startSession(sessionId: string, metadata?: LogMetadata): void;
  endSession(): void;
  getSession(): LogSession | null;

  // Logging
  log(level: LogLevel, message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;

  // Command tracing
  traceCommand(device: string, command: string, result?: CommandResult): void;
  getCommandTrace(device?: string): CommandTraceEntry[];

  // Query
  query(options?: LogQueryOptions): LogEntry[];
  getStats(): LogStats;

  // File
  flush(): Promise<void>;
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  sessionId?: string;
  device?: string;
  data?: Record<string, unknown>;
}

interface LogSession {
  id: string;
  startedAt: number;
  metadata?: LogMetadata;
  entryCount: number;
}

interface LogStats {
  totalEntries: number;
  byLevel: Record<LogLevel, number>;
  byDevice: Record<string, number>;
}

function getLogManager(): LogManager;
function resetLogManager(): void;
```

### CommandTraceEntry

```typescript
interface CommandTraceEntry {
  id: string;
  timestamp: number;
  sessionId: string;
  device: string;
  command: string;
  outputPreview: string;
  status: number;
  durationMs: number;
}
```

### IOS Capabilities

```typescript
// Resolución de capacidades de dispositivo
interface DeviceCapabilities {
  model: string;
  family: IOSFamily;
  type: DeviceType;
  supportsVlan: boolean;
  supportsRouting: boolean;
  supportsAcl: boolean;
  supportsNat: boolean;
  supportsDhcp: boolean;
  maxVlanId: number;
  maxInterfaces: number;
  modules: ModuleInfo[];
}

function resolveCapabilities(model: string): DeviceCapabilities;
```

### IOSFamily

```typescript
enum IOSFamily {
  CISCO_IOS = "cisco-ios",
  CISCO_IOS_XE = "cisco-ios-xe",
  CISCO_NXOS = "cisco-nxos",
  CISCO_WLC = "cisco-wlc",
  UNKNOWN = "unknown",
}

interface IosDeviceModel {
  model: string;
  family: IOSFamily;
  capabilities: DeviceCapabilities;
}
```

### Output Classification

```typescript
type OutputClassificationType =
  | "success"
  | "error"
  | "paging"
  | "confirm"
  | "password"
  | "dns-lookup"
  | "unknown";

interface OutputClassification {
  type: OutputClassificationType;
  cleaned: string;
  hasError: boolean;
  needsResponse: boolean;
}

function classifyOutput(output: string): OutputClassification;
function isSuccessResult(result: CommandResult): boolean;
function isErrorResult(result: CommandResult): boolean;
function isPagingResult(result: CommandResult): boolean;
function isConfirmPrompt(output: string): boolean;
function isPasswordPrompt(output: string): boolean;

// Prompt state
type IosMode = "user-exec" | "priv-exec" | "config" | "config-if" | "unknown";

interface PromptState {
  mode: IosMode;
  hostname: string;
  partial: boolean;
}

function inferPromptState(prompt: string): PromptState;
```

---

## Comandos CLI

```bash
# Ver ayuda completa
bun run pt --help

# Gestión de dispositivos
bun run pt device list
bun run pt device add R1 2911
bun run pt device remove R1
bun run pt device move R1 --xpos 300 --ypos 200

# Comandos show
bun run pt show ip-int-brief R1
bun run pt show vlan Switch1
bun run pt show run-config R1

# Historial
bun run pt history list
bun run pt history last

# Audit
bun run pt audit tail
bun run pt audit-failed
```

---

## Exportaciones del Paquete

```typescript
// Controller
export { PTController, createPTController, createDefaultPTController };

// Virtual DOM
export { VirtualTopology, createVirtualTopology };

// Types
export * from "./types/index.js";

// Parsers
export * from "./parsers/index.js";

// Logging
export { LogManager, getLogManager, resetLogManager };
export type { LogEntry, LogSession, LogConfig, LogQueryOptions, LogStats };
export { redactSensitive };

// IOS Session
export { CliSession, createCliSession };
export type { CommandHandler, CommandHistoryEntry, CliSessionState };

// Capabilities
export { resolveCapabilities, type DeviceCapabilities };
export { IOSFamily, type IosDeviceModel };

// Validation
export { validatePTModel, resolveModel };
```
