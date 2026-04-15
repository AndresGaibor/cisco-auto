# AGENTS.md — @cisco-auto/types

> Guía de desarrollo para agentes de IA que trabajan en el paquete types.

## Propósito del Paquete

Tipos compartidos y schemas Zod para el monorepo cisco-auto. Single Source of Truth para todas las definiciones de tipos entre paquetes.

## Arquitectura General

```
src/
├── index.ts            # Main exports
├── schemas/            # Zod schemas para validación
│   ├── index.ts
│   ├── device.ts
│   ├── vlan.ts
│   ├── routing.ts
│   ├── acl.ts
│   └── dhcp.ts
├── types/              # TypeScript types
│   ├── index.ts
│   ├── device.ts
│   ├── network.ts
│   └── ios.ts
├── command-catalog.ts  # Catálogo de comandos IOS
└── pt-api/             # Tipos para la API de PT
    └── index.ts
```

## Clases, Funciones, Métodos y Variables Clave

### Schemas (Zod)

```typescript
// Device schemas
const DeviceSchema: z.ZodObject<{
  name: z.ZodString;
  model: z.ZodString;
  type: z.ZodNumber;
  x: z.ZodOptional<z.ZodNumber>;
  y: z.ZodOptional<z.ZodNumber>;
}>;

const AddDeviceSchema: z.ZodObject<{
  type: z.ZodLiteral<"addDevice">;
  model: z.ZodOptional<z.ZodString>;
  name: z.ZodOptional<z.ZodString>;
  x: z.ZodOptional<z.ZodNumber>;
  y: z.ZodOptional<z.ZodNumber>;
  deviceType: z.ZodOptional<z.ZodNumber>;
}>;

// VLAN schemas
const VlanConfigSchema: z.ZodObject<{
  switchName: z.ZodString;
  vlans: z.ZodArray<VlanEntrySchema>;
  trunkPorts: z.ZodOptional<z.ZodArray<z.ZodString>>;
  accessPorts: z.ZodOptional<z.ZodArray<AccessPortSchema>>;
}>;

const VlanEntrySchema: z.ZodObject<{
  id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
  name: z.ZodOptional<z.ZodString>;
}>;

const SviConfigSchema: z.ZodObject<{
  deviceName: z.ZodString;
  svis: z.ZodArray<SviEntrySchema>;
  ipRouting: z.ZodOptional<z.ZodBoolean>;
}>;

// Routing schemas
const RoutingConfigSchema: z.ZodObject<{
  deviceName: z.ZodString;
  staticRoutes: z.ZodOptional<z.ZodArray<StaticRouteSchema>>;
  ospf: z.ZodOptional<OspfConfigSchema>;
  eigrp: z.ZodOptional<EigrpConfigSchema>;
  bgp: z.ZodOptional<BgpConfigSchema>;
}>;

const StaticRouteSchema: z.ZodObject<{
  network: z.ZodString;
  mask: z.ZodString;
  nextHop: z.ZodString;
  administrativeDistance: z.ZodOptional<z.ZodNumber>;
}>;

const OspfConfigSchema: z.ZodObject<{
  processId: z.ZodNumber;
  routerId: z.ZodOptional<z.ZodString>;
  areas: z.ZodArray<OspfAreaSchema>;
  passiveInterfaces: z.ZodOptional<z.ZodArray<z.ZodString>>;
}>;

// ACL schemas
const AclConfigSchema: z.ZodObject<{
  name: z.ZodString;
  type: z.ZodUnion<[z.ZodLiteral<"standard">, z.ZodLiteral<"extended">]>;
  rules: z.ZodArray<AclRuleSchema>;
  appliedOn: z.ZodOptional<z.ZodString>;
  direction: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"in">, z.ZodLiteral<"out">]>>;
}>;

const AclRuleSchema: z.ZodObject<{
  action: z.ZodUnion<[z.ZodLiteral<"permit">, z.ZodLiteral<"deny">]>;
  source: z.ZodString;
  protocol: z.ZodOptional<z.ZodString>;
  sourceWildcard: z.ZodOptional<z.ZodString>;
  destination: z.ZodOptional<z.ZodString>;
  destinationWildcard: z.ZodOptional<z.ZodString>;
  destinationPort: z.ZodOptional<z.ZodString>;
}>;

// DHCP schemas
const DhcpPoolSchema: z.ZodObject<{
  name: z.ZodString;
  network: z.ZodString;
  mask: z.ZodString;
  defaultRouter: z.ZodOptional<z.ZodString>;
  dnsServers: z.ZodOptional<z.ZodArray<z.ZodString>>;
  domainName: z.ZodOptional<z.ZodString>;
  excludedAddresses: z.ZodOptional<z.ZodArray<z.ZodString>>;
  lease: z.ZodOptional<z.ZodNumber>;
}>;

const DhcpConfigSchema: z.ZodObject<{
  deviceName: z.ZodString;
  dhcp: z.ZodOptional<z.ZodArray<DhcpPoolSchema>>;
}>;
```

