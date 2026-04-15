# AGENTS.md — @cisco-auto/ios-domain

> Guía de desarrollo para agentes de IA que trabajan en el paquete ios-domain.

## Propósito del Paquete

Dominio IOS compartido para automatización Cisco. Proporciona parsers IOS, operaciones de sesión, utilities, y capabilities de dispositivo.

## Arquitectura General

```
src/
├── index.ts            # Main exports
├── errors.ts           # Errores IOS específicos
├── capabilities/       # Resolución de capacidades de dispositivo
│   ├── index.ts
│   ├── capability-matrix.ts
│   └── ios-families.ts
├── parsers/            # Parsers para outputs IOS
│   ├── index.ts
│   ├── show-commands.ts
│   └── config-parser.ts
├── operations/         # Operaciones IOS
│   ├── index.ts
│   ├── vlan-operations.ts
│   ├── routing-operations.ts
│   └── interface-operations.ts
├── session/            # Gestión de sesiones CLI
│   ├── index.ts
│   ├── cli-session.ts
│   └── session-state.ts
└── utils/              # Utilidades IOS
    ├── index.ts
    ├── ios-modes.ts
    └── command-builder.ts
```

## Clases, Funciones, Métodos y Variables Clave

### Capabilities

```typescript
// Matriz de capacidades de dispositivo
interface DeviceCapability {
  supportsVlan: boolean;
  supportsVtp: boolean;
  supportsDtp: boolean;
  supportsRouting: boolean;
  supportsOsPF: boolean;
  supportsEIGRP: boolean;
  supportsBGP: boolean;
  supportsACL: boolean;
  supportsNAT: boolean;
  supportsDHCP: boolean;
  supportsNTP: boolean;
  supportsSyslog: boolean;
  supportsSNMP: boolean;
  maxVlanId: number;
  maxInterfaces: number;
  maxVlans: number;
  supportsModuleSlot: boolean;
  supportedModules: string[];
}

interface IosFamily {
  family: IOSFamily;
  vendor: string;
  capabilities: DeviceCapability;
  defaultPrivilege: PrivilegeLevel;
  supportedModes: IosMode[];
}

type IOSFamily = "cisco-ios" | "cisco-ios-xe" | "cisco-nxos" | "cisco-wlc" | "unknown";

type PrivilegeLevel = "user" | "priv-1" | "priv-15";

interface IosDeviceModel {
  model: string;
  family: IOSFamily;
  capabilities: DeviceCapability;
  defaultImage: string;
}

// Funciones
function getCapabilities(model: string): DeviceCapability;
function getIosFamily(model: string): IOSFamily;
function isSwitch(model: string): boolean;
function isRouter(model: string): boolean;
function supportsRouting(model: string): boolean;

export const IOS_CAPABILITY_MATRIX: Record<string, DeviceCapability>;
export const IOS_FAMILIES: Record<IOSFamily, IosFamily>;
```

### Parsers

