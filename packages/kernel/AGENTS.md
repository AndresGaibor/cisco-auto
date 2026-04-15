# AGENTS.md — @cisco-auto/kernel

> Guía de desarrollo para agentes de IA que trabajan en el paquete kernel.

## Propósito del Paquete

Kernel core que contiene:

- **Domain IOS**: Value Objects, entidades, agregados, schemas Zod para validación IOS
- **Plugins**: Generadores de comandos IOS para VLAN, routing, security, services, switching
- **Plugin API**: Interfaces y sistema de registro de plugins
- **Backends**: Adaptadores para backend Packet Tracer
- **Application**: Use cases y puertos de aplicación

## Arquitectura General

```
src/
├── domain/          # Dominio IOS (entities, value objects, schemas)
├── application/     # Use cases y puertos
├── plugin-api/      # Plugin system (protocol, device, backend plugins)
├── plugins/         # Implementaciones de plugins IOS
└── backends/        # Adaptadores de backend (Packet Tracer)
```

## Clases, Funciones, Métodos y Variables Clave

### Plugin API (plugin-api/)

#### registry.ts

```typescript
// Tipos de plugin
type PluginKind = "protocol" | "device" | "backend";

// Interface del registro
interface PluginRegistry {
  register<K extends PluginKind>(kind: K, plugin: PluginMap[K]): void;
  get<K extends PluginKind>(kind: K, id: string): PluginMap[K] | undefined;
  list<K extends PluginKind>(kind: K): readonly PluginMap[K][];
}

// Implementación por defecto
class DefaultPluginRegistry implements PluginRegistry {
  private plugins: { [K in PluginKind]: Map<string, PluginMap[K]> };
  register<K extends PluginKind>(kind: K, plugin: PluginMap[K]): void;
  get<K extends PluginKind>(kind: K, id: string): PluginMap[K] | undefined;
  list<K extends PluginKind>(kind: K): readonly PluginMap[K][];
}
```

#### plugin.types.ts

```typescript
// Categorías de plugin
type PluginCategory = "switching" | "routing" | "security" | "services" | "backend" | "device";

// Definición de comando de plugin
interface PluginCommandDefinition {
  name: string;
  description: string;
  inputSchema: ZodSchema;
  examples: Array<{ input: Record<string, unknown>; description: string }>;
}

// Resultado de validación
interface PluginValidationResult {
  ok: boolean;
  errors: Array<{ path: string; message: string; code: string }>;
  warnings?: string[];
}
```

#### protocol.plugin.ts

```typescript
interface ProtocolPlugin {
  id: string;
  category: "switching" | "routing" | "security" | "services";
  name: string;
  version: string;
  description: string;
  commands: PluginCommandDefinition[];
  validate(config: unknown): PluginValidationResult;
}
```

#### backend.plugin.ts

```typescript
interface BackendPlugin extends BackendPort {
  category: "backend";
  name: string;
  version: string;
  validate(config: unknown): PluginValidationResult;
}

interface BackendPort {
  connect(config: unknown): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
```

#### device.plugin.ts

```typescript
interface DevicePlugin {
  category: "device";
  name: string;
  version: string;
  supportedModels: string[];
  validate(device: unknown): PluginValidationResult;
}
```

---

### Plugins IOS

Todos los plugins exportan:

- Función `validate*Config(spec: unknown): PluginValidationResult`
- Objeto `*Plugin: ProtocolPlugin` (export default o named)
- Generator functions para generar comandos IOS

#### VLAN Plugin (plugins/vlan/)

```typescript
// Schema de configuración
type VlanConfigInput = {
  switchName: string;
  vlans: Array<{ id: string | number; name?: string }>;
  trunkPorts?: string[];
  accessPorts?: Array<{ port: string; vlan: string | number }>;
};

type SviConfigInput = {
  deviceName: string;
  svis: Array<{
    vlanId: string | number;
    ipAddress: string;
    subnetMask: string;
    description?: string;
    shutdown?: boolean;
  }>;
  ipRouting?: boolean;
};

// Funciones exportadas
export function validateVlanConfig(spec: unknown): PluginValidationResult;
export function validateSviConfig(
  spec: unknown,
  vlanConfig?: VlanConfigInput,
): PluginValidationResult;
export function generateVlanCommands(config: VlanConfigInput): string[];
export function generateSviCommands(config: SviConfigInput): string[];
export const VLAN_VERIFY_COMMANDS: string[];
export const SVI_VERIFY_COMMANDS: string[];
export function verifyShowVlanBriefOutput(output: string): boolean;
export function verifyShowIpInterfaceBrief(output: string): boolean;
```

