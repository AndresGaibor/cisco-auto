/**
 * IOS Routing Builders
 *
 * Pure functions that build IOS routing commands.
 * These contain no side effects, no PT API calls, and no CLI logic.
 */

import type { RoutingConfigInput } from '@cisco-auto/kernel/plugins/routing';
import { generateRoutingCommands } from '@cisco-auto/kernel/plugins/routing';

const IPV4_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const CIDR_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\/(?:[0-9]|[12]\d|3[0-2])$/;

export function validarIPv4(valor: string): boolean {
  return IPV4_REGEX.test(valor);
}

export function validarCIDR(valor: string): boolean {
  return CIDR_REGEX.test(valor);
}

export function parseEnteroObligatorio(valor: string, etiqueta: string): number {
  if (!/^\d+$/.test(valor.trim())) {
    throw new Error(`${etiqueta} debe ser un número entero válido`);
  }
  const numero = Number.parseInt(valor, 10);
  if (!Number.isInteger(numero) || numero < 0) {
    throw new Error(`${etiqueta} debe ser un número entero válido`);
  }
  return numero;
}

export function cidrToSubnetMask(cidr: string): string {
  if (cidr.includes('/')) {
    const bits = Number(cidr.split('/')[1]);
    if (Number.isNaN(bits) || bits < 0 || bits > 32) return '255.255.255.0';
    const mask = bits === 0 ? 0 : (~((1 << (32 - bits)) - 1) >>> 0);
    return `${(mask >>> 24) & 255}.${(mask >>> 16) & 255}.${(mask >>> 8) & 255}.${mask & 255}`;
  }
  return '255.255.255.0';
}

export function buildStaticRouteCommands(deviceName: string, network: string, nextHop: string): string[] {
  const mask = cidrToSubnetMask(network);
  const networkAddr = network.includes('/') ? (network.split('/')[0] ?? network) : network;
  const config: RoutingConfigInput = {
    deviceName,
    staticRoutes: [
      {
        network: networkAddr,
        mask,
        nextHop: nextHop === 'null0' ? 'null0' : nextHop,
      },
    ],
  };
  return generateRoutingCommands(config);
}

export function buildOspfEnableCommands(deviceName: string, processId: number): string[] {
  return [`router ospf ${processId}`, ' exit'];
}

function parseCidrToNetworkWildcard(cidr: string): [string, string] {
  const parts = cidr.split('/');
  const cidrBits = Number(parts[1]) || 24;
  const wildcardBits = 32 - cidrBits;
  const wildcardNum = (1 << wildcardBits) - 1;
  const octets = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    const shift = 8 * (3 - i);
    octets[i] = (wildcardNum >>> shift) & 255;
  }
  return [parts[0] ?? cidr, octets.join('.')];
}

export function buildOspfAddNetworkCommands(
  deviceName: string,
  processId: number,
  network: string,
  area: number | string,
): string[] {
  const [net, wildcard] = network.includes('/') ? parseCidrToNetworkWildcard(network) : [network, '0.0.0.255'];
  const config: RoutingConfigInput = {
    deviceName,
    ospf: {
      processId,
      areas: [{ areaId: area, networks: [{ network: net, wildcard }] }],
    },
  };
  return generateRoutingCommands(config);
}

export function buildEigrpEnableCommands(deviceName: string, asn: number): string[] {
  return [`router eigrp ${asn}`, ' no auto-summary', ' exit'];
}

export function buildBgpEnableCommands(deviceName: string, asn: number): string[] {
  return [`router bgp ${asn}`, ' bgp log-neighbor-changes', ' exit'];
}