```typescript
// Parsers para outputs de comandos show

// parseShowIpInterfaceBrief
interface IpInterfaceBriefEntry {
  interface: string;
  ipAddress: string;
  status: "up" | "down";
  protocol: "up" | "down";
}

function parseShowIpInterfaceBrief(output: string): IpInterfaceBriefEntry[];

// parseShowVlan
interface VlanInfo {
  vlanId: number;
  name: string;
  status: "active" | "suspend";
  ports: string[];
}

function parseShowVlan(output: string): VlanInfo[];

// parseShowIpRoute
interface RouteEntry {
  network: string;
  mask: string;
  protocol: "O" | "D" | "R" | "S" | "C" | "L";
  adminDistance: number;
  metric: number;
  nextHop: string;
  interface: string;
}

function parseShowIpRoute(output: string): RouteEntry[];

// parseShowRunningConfig
interface ConfigSection {
  section: string;
  lines: string[];
}

function parseShowRunningConfig(output: string): ConfigSection[];

// parseShowInterfaces
interface InterfaceInfo {
  name: string;
  status: string;
  protocol: string;
  ipAddress?: string;
  macAddress?: string;
  bandwidth?: string;
  delay?: string;
  reliability?: string;
  txLoad?: string;
  rxLoad?: string;
  encapsulation?: string;
}

function parseShowInterfaces(output: string): InterfaceInfo[];

// parseShowIpArp
interface ArpEntry {
  protocol: string;
  address: string;
  age: number;
  mac: string;
  interface: string;
  static: boolean;
  dynamic: boolean;
}

function parseShowIpArp(output: string): ArpEntry[];

// parseShowMacAddressTable
interface MacEntry {
  vlan: number;
  mac: string;
  type: "dynamic" | "static";
  interface: string;
  age: number;
}

function parseShowMacAddressTable(output: string): MacEntry[];

// parseShowSpanningTree
interface StpInfo {
  vlanId: number;
  rootId: string;
  rootCost: number;
  rootPort?: string;
  priority: number;
  bridgeId: string;
}

function parseShowSpanningTree(output: string): StpInfo[];

// parseShowVersion
interface VersionInfo {
  ios: string;
  version: string;
  image: string;
  uptime: string;
  lastReload: string;
  reason: string;
}

function parseShowVersion(output: string): VersionInfo;

// parseShowCdpNeighbors
interface CdpNeighbor {
  deviceId: string;
  localInterface: string;
  holdTime: number;
  capability: string[];
  platform: string;
  interface: string;
}

function parseShowCdpNeighbors(output: string): CdpNeighbor[];

// Parser functions
function parseOutput(command: string, output: string): unknown;
function getParser(name: string): ParserFunction | undefined;

const PARSERS: Record<string, ParserFunction>;
```

### Session

```typescript
// Gestión de sesiones CLI stateful
interface CliSession {
  device: string;
  mode: IosMode;
  prompt: string;
  isConnected: boolean;

  execute(command: string): Promise<CommandResult>;
  executeShow(showCommand: string): Promise<string>;
  enterPriv(): Promise<void>;
  exitPriv(): Promise<void>;
  enterConfig(): Promise<void>;
  exitConfig(): Promise<void>;
  close(): Promise<void>;
  waitForPrompt(timeoutMs?: number): Promise<void>;
  sendResponse(response: string): Promise<void>;
}

interface CommandResult {
  ok: boolean;
  output: string;
  status: number;
  mode: IosMode;
  paging: boolean;
  rawOutput: string;
}

interface CommandHistoryEntry {
  command: string;
  output: string;
  timestamp: number;
  status: number;
  mode: IosMode;
  durationMs: number;
}

interface CliSessionState {
  device: string;
  mode: IosMode;
  prompt: string;
  hostname: string;
  paging: boolean;
  awaitingConfirm: boolean;
  awaitingPassword: boolean;
  lastOutput: string;
  connectionTime: number;
}

type CommandHandler = (result: CommandResult) => void | Promise<void>;

// Funciones de sesión
function createCliSession(device: string, term: PTCommandLine): CliSession;
function createSessionState(device: string): CliSessionState;
function updateSessionState(state: CliSessionState, output: string): CliSessionState;
function inferModeFromPrompt(prompt: string): IosMode;

// Output classification
interface OutputClassification {
  type: OutputClassificationType;
  cleaned: string;
  hasError: boolean;
  needsResponse: boolean;
}

type OutputClassificationType =
  | "success"
  | "error"
  | "paging"
  | "confirm"
  | "password"
  | "dns-lookup"
  | "unknown";

function classifyOutput(output: string): OutputClassification;
function isSuccessResult(result: CommandResult): boolean;
function isErrorResult(result: CommandResult): boolean;
function isPagingResult(result: CommandResult): boolean;
function isConfirmPrompt(output: string): boolean;
function isPasswordPrompt(output: string): boolean;
function isDnsLookup(output: string): boolean;

// Prompt state
interface PromptState {
  mode: IosMode;
  hostname: string;
  partial: boolean;
}

type IosMode =
  | "user-exec"
  | "priv-exec"
  | "config"
  | "config-if"
  | "config-line"
  | "config-router"
  | "config-vlan"
  | "config-subif"
  | "unknown";

function inferPromptState(prompt: string): PromptState;
function isPrivileged(mode: IosMode): boolean;
function isConfigMode(mode: IosMode): boolean;
```

