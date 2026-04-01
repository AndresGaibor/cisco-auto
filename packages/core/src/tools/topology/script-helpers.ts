/**
 * GENERATE SCRIPT HELPERS
 * 
 * Funciones helper para la generación de scripts de topología
 */

import type {
  TopologyPlan,
  DevicePlan,
  DHCPPlan,
  VLANPlan,
  RoutingPlan,
} from '../..';
import type {
  DHCPServerSpec,
  STPSpec,
  EtherChannelSpec,
  IPv6Spec,
} from '../..';

export class ScriptHelpers {
  static appendSection(target: string[], section: string[]): void {
    if (section.length === 0) return;
    if (target.length > 0) target.push('');
    target.push(...section);
  }

  static maskToCidr(mask: string): number {
    const octets = mask.split('.').map(octet => parseInt(octet, 10));
    let bits = 0;
    for (const octet of octets) {
      const binary = octet.toString(2).padStart(8, '0');
      bits += binary.split('').filter(b => b === '1').length;
    }
    return bits;
  }

  static mapDhcpPlanToSpec(pool: DHCPPlan): DHCPServerSpec {
    return {
      poolName: pool.poolName,
      network: pool.network,
      subnetMask: pool.subnetMask,
      defaultRouter: pool.defaultRouter,
      dnsServers: pool.dnsServer ? [pool.dnsServer] : undefined,
      excludedAddresses: pool.exclude,
    };
  }

  static mapVlanPlanToSpec(vlan: VLANPlan) {
    return {
      id: vlan.id,
      name: vlan.name,
    };
  }

  static isValidDevicePlanForJavaScript(device: DevicePlan): boolean {
    return !!(device.name && device.position);
  }

  static isValidLinkForJavaScript(from: string, to: string): boolean {
    return from !== '' && to !== '';
  }

  static escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  static sanitizeDeviceName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  static formatCommandList(commands: string[]): string {
    return commands.map(cmd => `  '${this.escapeString(cmd)}'`).join(',\n');
  }

  static getDeviceTypeForScript(deviceType: string): string {
    const mapping: Record<string, string> = {
      'router': 'Router',
      'switch': 'Switch',
      'multilayer-switch': 'Switch-L3',
      'pc': 'PC',
      'server': 'Server',
    };
    return mapping[deviceType] || 'Device';
  }

  static calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static normalizeInterfaceName(iface: string): string {
    return iface
      .toLowerCase()
      .replace(/fastethernet/g, 'fe')
      .replace(/gigabitethernet/g, 'gi')
      .replace(/ethernet/g, 'eth');
  }

  static validateCableType(cableType: string): boolean {
    const validTypes = ['straight-through', 'crossover', 'fiber', 'serial', 'console', 'auto'];
    return validTypes.includes(cableType);
  }

  static getCableTypeForJavaScript(cableType: string): string {
    const mapping: Record<string, string> = {
      'straight-through': 'StraightThrough',
      'crossover': 'Crossover',
      'fiber': 'Fiber',
      'serial': 'Serial',
      'console': 'Console',
      'auto': 'Auto',
    };
    return mapping[cableType] || 'Auto';
  }
}