### Types

```typescript
// Device types
interface DeviceConfig {
  name: string;
  model: string;
  type: DeviceType;
  position?: { x: number; y: number };
  interfaces?: InterfaceConfig[];
  vlans?: VlanConfig[];
}

interface InterfaceConfig {
  name: string;
  ipAddress?: string;
  subnetMask?: string;
  description?: string;
  shutdown?: boolean;
  switchportMode?: "access" | "trunk";
  accessVlan?: number;
  trunkVlans?: number[];
}

// Network types
interface NetworkTopology {
  devices: DeviceConfig[];
  links: LinkConfig[];
  zones?: ZoneConfig[];
}

interface LinkConfig {
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
  type?: CableType;
}

// IOS types
interface IosCommand {
  command: string;
  description?: string;
  mode?: IosMode;
  requiresPrivilege?: boolean;
}

interface IosConfigLine {
  line: string;
  mode: IosMode;
}
```

### Command Catalog

```typescript
// Catálogo de comandos IOS
const COMMAND_CATALOG: Record<string, IosCommandCategory>;

interface IosCommandCategory {
  name: string;
  commands: IosCommand[];
}

interface IosCommand {
  command: string;
  syntax: string;
  description: string;
  modes: IosMode[];
  privilege: "user" | "priv" | "config";
  example?: string;
}

// Categorías pre-definidas
const COMMAND_CATALOG = {
  vlan: {
    name: "VLAN Management",
    commands: [
      {
        command: "vlan",
        syntax: "vlan <vlan-id>",
        description: "Create VLAN",
        modes: ["config"],
        privilege: "config",
      },
      {
        command: "name",
        syntax: "name <vlan-name>",
        description: "Set VLAN name",
        modes: ["config-vlan"],
        privilege: "config",
      },
    ],
  },
  interface: {
    name: "Interface Configuration",
    commands: [
      {
        command: "interface",
        syntax: "interface <interface>",
        description: "Enter interface config",
        modes: ["config"],
        privilege: "config",
      },
      {
        command: "ip address",
        syntax: "ip address <ip> <mask>",
        description: "Set IP address",
        modes: ["config-if"],
        privilege: "config",
      },
    ],
  },
  // ... más categorías
};
```

### PT API Types

```typescript
// Tipos para la API de Packet Tracer
export interface PTDeviceConfig {
  name: string;
  model: string;
  typeId: number;
  x?: number;
  y?: number;
}

export interface PTLinkConfig {
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  cableType: number;
}

export interface PTCommandOptions {
  timeoutMs?: number;
  stopOnError?: boolean;
  expectMode?: string;
}

export interface PTCommandResult {
  ok: boolean;
  output: string;
  status: number;
  mode: string;
  paging: boolean;
}
```

---

## Uso de Schemas

```typescript
import {
  DeviceSchema,
  VlanConfigSchema,
  RoutingConfigSchema,
  type DeviceConfig,
} from "@cisco-auto/types";

// Validar configuración de dispositivo
const result = DeviceSchema.safeParse(deviceConfig);
if (!result.success) {
  console.error("Validation errors:", result.error.issues);
}

// Validar configuración de VLAN
const vlanResult = VlanConfigSchema.safeParse({
  switchName: "Switch1",
  vlans: [{ id: 10, name: "ADMIN" }],
});

if (vlanResult.success) {
  const config = vlanResult.data;
  // usar config
}
```

---

## Exportaciones del Paquete

```typescript
// Main
export * from "./schemas/index.js";
export * from "./types/index.js";
export * from "./command-catalog.js";
export * from "./pt-api/index.js";
```
