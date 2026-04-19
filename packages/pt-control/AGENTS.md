# AGENTS.md — @cisco-auto/pt-control

> Guía de desarrollo para agentes de IA que trabajan en el paquete pt-control.

## Propósito del Paquete

CLI profesional (`bun run pt`) para controlar Cisco Packet Tracer en tiempo real. Proporciona una API de alto nivel para interactuar con dispositivos PT, gestionar topologías, y ejecutar comandos IOS.

> **FRONTERA ARQUITECTURAL**: `pt-control` es el **orchestration brain** que contiene planners, workflows, diagnosis, verification, policies, y evidence evaluation. Consume primitives de `pt-runtime`. Ver `docs/architecture/runtime-control-boundary.md`.

## Arquitectura General

```
src/
├── agent/              # Workflows de agentes: task-scoped context building
├── application/        # Servicios de aplicación (topology, device, ios, canvas)
│   ├── ports/          # Interfaces de puertos (FileBridgePort)
│   └── services/       # Servicios concretos (TopologyService, DeviceService, etc.)
├── autonomy/           # Lógica de autonomía para decisiones automáticas
├── checks/             # Validaciones y checks de salud
├── contracts/          # Contratos de tipos (PTEvent, DeviceState, TopologySnapshot, etc.)
├── controller/         # PTController - API de alto nivel para controlar PT
├── domain/             # Lógica de dominio (IOS capabilities resolver)
├── infrastructure/     # Implementaciones de infraestructura (PT bridge, topology cache)
├── intent/             # Resolución de intents de usuario
├── logging/            # LogManager - Logging NDJSON con tracking de sesión
├── pt/                 # Módulos PT canónicos (terminal, topology, server, planner, ledger, diagnosis)
├── query/              # Query processing
├── shared/             # Utilidades compartidas
├── simulation/         # Simulación de red
├── tools/              # Herramientas utilities
├── types/              # Definiciones de tipos para la CLI
├── utils/              # Utilities varias
├── validation/          # Validación de dispositivos contra catalog
└── vdom/               # VirtualTopology - Estado de topología basado en eventos
```

## Clases, Funciones, Métodos y Variables Clave

### PTController

