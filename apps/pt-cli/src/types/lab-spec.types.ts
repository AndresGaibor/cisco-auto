import type { LabSpec, SwitchportMode, CableType, DeviceType } from '@cisco-auto/core';

/**
 * Convierte string a DeviceType válido
 */
function toDeviceType(type?: string): DeviceType {
  if (!type) return 'router';
  const lower = type.toLowerCase();
  if (['router', 'switch', 'pc', 'server', 'firewall', 'ids', 'voip'].includes(lower)) {
    return lower as DeviceType;
  }
  return 'router';
}

/**
 * Convierte string a SwitchportMode válido
 */
function toSwitchportMode(mode?: string): SwitchportMode | undefined {
  if (!mode) return undefined;
  const lower = mode.toLowerCase();
  if (['access', 'trunk', 'dynamic'].includes(lower)) {
    return lower as SwitchportMode;
  }
  return undefined;
}

/**
 * Convierte string a CableType válido
 */
function toCableType(cable?: string): CableType {
  if (!cable) return 'straight-through' as CableType;
  const lower = cable.toLowerCase();
  if (['straight-through', 'crossover', 'rollover'].includes(lower)) {
    return lower as CableType;
  }
  return 'straight-through' as CableType;
}

/**
 * Estructura mínima de un archivo YAML de laboratorio parsed
 */
export interface ParsedLabYaml {
  lab?: {
    metadata?: {
      name?: string;
      version?: string;
      author?: string;
    };
    topology?: {
      devices?: Array<ParsedDevice>;
      connections?: Array<ParsedConnection>;
    };
  };
}

/**
 * Dispositivo en formato YAML parsed
 */
export interface ParsedDevice {
  name?: string;
  type?: string;
  model?: string;
  hostname?: string;
  management?: {
    ip?: string;
  };
  interfaces?: Array<ParsedInterface>;
  security?: unknown;
  vlans?: unknown;
  routing?: unknown;
  services?: unknown;
  [key: string]: unknown;
}

/**
 * Interfaz en formato YAML parsed
 */
export interface ParsedInterface {
  name?: string;
  ip?: string;
  subnetMask?: string;
  description?: string;
  shutdown?: boolean;
  mode?: string;
  vlan?: number;
  [key: string]: unknown;
}

/**
 * Conexión en formato YAML parsed
 */
export interface ParsedConnection {
  from?: string | { device?: string; port?: string };
  to?: string | { device?: string; port?: string };
  fromInterface?: string;
  toInterface?: string;
  cable?: string;
  type?: string;
  [key: string]: unknown;
}

export function toLabSpec(parsed: ParsedLabYaml): LabSpec {
  return {
    metadata: {
      name: parsed.lab?.metadata?.name ?? 'Lab',
      version: parsed.lab?.metadata?.version ?? '1.0',
      author: parsed.lab?.metadata?.author ?? 'unknown',
      createdAt: new Date(),
    },
    devices: (parsed.lab?.topology?.devices || []).map((d) => ({
      id: d.name ?? '',
      name: d.name ?? '',
      type: toDeviceType(d.type),
      hostname: d.hostname ?? d.name ?? '',
      managementIp: d.management?.ip,
      interfaces: (d.interfaces || []).map((i) => ({
        name: i.name ?? '',
        description: i.description,
        ip: i.ip,
        subnetMask: i.subnetMask,
        shutdown: i.shutdown,
        switchportMode: toSwitchportMode(i.mode),
        vlan: i.vlan ? { brandedValue: i.vlan.toString() } as any : undefined, // TODO: Use proper VlanId
      })),
      security: d.security,
      vlans: d.vlans,
      routing: d.routing,
      services: d.services,
    } as any)),
    connections: (parsed.lab?.topology?.connections || []).map((c) => {
      const fromDevice = typeof c.from === 'string' ? c.from : c.from?.device ?? '';
      const fromPort = typeof c.from === 'string' ? c.fromInterface ?? 'unknown' : c.from?.port ?? c.fromInterface ?? 'unknown';
      const toDevice = typeof c.to === 'string' ? c.to : c.to?.device ?? '';
      const toPort = typeof c.to === 'string' ? c.toInterface ?? 'unknown' : c.to?.port ?? c.toInterface ?? 'unknown';

      return {
        id: `${fromDevice}-${toDevice}`,
        from: { deviceId: '', deviceName: fromDevice, port: fromPort },
        to: { deviceId: '', deviceName: toDevice, port: toPort },
        cableType: toCableType(c.cable ?? c.type as string),
      };
    }),
  };
}
