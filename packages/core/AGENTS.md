# AGENTS.md — @cisco-auto/core

> Guía de desarrollo para agentes de IA que trabajan en el paquete core.

## Propósito del Paquete

Lógica de red core para cisco-auto (incluye lab-model, tools, templates). Proporciona utilidades comunes, validación de laboratorio, manejo de memoria de dispositivos, y templates de configuración.

## Arquitectura General

```
src/
├── parser/             # YAML parser para labs
├── types/             # Tipos core
├── topology/          # Gestión de topología
├── canonical/         # Estado canónico
├── executor/          # Ejecutor de operaciones
├── validation/        # LabValidator
├── config/            # Configuración y loader
├── context/           # Contexto de ejecución
├── memory/            # Memoria de dispositivos (schema, devices, audit)
├── tools/             # Herramientas para PT
├── templates/          # Plantillas de laboratorio
└── catalog/           # Catálogo de dispositivos
```

## Clases, Funciones, Métodos y Variables Clave

### VLAN Value Objects (re-exportados de kernel)

```typescript
// VlanId
class VlanId {
  static from(value: number): VlanId;
  static fromString(value: string): VlanId;
  static tryFrom(value: string | number): VlanId | null;
  static isValid(value: string | number): boolean;
  toNumber(): number;
  toString(): string;
}

// VlanName
class VlanName {
  static from(value: string): VlanName;
  static tryFrom(value: string): VlanName | null;
  isValid(value: string): boolean;
}

// VlanRange
class VlanRange {
  static from(value: string): VlanRange; // e.g., "10-20,30,40-50"
  static tryFrom(value: string): VlanRange | null;
  getIds(): number[];
}

// VtpMode
type VtpModeType = "server" | "client" | "transparent" | "off";
class VtpMode {
  static from(value: string): VtpMode;
  static tryFrom(value: string): VtpMode | null;
  isValid(value: string): boolean;
}

// VtpDomain, VtpPassword, VtpVersion
class VtpDomain {
  static from(value: string): VtpDomain;
}
class VtpPassword {
  static from(value: string): VtpPassword;
}
class VtpVersion {
  static from(value: string): VtpVersion;
}
```

### Validation

```typescript
// LabValidator
interface LabValidator {
  validate(lab: LabDefinition): ValidationResult
  validateTopology(topology: TopologyDefinition): TopologyValidationResult
  validateConfig(config: DeviceConfig): ConfigValidationResult
}

interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

function validateLab(lab: LabDefinition): ValidationResult
function LabValidator.validate(lab: LabDefinition): ValidationResult
```

### Parser

```typescript
// YAML Parser para archivos de lab
function parseYamlLab(content: string): LabDefinition;
function parseYamlTopology(content: string): TopologyDefinition;
function parseYamlConfig(content: string): DeviceConfig;

interface LabDefinition {
  name: string;
  topology: TopologyDefinition;
  devices: DeviceConfig[];
  links?: LinkConfig[];
}

interface TopologyDefinition {
  devices: Array<{
    name: string;
    type: string;
    model: string;
    x?: number;
    y?: number;
  }>;
  links: Array<{
    from: string;
    fromPort: string;
    to: string;
    toPort: string;
    type?: string;
  }>;
}
```

### Topology

```typescript
// Gestión de topología
interface TopologyState {
  devices: Map<string, TopologyDevice>;
  links: Map<string, TopologyLink>;
  zones: Map<string, TopologyZone>;
}

interface TopologyDevice {
  id: string;
  name: string;
  model: string;
  type: DeviceType;
  position: { x: number; y: number };
  interfaces: TopologyInterface[];
  powered: boolean;
}

interface TopologyLink {
  id: string;
  source: { device: string; port: string };
  target: { device: string; port: string };
  type: CableType;
}

interface TopologyInterface {
  name: string;
  ipAddress?: string;
  subnetMask?: string;
  status: PortStatus;
  vlan?: number;
}

// Operations
function createTopology(): TopologyState;
function addDevice(state: TopologyState, device: TopologyDevice): void;
function removeDevice(state: TopologyState, deviceId: string): void;
function addLink(state: TopologyState, link: TopologyLink): void;
function removeLink(state: TopologyState, linkId: string): void;
```

### Canonical (Estado Canónico)

```typescript
// Estado canónico de la red
interface CanonicalState {
  devices: CanonicalDevices;
  links: CanonicalLinks;
  vlans: CanonicalVlan[];
  routing: CanonicalRoutingTable;
}

interface CanonicalDevice {
  hostname: string;
  domain: string;
  enabled: boolean;
  interfaces: CanonicalInterface[];
  vlans: number[];
  routingProtocols: RoutingProtocol[];
}

interface CanonicalInterface {
  name: string;
  ipAddress?: string;
  subnetMask?: string;
  description?: string;
  shutdown: boolean;
  switchportMode?: "access" | "trunk";
  accessVlan?: number;
  trunkVlans?: number[];
  voiceVlan?: number;
}

// Functions
function toCanonical(devices: TopologyDevice[]): CanonicalState;
function fromCanonical(state: CanonicalState): TopologyDevice[];
function diffCanonical(before: CanonicalState, after: CanonicalState): CanonicalDiff[];
```

### Executor