### Operations

```typescript
// Operaciones IOS de alto nivel

// VLAN Operations
interface VlanOperation {
  type: "create-vlan" | "delete-vlan" | "configure-vlan" | "assign-port";
  switch?: string;
  vlanId?: number;
  vlanName?: string;
  port?: string;
  mode?: "access" | "trunk";
  accessVlan?: number;
}

function buildVlanCommands(op: VlanOperation): string[];
function parseVlanOperation(config: unknown): VlanOperation;

// Routing Operations
interface RoutingOperation {
  type: "static-route" | "ospf" | "eigrp" | "bgp";
  device: string;
  config: RoutingConfig;
}

function buildRoutingCommands(op: RoutingOperation): string[];
function parseRoutingConfig(config: unknown): RoutingOperation;

// Interface Operations
interface InterfaceOperation {
  type: "set-ip" | "set-description" | "set-speed" | "set-duplex" | "set-switchport";
  interface: string;
  params: Record<string, unknown>;
}

function buildInterfaceCommands(op: InterfaceOperation): string[];
```

### Utils

```typescript
// IOS Modes
const IOS_MODES: Record<IosMode, ModeInfo>;

interface ModeInfo {
  name: IosMode;
  promptPattern: RegExp;
  parentMode?: IosMode;
  defaultPrivilege: PrivilegeLevel;
}

const MODE_TRANSITIONS: Record<IosMode, IosMode[]>;

function canTransitionTo(mode: IosMode, targetMode: IosMode): boolean;
function getRequiredCommands(from: IosMode, to: IosMode): string[];

// Command Builder
interface CommandBuilder {
  // VLAN
  vlan(id: number): string;
  noVlan(id: number): string;
  vlanName(id: number, name: string): string;

  // Interface
  interface(name: string): string;
  noInterface(name: string): string;
  ipAddress(ip: string, mask: string): string;
  noIpAddress(): string;
  description(text: string): string;
  shutdown(): string;
  noShutdown(): string;

  // Routing
  routerOspf(processId: number): string;
  network(address: string, wildcard: string, area: string): string;
  routerEigrp(as: number): string;
  network(address: string, wildcard: string): string;

  // ACL
  accessList(name: string, action: "permit" | "deny", ...args: string[]): string;
  applyAcl(name: string, direction: "in" | "out"): string;
}

const iosCommandBuilder: CommandBuilder;

function buildCommand(template: string, params: Record<string, string>): string;
function normalizeInterfaceName(name: string): string;
```

### Errors

```typescript
// Errores específicos de IOS
class IosError extends Error {
  code: IosErrorCode;
  device?: string;
  command?: string;
  rawOutput?: string;
}

type IosErrorCode =
  | "INVALID_MODE"
  | "INVALID_COMMAND"
  | "INCOMPLETE_COMMAND"
  | "AMBIGUOUS_COMMAND"
  | "NOT_CONNECTED"
  | "TIMEOUT"
  | "DEVICE_NOT_FOUND";

function createIosError(
  code: IosErrorCode,
  message: string,
  options?: { device?: string; command?: string; rawOutput?: string },
): IosError;

function isIosError(error: unknown): error is IosError;
```

---

## Exportaciones del Paquete

```typescript
export * from "./errors.js";
export * from "./capabilities/index.js";
export * from "./parsers/index.js";
export * from "./operations/index.js";
export * from "./session/index.js";
export * from "./utils/index.js";

// Tipos principales
export type {
  IosMode,
  IosDeviceModel,
  DeviceCapability,
  CliSession,
  CommandResult,
  PromptState,
  OutputClassificationType,
};
```