```typescript
// Configuración del controller
interface PTControllerConfig {
  devDir: string;
}

// Crear controller
function createPTController(config: PTControllerConfig): PTController;
function createDefaultPTController(): PTController;

// Interface del controller (50+ métodos)
interface PTController {
  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;

  // Bridge access
  getBridge(): FileBridgePort;
  getTopologyCache(): TopologyCache;

  // Command trace
  drainCommandTrace(): CommandTraceEntry[];

  // Device management
  addDevice(
    name: string,
    model: string,
    options?: { x?: number; y?: number },
  ): Promise<DeviceState>;
  removeDevice(name: string): Promise<void>;
  renameDevice(oldName: string, newName: string): Promise<void>;
  moveDevice(
    name: string,
    x: number,
    y: number,
  ): Promise<
    { ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }
  >;
  listDevices(filter?: string | number | string[]): Promise<DeviceListResult>;
  inspectDevice(name: string, includeXml?: boolean): Promise<DeviceState>;

  // Module management
  addModule(device: string, slot: number, module: string): Promise<void>;
  removeModule(device: string, slot: number): Promise<void>;

  // Link management
  addLink(
    device1: string,
    port1: string,
    device2: string,
    port2: string,
    linkType?: CableType,
  ): Promise<LinkState>;
  removeLink(device: string, port: string): Promise<void>;

  // Topology management
  clearTopology(): Promise<{
    removedDevices: number;
    removedLinks: number;
    remainingDevices: number;
    remainingLinks: number;
  }>;

  // Host configuration (PC/Server)
  configHost(
    device: string,
    options: { ip?: string; mask?: string; gateway?: string; dns?: string; dhcp?: boolean },
  ): Promise<void>;
  inspectHost(device: string): Promise<DeviceState>;

  // IOS configuration and execution
  configIos(device: string, commands: string[], options?: { save?: boolean }): Promise<void>;
  execIos<T = ParsedOutput>(
    device: string,
    command: string,
    parse?: boolean,
    timeout?: number,
  ): Promise<{ raw: string; parsed?: T }>;
  show(device: string, command: string): Promise<ParsedOutput>;
  showIpInterfaceBrief(device: string): Promise<ShowIpInterfaceBrief>;
  showVlan(device: string): Promise<ShowVlan>;
  showIpRoute(device: string): Promise<ShowIpRoute>;
  showRunningConfig(device: string): Promise<ShowRunningConfig>;
  showMacAddressTable(device: string): Promise<ShowMacAddressTable>;
  showCdpNeighbors(device: string): Promise<ShowCdpNeighbors>;
  execInteractive(
    device: string,
    command: string,
    options?: { timeout?: number; parse?: boolean; ensurePrivileged?: boolean },
  ): Promise<{ raw: string; parsed?: ParsedOutput; session?: { mode: string } }>;
  execIosWithEvidence<T = ParsedOutput>(
    device: string,
    command: string,
    parse?: boolean,
    timeout?: number,
  ): Promise<IosExecutionSuccess<T>>;
  configIosWithResult(
    device: string,
    commands: string[],
    options?: { save?: boolean },
  ): Promise<IosConfigApplyResult>;

  // DHCP
  configureDhcpServer(
    device: string,
    options: {
      poolName: string;
      network: string;
      subnetMask: string;
      defaultRouter?: string;
      dnsServers?: string[];
      excludedAddresses?: string[];
      leaseTime?: number;
      domainName?: string;
    },
  ): Promise<void>;
  inspectDhcpServer(
    device: string,
  ): Promise<{
    ok: boolean;
    device: string;
    pools: Array<{
      name: string;
      network: string;
      subnetMask: string;
      defaultRouter?: string;
      dnsServers?: string[];
      leaseTime?: number;
      domainName?: string;
    }>;
    excludedAddresses?: string[];
    poolCount: number;
    excludedAddressCount: number;
  }>;
  configureDhcpPool(
    device: string,
    poolName: string,
    network: string,
    mask: string,
    defaultRouter: string,
    dnsServer?: string,
    options?: { save?: boolean },
  ): Promise<void>;

  // OSPF
  configureOspfNetwork(
    device: string,
    processId: number,
    network: string,
    wildcard: string,
    area: number,
    options?: { save?: boolean },
  ): Promise<void>;

  // SSH
  configureSshAccess(
    device: string,
    domainName: string,
    username: string,
    password: string,
    options?: { save?: boolean },
  ): Promise<void>;

  // Access Lists
  configureAccessListStandard(
    device: string,
    aclNumber: number,
    entries: string[],
    options?: { save?: boolean },
  ): Promise<void>;

  // Parsed show commands
  showParsed<T = ParsedOutput>(
    device: string,
    command: string,
    options?: { ensurePrivileged?: boolean; timeout?: number },
  ): Promise<IosExecutionSuccess<T>>;
  getIosConfidence(
    device: string,
    evidence: { source: string; status?: number; mode?: string },
    verificationCheck?: string,
  ): Promise<IosConfidence>;

  // Capabilities
  resolveCapabilities(device: string): Promise<DeviceCapabilities>;

  // Canvas
  listCanvasRects(): Promise<{ rects: string[]; count: number }>;
  getRect(rectId: string): Promise<unknown>;
  devicesInRect(rectId: string, includeClusters?: boolean): Promise<DevicesInRectResult>;

  // Snapshot
  snapshot(): Promise<TopologySnapshot>;
  inspect(device: string, includeXml?: boolean): Promise<DeviceState>;
  hardwareInfo(device: string): Promise<unknown>;
  hardwareCatalog(deviceType?: string): Promise<unknown>;
  commandLog(device?: string, limit?: number): Promise<unknown[]>;
  deepInspect(path: string, method?: string, args?: any[]): Promise<any>;

  // Event handling
  on<E extends PTEventType>(eventType: E, handler: (event: PTEvent) => void): this;
  onAll(handler: (event: PTEvent) => void): this;

  // Runtime loading
  loadRuntime(code: string): Promise<void>;
  loadRuntimeFromFile(filePath: string): Promise<void>;

  // Cached state
  getCachedSnapshot(): TopologySnapshot | null;
  getTwin(): NetworkTwin | null;
  readState<T = unknown>(): T | null;

  // Context and health
  getContextSummary(): {
    bridgeReady: boolean;
    topologyMaterialized: boolean;
    deviceCount: number;
    linkCount: number;
  };
  getHealthSummary(): Promise<{
    bridgeReady: boolean;
    topologyHealth: string;
    heartbeatState: "ok" | "stale" | "missing" | "unknown";
    warnings: string[];
  }>;
  getHeartbeat<T = unknown>(): T | null;
  getHeartbeatHealth(): {
    state: "ok" | "stale" | "missing" | "unknown";
    ageMs?: number;
    lastSeenTs?: number;
  };
  getBridgeStatus(): {
    ready: boolean;
    queuedCount?: number;
    inFlightCount?: number;
    warnings?: string[];
  };
  getSystemContext(): {
    bridgeReady: boolean;
    topologyMaterialized: boolean;
    deviceCount: number;
    linkCount: number;
    heartbeat: {
      state: "ok" | "stale" | "missing" | "unknown";
      ageMs?: number;
      lastSeenTs?: number;
    };
    warnings: string[];
  };
}
```