#### Routing Plugin (plugins/routing/)

```typescript
// Schema de configuración
type RoutingConfigInput = {
  deviceName: string;
  staticRoutes?: Array<{
    network: string;
    mask: string;
    nextHop: string;
    administrativeDistance?: number;
  }>;
  ospf?: {
    processId: number;
    areas: Array<{
      areaId: string | number;
      networks: Array<{ network: string; wildcard: string }>;
    }>;
    routerId?: string;
    passiveInterfaces?: string[];
  };
  eigrp?: {
    asNumber: number;
    networks: string[];
    routerId?: string;
    passiveInterfaces?: string[];
  };
  bgp?: {
    asn: number;
    neighbors: Array<{
      ip: string;
      remoteAs: number;
      description?: string;
      nextHopSelf?: boolean;
    }>;
    routerId?: string;
    networks?: Array<{ network: string; mask?: string }>;
  };
};

// Funciones exportadas
export function validateRoutingConfig(spec: unknown): PluginValidationResult;
export function generateRoutingCommands(config: RoutingConfigInput): string[];
export const ROUTING_VERIFY_COMMANDS: string[];
```

#### Security Plugin (plugins/security/)

```typescript
// Schema de configuración
type SecurityConfigInput = {
  deviceName: string;
  acls?: Array<{
    name: string;
    type: "standard" | "extended";
    rules: Array<{
      action: "permit" | "deny";
      source: string;
      protocol?: "ip" | "tcp" | "udp" | "icmp" | undefined;
      sourceWildcard?: string;
      destination?: string;
      destinationWildcard?: string;
      destinationPort?: string;
    }>;
    appliedOn?: string;
    direction?: "in" | "out";
  }>;
  natStatic?: Array<{ localIp: string; globalIp: string }>;
  natPool?: { name: string; startIp: string; endIp: string; netmask: string };
  natInsideInterfaces?: string[];
  natOutsideInterfaces?: string[];
};

// Funciones exportadas
export function validateSecurityConfig(spec: unknown): PluginValidationResult;
export function generateSecurityCommands(config: SecurityConfigInput): string[];
export const SECURITY_VERIFY_COMMANDS: string[];
export function verifyShowAccessLists(output: string): boolean;
```

#### Services Plugin (plugins/services/)

```typescript
// Schema de configuración
type ServicesConfigInput = {
  deviceName: string;
  dhcp?: Array<{
    name: string;
    network: string;
    mask: string;
    defaultRouter?: string;
    dnsServers?: string[];
    domainName?: string;
    excludedAddresses?: string[];
    lease?: number;
  }>;
  ntp?: {
    servers?: Array<{ ip: string; prefer?: boolean; stratum?: number }>;
    master?: boolean;
    stratum?: number;
  };
  dns?: { domainName?: string; nameServers?: string[] };
  syslog?: {
    servers: Array<{ ip: string; severity?: string }>;
    trap?: string;
  };
  snmp?: {
    communities?: Array<{ name: string; access: "ro" | "rw" }>;
    hosts?: Array<{ ip: string; community: string }>;
  };
};

// Funciones exportadas
export function validateServicesConfig(spec: unknown): PluginValidationResult;
export function generateServicesCommands(config: ServicesConfigInput): string[];
export const SERVICES_VERIFY_COMMANDS: string[];
export function verifyShowIpDhcpBinding(output: string): boolean;
```

#### Switching Plugin (plugins/switching/)

```typescript
// EtherChannel y spanning-tree
// Exporta comandos de configuración para port-channel, spanning-tree, etc.
```

#### Basic Config Plugin (plugins/basic-config/)

