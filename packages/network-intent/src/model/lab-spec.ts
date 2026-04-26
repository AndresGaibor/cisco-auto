import { z } from "zod";

export type DeviceType = "router" | "switch" | "pc" | "server" | "firewall" | "ids" | "voip";
export type SwitchportMode = "access" | "trunk" | "dynamic";
export type CableType = "straight-through" | "crossover" | "rollover";

export interface LabMetadata {
  name: string;
  version: string;
  author: string;
  createdAt: Date;
}

export interface DeviceInterface {
  name: string;
  description?: string;
  ip?: string;
  subnetMask?: string;
  shutdown?: boolean;
  switchportMode?: SwitchportMode;
  vlan?: { brandedValue: string };
}

export interface ConnectionEndpoint {
  deviceId: string;
  deviceName: string;
  port: string;
}

export interface LabConnection {
  id: string;
  from: ConnectionEndpoint;
  to: ConnectionEndpoint;
  cableType?: CableType;
  fromDevice?: string;
  fromPort?: string;
  toDevice?: string;
  toPort?: string;
}

export interface LabDevice {
  id: string;
  name: string;
  type: DeviceType;
  hostname: string;
  managementIp?: string;
  interfaces?: DeviceInterface[];
  security?: unknown;
  vlans?: unknown;
  routing?: unknown;
  services?: unknown;
  model?: string;
  role?: string;
  x?: number;
  y?: number;
  supported?: string;
  notes?: string[];
}

export interface LabSpec {
  metadata: LabMetadata;
  devices: LabDevice[];
  connections: LabConnection[];
}

export interface ParsedDevice {
  name?: string;
  type?: string;
  model?: string;
  hostname?: string;
  management?: { ip?: string };
  interfaces?: Array<{
    name?: string;
    ip?: string;
    subnetMask?: string;
    description?: string;
    shutdown?: boolean;
    mode?: string;
    vlan?: number;
    [key: string]: unknown;
  }>;
  security?: unknown;
  vlans?: unknown;
  routing?: unknown;
  services?: unknown;
  [key: string]: unknown;
}

export interface ParsedConnection {
  from?: string | { device?: string; port?: string };
  to?: string | { device?: string; port?: string };
  fromInterface?: string;
  toInterface?: string;
  cable?: string;
  type?: string;
  [key: string]: unknown;
}

export interface ParsedLabYaml {
  name?: string;
  devices?: ParsedDevice[];
  links?: ParsedConnection[];
  metadata?: { name?: string; version?: string; author?: string };
  topology?: {
    devices?: ParsedDevice[];
    connections?: ParsedConnection[];
  };
  lab?: {
    metadata?: { name?: string; version?: string; author?: string };
    topology?: {
      devices?: ParsedDevice[];
      connections?: ParsedConnection[];
    };
  };
}

export interface LabValidationResult {
  success: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface TopologyStats {
  deviceCount: number;
  connectionCount: number;
  density: number;
  connectedComponents: number;
  avgConnections: number;
  deviceTypeDistribution: Record<string, number>;
}

export const DeviceTypeSchema = z.enum(["router", "switch", "pc", "server", "firewall", "ids", "voip"]);
export const SwitchportModeSchema = z.enum(["access", "trunk", "dynamic"]);
export const CableTypeSchema = z.enum(["straight-through", "crossover", "rollover"]);

export const DeviceInterfaceSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  ip: z.string().optional(),
  subnetMask: z.string().optional(),
  shutdown: z.boolean().optional(),
  switchportMode: SwitchportModeSchema.optional(),
  vlan: z.object({ brandedValue: z.string() }).optional(),
});

export const ConnectionEndpointSchema = z.object({
  deviceId: z.string(),
  deviceName: z.string(),
  port: z.string(),
});

export const LabConnectionSchema = z.object({
  id: z.string(),
  from: ConnectionEndpointSchema,
  to: ConnectionEndpointSchema,
  cableType: CableTypeSchema.optional(),
  fromDevice: z.string().optional(),
  fromPort: z.string().optional(),
  toDevice: z.string().optional(),
  toPort: z.string().optional(),
});

