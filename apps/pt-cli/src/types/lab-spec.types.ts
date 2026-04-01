/**
 * Tipos compartidos para conversión de YAML parsed a LabSpec
 * Evita duplicación y uso de `any` en múltiples comandos
 */

import type { LabSpec } from '@cisco-auto/core';

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

/**
 * Convierte un YAML parsed a LabSpec de forma tipada
 * @param parsed - Objeto YAML parsed
 * @returns LabSpec tipado
 */
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
      type: d.type ?? 'unknown',
      hostname: d.hostname ?? d.name ?? '',
      managementIp: d.management?.ip,
      interfaces: (d.interfaces || []).map((i) => ({
        id: i.name ?? '',
        name: i.name ?? '',
        description: i.description,
        ipAddress: i.ip,
        shutdown: i.shutdown,
        switchport: i.mode ? { mode: i.mode, accessVlan: i.vlan } : undefined,
      })),
      security: d.security,
      vlans: d.vlans,
      routing: d.routing,
      services: d.services,
    })),
    connections: (parsed.lab?.topology?.connections || []).map((c) => {
      const fromDevice = typeof c.from === 'string' ? c.from : c.from?.device ?? '';
      const fromPort = typeof c.from === 'string' ? c.fromInterface ?? 'unknown' : c.from?.port ?? c.fromInterface ?? 'unknown';
      const toDevice = typeof c.to === 'string' ? c.to : c.to?.device ?? '';
      const toPort = typeof c.to === 'string' ? c.toInterface ?? 'unknown' : c.to?.port ?? c.toInterface ?? 'unknown';

      return {
        id: `${fromDevice}-${toDevice}`,
        from: { deviceName: fromDevice, portName: fromPort },
        to: { deviceName: toDevice, portName: toPort },
        cableType: c.cable ?? c.type ?? 'ethernet',
      };
    }),
  };
}