### TopologyCache (reemplaza VirtualTopology en docs de PTController)

```typescript
// Cache de topología que sincroniza con PT via bridge
class TopologyCache {
  start(): void;
  stop(): void;
  refreshFromState(): void;
  applySnapshot(snapshot: TopologySnapshot): void;
  getSnapshot(): TopologySnapshot;
  isMaterialized(): boolean;
  getDevice(name: string): DeviceState | undefined;
  getDevices(): DeviceState[];
  getLinks(): LinkState[];
  getDeviceNames(): string[];
  getConnectedDevices(deviceName: string): string[];
  findLinkBetween(device1: string, device2: string): LinkState | undefined;
}
```

### VirtualTopology (vdom/)

```typescript
// Estado de topología basado en eventos - mantenido por TopologyCache internamente
interface VirtualTopology {
  getSnapshot(): TopologySnapshot;
  getSnapshotRef(): Readonly<TopologySnapshot>;
  getDevice(name: string): DeviceState | undefined;
  getDeviceNames(): string[];
  getLink(id: string): LinkState | undefined;
  getLinks(): LinkState[];
  getVersion(): number;
  getLastUpdate(): number;
  isMaterialized(): boolean;
  applyEvent(event: PTEvent): void;
  replaceSnapshot(snapshot: TopologySnapshot): void;
  onChange(handler: (delta: TopologyDelta) => void, label?: string): () => void;
  getConnectedDevices(deviceName: string): string[];
  findLinkBetween(device1: string, device2: string): LinkState | undefined;
  createLinkId(device1: string, port1: string, device2: string, port2: string): string;
  getDevicesInZone(zoneGeometry: { x1: number; y1: number; x2: number; y2: number }): string[];
  isDeviceInZone(
    deviceName: string,
    zoneGeometry: { x1: number; y1: number; x2: number; y2: number },
  ): boolean;
  getZonesForDevice(
    deviceName: string,
    allZones: { id: string; geometry: { x1: number; y1: number; x2: number; y2: number } }[],
  ): string[];
  toJSON(): string;
  toNetworkTwin(): NetworkTwin;
  enrichNetworkTwinWithZones(twin: NetworkTwin, rects: unknown[]): NetworkTwin;
}

function createVirtualTopology(initialSnapshot?: TopologySnapshot): VirtualTopology;
```

### CliSession

No existe en pt-control. Se re-exporta desde `@cisco-auto/ios-domain`:

```typescript
// Re-exportado desde ios-domain
export { CliSession, createCliSession } from "@cisco-auto/ios-domain";
export type { CommandHandler, CommandHistoryEntry, CliSessionState } from "@cisco-auto/ios-domain";
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
// Entrada de trace de comando - campos verificados del código
interface CommandTraceEntry {
  id: string;
  type: string;
  completedAt: number;
  ok?: boolean;
  ts?: number;
  status?: string;
  commandType?: string;
}
```

### IOS Capabilities