export const LabDeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: DeviceTypeSchema,
  hostname: z.string(),
  managementIp: z.string().optional(),
  interfaces: z.array(DeviceInterfaceSchema).optional(),
  security: z.unknown().optional(),
  vlans: z.unknown().optional(),
  routing: z.unknown().optional(),
  services: z.unknown().optional(),
  model: z.string().optional(),
  role: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  supported: z.string().optional(),
  notes: z.array(z.string()).optional(),
});

export const LabSpecSchema = z.object({
  metadata: z.object({
    name: z.string(),
    version: z.string(),
    author: z.string(),
    createdAt: z.instanceof(Date),
  }),
  devices: z.array(LabDeviceSchema),
  connections: z.array(LabConnectionSchema),
});

export function toDeviceType(type?: string): DeviceType {
  if (!type) return "router";
  const lower = type.toLowerCase();
  if (["router", "switch", "pc", "server", "firewall", "ids", "voip"].includes(lower)) {
    return lower as DeviceType;
  }
  return "router";
}

export function toSwitchportMode(mode?: string): SwitchportMode | undefined {
  if (!mode) return undefined;
  const lower = mode.toLowerCase();
  if (["access", "trunk", "dynamic"].includes(lower)) {
    return lower as SwitchportMode;
  }
  return undefined;
}

export function toCableType(cable?: string): CableType {
  if (!cable) return "straight-through";
  const lower = cable.toLowerCase();
  if (["straight-through", "crossover", "rollover"].includes(lower)) {
    return lower as CableType;
  }
  return "straight-through";
}

export function toLabSpec(parsed: ParsedLabYaml): LabSpec {
  const metadata = parsed.lab?.metadata || parsed.metadata || {};
  const name = metadata.name || parsed.name || "Lab";

  const devices =
    parsed.lab?.topology?.devices || parsed.topology?.devices || parsed.devices || [];

  const connections =
    parsed.lab?.topology?.connections ||
    parsed.topology?.connections ||
    parsed.links ||
    [];

  return {
    metadata: {
      name,
      version: metadata.version ?? "1.0",
      author: metadata.author ?? "unknown",
      createdAt: new Date(),
    },
    devices: devices.map((d) => ({
      id: d.name ?? "",
      name: d.name ?? "",
      type: toDeviceType(d.type),
      hostname: d.hostname ?? d.name ?? "",
      managementIp: d.management?.ip,
      interfaces: (d.interfaces || []).map((i) => ({
        name: i.name ?? "",
        description: i.description,
        ip: i.ip,
        subnetMask: i.subnetMask,
        shutdown: i.shutdown,
        switchportMode: toSwitchportMode(i.mode),
        vlan: i.vlan ? { brandedValue: i.vlan.toString() } as any : undefined,
      })),
      security: d.security,
      vlans: d.vlans,
      routing: d.routing,
      services: d.services,
    })),
    connections: connections.map((c) => {
      const fromDevice = typeof c.from === "string" ? c.from : c.from?.device ?? "";
      const fromPort =
        typeof c.from === "string"
          ? c.fromInterface ?? "unknown"
          : c.from?.port ?? c.fromInterface ?? "unknown";
      const toDevice = typeof c.to === "string" ? c.to : c.to?.device ?? "";
      const toPort =
        typeof c.to === "string"
          ? c.toInterface ?? "unknown"
          : c.to?.port ?? c.toInterface ?? "unknown";

      return {
        id: `${fromDevice}-${toDevice}`,
        from: { deviceId: "", deviceName: fromDevice, port: fromPort },
        to: { deviceId: "", deviceName: toDevice, port: toPort },
        cableType: toCableType(c.cable ?? (c.type as string)),
      };
    }),
  };
}