```typescript
// Ejecutor de operaciones de red
interface Executor {
  execute(op: NetworkOperation): Promise<OperationResult>;
  executeBatch(ops: NetworkOperation[]): Promise<BatchResult>;
  validateOp(op: NetworkOperation): ValidationResult;
}

interface NetworkOperation {
  type: OperationType;
  device?: string;
  params: Record<string, unknown>;
}

type OperationType =
  | "add-device"
  | "remove-device"
  | "configure-interface"
  | "add-vlan"
  | "configure-vlan"
  | "add-route"
  | "apply-acl"
  | "save-config";

interface OperationResult {
  ok: boolean;
  output?: string;
  error?: string;
  device?: string;
}

interface BatchResult {
  results: OperationResult[];
  total: number;
  succeeded: number;
  failed: number;
}
```

### Config

```typescript
// Configuración de red
interface ConfigLoader {
  load(path: string): Promise<NetworkConfig>;
  loadYaml(path: string): Promise<NetworkConfig>;
  loadJson(path: string): Promise<NetworkConfig>;
}

interface ConfigResolver {
  resolveDeviceConfig(device: string, config: DeviceConfig): ResolvedConfig;
  resolveInterfaceConfig(
    device: string,
    iface: string,
    config: InterfaceConfig,
  ): ResolvedInterfaceConfig;
  mergeDefaults(config: Partial<DeviceConfig>): DeviceConfig;
}

interface NetworkConfig {
  name: string;
  devices: DeviceConfig[];
  links: LinkConfig[];
  vlans?: VlanConfig[];
  routing?: RoutingConfig[];
}

interface DeviceConfig {
  name: string;
  hostname?: string;
  model: string;
  interfaces?: InterfaceConfig[];
  vlans?: VlanConfig[];
  routing?: RoutingConfig[];
  services?: ServiceConfig[];
}
```

### Memory (Memoria de Dispositivos)

```typescript
// Memoria de dispositivos - persistencia y auditoría
interface DeviceMemory {
  // Device state
  getDevice(name: string): DeviceMemoryEntry | null;
  getAllDevices(): DeviceMemoryEntry[];
  saveDevice(entry: DeviceMemoryEntry): void;
  removeDevice(name: string): void;

  // Queries
  findByModel(model: string): DeviceMemoryEntry[];
  findByVlan(vlanId: number): DeviceMemoryEntry[];
  findByIp(ip: string): DeviceMemoryEntry | null;

  // Audit
  getAuditLog(options?: AuditQueryOptions): AuditEntry[];
  addAuditEntry(entry: AuditEntry): void;
}

interface DeviceMemoryEntry {
  name: string;
  model: string;
  type: DeviceType;
  addedAt: number;
  lastSeen: number;
  ipAddress?: string;
  macAddress?: string;
  vlans: number[];
  interfaces: InterfaceMemoryEntry[];
  tags: string[];
  metadata: Record<string, unknown>;
}

interface InterfaceMemoryEntry {
  name: string;
  ipAddress?: string;
  subnetMask?: string;
  macAddress?: string;
  status: "up" | "down";
  vlan?: number;
  lastChange: number;
}

interface AuditEntry {
  timestamp: number;
  operation: AuditOperation;
  device?: string;
  interface?: string;
  user?: string;
  details: Record<string, unknown>;
}

type AuditOperation =
  | "device-added"
  | "device-removed"
  | "interface-configured"
  | "vlan-created"
  | "route-added"
  | "config-saved";

function getMemory(): DeviceMemory;
function resetMemory(): void;
```

### Tools (Herramientas para PT)

```typescript
// Herramientas utility para PT
interface PTTools {
  // Network analysis
  analyzeTopology(topology: TopologyState): TopologyAnalysis;
  findPath(from: string, to: string, topology: TopologyState): Path[];
  findCycles(topology: TopologyState): Cycle[];

  // Calculations
  calculateSubnet(ip: string, mask: string): SubnetInfo;
  calculateVlanRange(range: string): number[];
  cidrToMask(cidr: number): string;
  maskToCidr(mask: string): number;

  // Validations
  isValidIp(ip: string): boolean;
  isValidMask(mask: string): boolean;
  isValidMac(mac: string): boolean;
  isValidVlanId(id: number): boolean;
}

interface SubnetInfo {
  network: string;
  broadcast: string;
  firstIp: string;
  lastIp: string;
  cidr: number;
  mask: string;
  size: number;
}
```

### Templates (Plantillas de Laboratorio)

```typescript
// Plantillas para crear labs estándar
interface LabTemplate {
  name: string;
  description: string;
  category: TemplateCategory;
  devices: DeviceConfig[];
  topology: TopologyDefinition;
  estimatedTime?: string;
}

type TemplateCategory = "basic" | "routing" | "switching" | "security" | "services" | "enterprise";

interface Templates {
  list(): LabTemplate[];
  get(name: string): LabTemplate | null;
  apply(template: LabTemplate, context: ApplicationContext): AppliedTemplate;
}

function getTemplates(): Templates;
function loadTemplate(name: string): LabTemplate | null;
```

---

## Exportaciones del Paquete

```typescript
export * from "./parser/yaml-parser";
export * from "./types/index";
export * from "./topology/index";
export * from "./canonical/index.ts";
export * from "./executor/index.ts";
export * from "./config/types.ts";
export * from "./config/resolver.ts";
export * from "./config/loader.ts";
export * from "./context/index.ts";
export * from "./memory/index.ts";
export * from "./tools/index";
export * from "./templates/index";

// VLAN re-exports from kernel
export { VlanId, VlanName, VlanRange, VtpMode, VtpDomain, VtpPassword, VtpVersion };
export type { VtpModeType, VtpVersionType };

// Validation
export { validateLab, LabValidator };

// Catalog
export { PortDefinitionVO, ModuleDefinitionVO, DeviceModelVO, DeviceHardwareProfile };
```