```typescript
// Resolución de capacidades de dispositivo - interfaz verificada
interface DeviceCapabilities {
  model: string;
  family: IOSFamily;
  supportsTrunkEncapsulationCmd: boolean;
  supportsTrunkMode: boolean;
  supportsTrunkEncapsulation: boolean;
  supportsRouterSubinterfaces: boolean;
  supportsSubinterfaces: boolean;
  supportsDot1qEncapsulation: boolean;
  supportsSvi: boolean;
  supportsIpRouting: boolean;
  supportsDhcpRelay: boolean;
  supportsAcl: boolean;
  supportsNat: boolean;
  supportsVlan: boolean;
  maxVlanCount: number;
}

function resolveCapabilities(model: string): DeviceCapabilities;
```

### IOSFamily

```typescript
// Re-exportado desde @cisco-auto/ios-domain
export { IOSFamily, type IosDeviceModel } from "@cisco-auto/ios-domain";
```

### Output Classification

```typescript
// Re-exportado desde @cisco-auto/ios-domain
export {
  inferPromptState,
  type IosMode,
  type PromptState,
  type CommandResult,
  createSuccessResult,
  createErrorResult,
  isSuccessResult,
  isErrorResult,
  isPagingResult,
  isConfirmPrompt,
  isPasswordPrompt,
  classifyOutput,
  type OutputClassificationType,
} from "@cisco-auto/ios-domain";
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
export type { PTControllerConfig };

// Virtual DOM
export { VirtualTopology, createVirtualTopology } from "./vdom/index.js";

// Types
export * from "./types/index.js";

// Parsers (re-exportados desde ios-domain)
export { parseShowIpInterfaceBrief, parseShowVlan, parseShowIpRoute, ... } from "@cisco-auto/ios-domain";

// Logging
export { LogManager, getLogManager, resetLogManager };
export type { LogEntry, LogSession, LogConfig, LogQueryOptions, LogStats };
export { redactSensitive };
export type { CommandTraceEntry } from "./controller/index.js";

// IOS Session (desde ios-domain)
export { CliSession, createCliSession };
export type { CommandHandler, CommandHistoryEntry, CliSessionState };

export { inferPromptState, type IosMode, type PromptState };
export { type CommandResult, createSuccessResult, ... } from "@cisco-auto/ios-domain";

// Capabilities
export { resolveCapabilities, type DeviceCapabilities } from "./domain/ios/capabilities/pt-capability-resolver.js";
export { IOSFamily, type IosDeviceModel } from "@cisco-auto/ios-domain";

// Validation
export { validatePTModel, resolveModel } from "./shared/utils/helpers.js";

// PT Compatibility Contract
export { assertCatalogLoaded, assertCatalogHealth, getContractSummary, type PTCatalogHealth } from "@cisco-auto/pt-runtime";

// Application Services
export { LayoutPlannerService, PortPlannerService, LinkFeasibilityService } from "./application/services/index.js";

// PT feature modules
export * from "./pt/terminal/index.js";
export * from "./pt/topology/index.js";
export * from "./pt/server/index.js";
export * from "./pt/planner/index.js";
export * from "./pt/ledger/index.js";
export * from "./pt/diagnosis/index.js";

// Capability Matrix (kernel)
export * from "@cisco-auto/kernel/domain/ios/capability-matrix/index.js";

// Agent workflow
export * from "./agent/index.js";
```

---

## Notas Importantes

- **CliSession NO existe en pt-control** — se re-exporta desde `@cisco-auto/ios-domain`. No definir una interfaz local para esto.
- **VirtualTopology es interno** — TopologyCache lo usa internamente y lo envolvuelve. Para acceso público, usar `getTopologyCache()` del controller.
- **PTController tiene 50+ métodos** — la interfaz oficial está en `src/controller/index.ts` línea 59. La documentación anterior estaba ~70% desactualizada.
- **CommandTraceEntry tiene campos específicos** — id, type, completedAt, ok, ts, status, commandType. No incluye sessionId, device, command, outputPreview, durationMs como decía la versión anterior.
- **DeviceCapabilities tiene 15+ campos** — incluye supportsTrunkEncapsulationCmd, supportsTrunkMode, supportsDot1qEncapsulation, supportsSvi, supportsIpRouting, maxVlanCount, etc. NO tiene type, supportsRouting, supportsAcl, maxVlanId, maxInterfaces, o modules.