export function validateLabSafe(parsed: ParsedLabYaml): LabValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const devices =
    parsed.lab?.topology?.devices || parsed.topology?.devices || parsed.devices || [];

  const connections =
    parsed.lab?.topology?.connections ||
    parsed.topology?.connections ||
    parsed.links ||
    [];

  if (devices.length === 0) {
    errors.push("No hay dispositivos definidos");
  }

  const deviceNames = new Set<string>();
  for (const device of devices) {
    if (!device.name) {
      errors.push("Dispositivo sin nombre");
    } else {
      if (deviceNames.has(device.name)) {
        errors.push(`Dispositivo duplicado: ${device.name}`);
      }
      deviceNames.add(device.name);
    }
  }

  for (const conn of connections) {
    const fromDevice = typeof conn.from === "string" ? conn.from : conn.from?.device;
    const toDevice = typeof conn.to === "string" ? conn.to : conn.to?.device;

    if (!fromDevice) {
      errors.push("Conexión sin dispositivo origen");
    } else if (!deviceNames.has(fromDevice)) {
      errors.push(`Dispositivo origen no existe: ${fromDevice}`);
    }

    if (!toDevice) {
      errors.push("Conexión sin dispositivo destino");
    } else if (!deviceNames.has(toDevice)) {
      errors.push(`Dispositivo destino no existe: ${toDevice}`);
    }
  }

  if (devices.length > 0 && connections.length === 0) {
    warnings.push("Hay dispositivos pero no hay conexiones definidas");
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function analyzeTopology(spec: LabSpec): TopologyStats {
  const deviceCount = spec.devices.length;
  const connectionCount = spec.connections.length;

  const maxConnections = deviceCount > 1 ? (deviceCount * (deviceCount - 1)) / 2 : 1;
  const density = connectionCount / maxConnections;

  const deviceConnections = new Map<string, number>();
  for (const device of spec.devices) {
    deviceConnections.set(device.id, 0);
  }
  for (const conn of spec.connections) {
    const fromName = conn.from.deviceName;
    const toName = conn.to.deviceName;
    deviceConnections.set(fromName, (deviceConnections.get(fromName) || 0) + 1);
    deviceConnections.set(toName, (deviceConnections.get(toName) || 0) + 1);
  }

  const avgConnections =
    deviceCount > 0
      ? Array.from(deviceConnections.values()).reduce((a, b) => a + b, 0) / deviceCount
      : 0;

  const distribution: Record<string, number> = {};
  for (const device of spec.devices) {
    distribution[device.type] = (distribution[device.type] || 0) + 1;
  }

  const adjacency = new Map<string, Set<string>>();
  for (const device of spec.devices) {
    adjacency.set(device.id, new Set());
  }
  for (const conn of spec.connections) {
    const from = conn.from.deviceName;
    const to = conn.to.deviceName;
    adjacency.get(from)?.add(to);
    adjacency.get(to)?.add(from);
  }

  const visited = new Set<string>();
  let connectedComponents = 0;
  for (const deviceId of adjacency.keys()) {
    if (!visited.has(deviceId)) {
      connectedComponents++;
      const queue = [deviceId];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        for (const neighbor of adjacency.get(current) || []) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }
    }
  }

  return {
    deviceCount,
    connectionCount,
    density,
    connectedComponents,
    avgConnections,
    deviceTypeDistribution: distribution,
  };
}

export function generateMermaidDiagram(spec: LabSpec): string {
  const lines: string[] = ["graph TD"];

  for (const device of spec.devices) {
    const shape =
      device.type === "switch"
        ? "[{{" + device.name + "}}]"
        : device.type === "pc"
          ? "[(" + device.name + ")]"
          : "[" + device.name + "]";
    lines.push(`  ${device.id}${shape}`);
  }

  for (const conn of spec.connections) {
    lines.push(
      `  ${conn.from.deviceName} -->|${conn.from.port} - ${conn.to.port}| ${conn.to.deviceName}`
    );
  }

  return lines.join("\n");
}

export function visualizeTopology(
  spec: LabSpec,
  _options?: { showIPs?: boolean; showPorts?: boolean }
): string {
  const lines: string[] = [];
  lines.push("\n📋 Topología del Laboratorio: " + spec.metadata.name);
  lines.push("━".repeat(60));

  lines.push("\n🖥️  Dispositivos:");
  for (const device of spec.devices) {
    const mgmt = device.managementIp ? ` (${device.managementIp})` : "";
    lines.push(`  • ${device.name} [${device.type}]${mgmt}`);
    if (device.interfaces && device.interfaces.length > 0) {
      for (const iface of device.interfaces) {
        const ip = iface.ip ? ` ${iface.ip}/${iface.subnetMask}` : "";
        lines.push(`    - ${iface.name}${ip}`);
      }
    }
  }

  lines.push("\n🔗 Conexiones:");
  for (const conn of spec.connections) {
    lines.push(
      `  • ${conn.from.deviceName}:${conn.from.port} <-> ${conn.to.deviceName}:${conn.to.port}`
    );
  }

  return lines.join("\n");
}
