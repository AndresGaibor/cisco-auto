#!/usr/bin/env bun
/**
 * Helpers para parsear flags repeatables de la CLI.
 * Soporta flags como --network, --passive-interface, --neighbor, etc.
 */

import { VlanConfigSchema, type VlanConfig } from '@cisco-auto/kernel/domain/ios/schemas';
import { VlanId, parseVlanName } from '@cisco-auto/kernel/domain/ios/value-objects';

/**
 * Parsea un flag repeatable con formato key=value.
 * Ejemplo: --network "192.168.1.0,0.0.0.255,0" --network "10.0.0.0,0.0.0.3,1"
 *
 * @param values - Array de strings del flag repeatable
 * @param separator - Separador dentro de cada valor (default: comma)
 * @returns Array de arrays con los valores parseados
 */
export function parseRepeatableFlag(
  values: string[] | undefined,
  separator: string = ','
): string[][] {
  if (!values || values.length === 0) return [];

  return values.map((value) =>
    value
      .split(separator)
      .map((part) => part.trim())
      .filter(Boolean)
  );
}

/**
 * Parsea un flag repeatable simple (un valor por flag).
 * Ejemplo: --passive-interface Gig0/0 --passive-interface Gig0/1
 *
 * @param values - Array de strings del flag repeatable
 * @returns Array de valores
 */
export function parseRepeatableSimple(
  values: string[] | undefined
): string[] {
  if (!values || values.length === 0) return [];
  return values.map((v) => v.trim()).filter(Boolean);
}

/**
 * Parsea y valida un VLAN ID de forma estricta.
 */
export function parseStrictVlanId(value: string): VlanId {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`VLAN ID inválido: "${value}"`);
  }

  return VlanId.from(Number(trimmed));
}

/**
 * Parsea redes OSPF/EIGRP con formato "network,wildcard,area".
 * @param values - Array de strings con formato "ip,wildcard,area"
 * @returns Array de objetos { network, wildcard, area }
 */
export function parseNetworks(
  values: string[] | undefined
): Array<{ network: string; wildcard: string; area: string | number }> {
  if (!values || values.length === 0) return [];

  return values.map((value) => {
    const parts = value.split(',').map((p) => p.trim());
    if (parts.length < 2) {
      throw new Error(
        `Formato de red inválido: "${value}". Esperado: "network,wildcard[,area]"`
      );
    }

    return {
      network: parts[0]!,
      wildcard: parts[1]!,
      area: parts[2] ? (isNaN(Number(parts[2])) ? parts[2] : Number(parts[2])) : 0,
    };
  });
}

/**
 * Parsea neighbors BGP con formato "ip,remote-as[,description]".
 * @param values - Array de strings con formato "ip,remote-as[,description]"
 * @returns Array de objetos { ip, remoteAs, description? }
 */
export function parseBgpNeighbors(
  values: string[] | undefined
): Array<{ ip: string; remoteAs: string | number; description?: string }> {
  if (!values || values.length === 0) return [];

  return values.map((value) => {
    const parts = value.split(',').map((p) => p.trim());
    if (parts.length < 2) {
      throw new Error(
        `Formato de neighbor inválido: "${value}". Esperado: "ip,remote-as[,description]"`
      );
    }

    const remoteAs = isNaN(Number(parts[1])) ? parts[1] : Number(parts[1]);

    return {
      ip: parts[0]!,
      remoteAs,
      description: parts[2] || undefined,
    };
  });
}

/**
 * Parsea reglas ACL con formato "action,protocol,source[,source-wildcard][,dest][,dest-wildcard]".
 * @param values - Array de strings con formato de regla ACL
 * @returns Array de objetos con campos de regla ACL
 */
export function parseAclRules(
  values: string[] | undefined
): Array<{
  action: 'permit' | 'deny';
  protocol: string;
  source: string;
  sourceWildcard?: string;
  destination?: string;
  destinationWildcard?: string;
  log?: boolean;
}> {
  if (!values || values.length === 0) return [];

  return values.map((value) => {
    const parts = value.split(',').map((p) => p.trim());
    if (parts.length < 3) {
      throw new Error(
        `Formato de regla ACL inválido: "${value}". Esperado: "action,protocol,source[,wildcard][,dest][,dest-wildcard]"`
      );
    }

    const action = parts[0]!.toLowerCase() as 'permit' | 'deny';
    if (action !== 'permit' && action !== 'deny') {
      throw new Error(`Acción ACL inválida: "${parts[0]}". Debe ser "permit" o "deny"`);
    }

    return {
      action,
      protocol: parts[1]!,
      source: parts[2]!,
      sourceWildcard: parts[3] || undefined,
      destination: parts[4] || undefined,
      destinationWildcard: parts[5] || undefined,
      log: parts[6]?.toLowerCase() === 'log' || undefined,
    };
  });
}

/**
 * Parsea VLANs con formato "id,name" o "id,name,state".
 * @param values - Array de strings con formato VLAN
 * @returns Array de objetos { id, name, state? }
 */
export function parseVlans(
  values: string[] | undefined
): VlanConfig[] {
  if (!values || values.length === 0) return [];

  return values.map((value) => {
    const parts = value.split(',').map((p) => p.trim());
    if (parts.length < 2) {
      throw new Error(
        `Formato de VLAN inválido: "${value}". Esperado: "id,name[,state]"`
      );
    }

    try {
      const parsed = VlanConfigSchema.parse({
        id: String(parseStrictVlanId(parts[0]!).value),
        name: parseVlanName(parts[1]!).value,
        state: parts[2] || undefined,
      });

      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Error de validación de VLAN: ${message}`);
    }
  });
}

/**
 * Genera comandos IOS desde un array de strings.
 * @param commands - Array de comandos IOS
 * @param device - Nombre del dispositivo
 * @returns Objeto con comandos y rollback
 */
export function generateIosCommands(
  commands: string[],
  _device: string
): { commands: string[]; rollback: string[] } {
  const rollback: string[] = [];

  for (const cmd of commands) {
    const lower = cmd.toLowerCase().trim();

    // Generar rollback para comandos comunes
    if (lower.startsWith('ip address ')) {
      rollback.push('no ip address');
    } else if (lower.startsWith('ip route ')) {
      rollback.push(`no ${cmd}`);
    } else if (lower.startsWith('router ospf ') || lower.startsWith('router eigrp ') || lower.startsWith('router bgp ')) {
      rollback.push(`no ${cmd}`);
    } else if (lower.startsWith('network ')) {
      rollback.push(`no ${cmd}`);
    } else if (lower.startsWith('neighbor ')) {
      rollback.push(`no ${cmd}`);
    } else if (lower.startsWith('vlan ')) {
      const vlanId = cmd.split(/\s+/)[1];
      rollback.push(`no vlan ${vlanId}`);
    } else if (lower.startsWith('name ')) {
      rollback.push('no name');
    } else if (lower.startsWith('access-list ')) {
      rollback.push(`no ${cmd}`);
    } else if (lower.startsWith('ip access-list ')) {
      const parts = cmd.split(/\s+/);
      rollback.push(`no ip access-list ${parts[2]} ${parts[3]}`);
    } else if (lower.startsWith('description ')) {
      rollback.push('no description');
    } else if (lower.startsWith('shutdown')) {
      rollback.push('no shutdown');
    } else if (lower.startsWith('passive-interface ')) {
      rollback.push(`no ${cmd}`);
    }
  }

  return { commands, rollback };
}