```typescript
// Configuración básica de dispositivo: hostname, enable secret, etc.
```

#### IPv6 Plugin (plugins/ipv6/)

```typescript
// Configuración IPv6: addresses, routing, etc.
```

#### Port Template Plugin (plugins/port-template/)

```typescript
// Templates de configuración de puertos
```

#### Orchestrator Plugin (plugins/orchestrator/)

```typescript
// Orquestación de múltiples plugins
```

---

### Backend Packet Tracer (backends/packet-tracer/)

#### packet-tracer.plugin.ts

```typescript
interface PacketTracerBackendPlugin extends BackendPlugin {
  id: "packet-tracer";
  description: string;
  addDevice(name: string, model: string, options?: { x?: number; y?: number }): Promise<unknown>;
  removeDevice(name: string): Promise<void>;
  configureDevice(name: string, commands: string[]): Promise<unknown>;
  execShow(name: string, command: string): Promise<unknown>;
  addLink(device1: string, port1: string, device2: string, port2: string): Promise<unknown>;
  removeLink(device: string, port: string): Promise<void>;
  getTopology(): Promise<unknown>;
}

function createPacketTracerBackendPlugin(
  adapter: PacketTracerBackendAdapter,
): PacketTracerBackendPlugin;
```

#### packet-tracer.adapter.ts

```typescript
interface PacketTracerBackendAdapter {
  connect(config: unknown): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  addDevice(name: string, model: string, options?: { x?: number; y?: number }): Promise<unknown>;
  removeDevice(name: string): Promise<void>;
  configureDevice(name: string, commands: string[]): Promise<unknown>;
  execShow(name: string, command: string): Promise<unknown>;
  addLink(device1: string, port1: string, device2: string, port2: string): Promise<unknown>;
  removeLink(device: string, port: string): Promise<void>;
  getTopology(): Promise<unknown>;
}

interface PacketTracerAdapterDependencies {
  createController(config: PacketTracerBackendConfig): PacketTracerControllerLike;
}

function createPacketTracerAdapter(
  dependencies: PacketTracerAdapterDependencies,
): PacketTracerBackendAdapter;
```

---

### Domain IOS

#### Value Objects (domain/ios/value-objects/)

```typescript
// VlanId - ID de VLAN validado (1-4094)
class VlanId extends ValueObject<number> {
  static from(value: number): VlanId;
  static fromString(value: string): VlanId;
  static tryFrom(value: string | number): VlanId | null;
  static isValid(value: string | number): boolean;
  compareTo(other: VlanId): number;
  toNumber(): number;
  toString(): string;
  toJSON(): number;
}

// Ipv4Address - Dirección IPv4 validada
class Ipv4Address extends ValueObject<string> {
  static fromJSON(value: string): Ipv4Address;
  toJSON(): string;
  toInt(): number;
  getSubnetAddress(prefixLength: number): Ipv4Address;
}

// MacAddress - Dirección MAC validada
class MacAddress extends ValueObject<string> {
  static fromJSON(value: string): MacAddress;
  toJSON(): string;
  toCiscoFormat(): string;
  toColonFormat(): string;
  toHyphenFormat(): string;
  toBareFormat(): string;
}

// DeviceId - Identificador de dispositivo validado
class DeviceId extends ValueObject<string> {
  static from(value: string): DeviceId;
  static tryFrom(value: string): DeviceId | null;
  static isValid(value: string): boolean;
  toJSON(): string;
}

// InterfaceName - Nombre de interfaz IOS (GigabitEthernet0/0, etc.)
class InterfaceName extends ValueObject<string> {
  static fromJSON(value: string): InterfaceName;
  toJSON(): string;
}
```

#### Entidades (domain/ios/entities/)

```typescript
// DeviceEntity
class DeviceEntity {
  readonly _id: DeviceId;
  readonly _deviceType: DeviceType;
  readonly _model: string;
  private _hostname: string;
  private _interfaces: Map<string, InterfaceEntity>;
  private _vlans: Set<number>;

  get id(): DeviceId;
  get deviceType(): DeviceType;
  get model(): string;
  get hostname(): string;
  get vlans(): ReadonlySet<number>;
  get interfaces(): ReadonlyMap<string, InterfaceEntity>;
  get interfaceCount(): number;

  configureHostname(hostname: string): void;
  addInterface(name: InterfaceName): InterfaceEntity;
  getInterface(name: string): InterfaceEntity | undefined;
  getOrCreateInterface(name: InterfaceName): InterfaceEntity;
}

// InterfaceEntity
class InterfaceEntity {
  assignIp(ipAddress: Ipv4Address, subnetMask: SubnetMask): void;
  removeIp(): void;
  enable(): void;
  disable(): void;
  setMacAddress(mac: MacAddress): void;
  setTrunk(nativeVlan?: VlanId): void;
  setAccessVlan(vlan: VlanId): void;
  setRouted(): void;
  setAllowedVlans(vlans: number[]): void;
  toJSON(): Record<string, unknown>;
}
```

#### Schemas Zod (domain/ios/schemas/)

```typescript
// Routing
import { routingConfigSchema, type RoutingConfigInput } from "./routing/ospf.schema.ts";

// VLAN
import { vlanSchema, type VlanConfigInput } from "./switching/vlan.schema.ts";

// Security (ACL/NAT)
import { securitySchema, type SecurityConfigInput } from "./security/acl.schema.ts";

// Services (DHCP, NTP, DNS, Syslog, SNMP)
import { servicesSchema, type ServicesConfigInput } from "./services/dhcp.schema.ts";
```

---

### Domain Compartido (domain/shared/)

```typescript
// DomainError - Errores de dominio
class DomainError extends Error {
  readonly code: string;
  readonly context?: Record<string, unknown>;
  static invalidValue(
    type: string,
    value: unknown,
    reason?: string,
    context?: Record<string, unknown>,
  ): DomainError;
  static invariantViolation(message: string, context?: Record<string, unknown>): DomainError;
  static notFound(type: string, id: string, context?: Record<string, unknown>): DomainError;
  static notAllowed(
    operation: string,
    reason: string,
    context?: Record<string, unknown>,
  ): DomainError;
  static conflict(message: string, context?: Record<string, unknown>): DomainError;
}

// ValueObject - Base para todos los Value Objects
abstract class ValueObject<T> {
  readonly _value: T;
  equals(other: ValueObject<T>): boolean;
  toJSON(): unknown;
  toString(): string;
}

// AggregateBase, EntityBase - Bases para agregados y entidades
```

---

## Patrones de Uso

### Registrar un Plugin

```typescript
import { DefaultPluginRegistry } from "./registry.js";

const registry = new DefaultPluginRegistry();
registry.register("protocol", routingPlugin);
```

### Validar Configuración de Plugin

```typescript
import { validateRoutingConfig } from "./plugins/routing/routing.plugin.js";

const result = validateRoutingConfig({
  deviceName: "R1",
  ospf: {
    processId: 1,
    areas: [{ areaId: 0, networks: [{ network: "192.168.1.0", wildcard: "0.0.0.255" }] }],
  },
});

if (!result.ok) {
  console.error("Validation errors:", result.errors);
}
```

### Generar Comandos IOS

```typescript
import { generateVlanCommands } from "./plugins/vlan/vlan.generator.js";

const commands = generateVlanCommands({
  switchName: "Switch1",
  vlans: [
    { id: 10, name: "ADMIN" },
    { id: 20, name: "USERS" },
  ],
  accessPorts: [{ port: "FastEthernet0/1", vlan: 10 }],
});

// commands = ['vlan 10', 'name ADMIN', 'vlan 20', 'name USERS', ...]
```

---

## Uso con pt-runtime

El kernel genera comandos IOS que son ejecutados por el runtime de PT. La cadena es:

1. **Kernel** valida config y genera comandos IOS (string[])
2. **pt-runtime** recibe comandos y los ejecuta en PT via IPC
3. **Packet Tracer** ejecuta los comandos en el dispositivo simulado

## Exportaciones del Paquete

```typescript
// Index principal
export * from "./domain/index.js";
export * from "./application/index.js";
export * from "./plugin-api/index.js";
export * from "./plugins/index.js";
export * from "./backends/index.js";
```
