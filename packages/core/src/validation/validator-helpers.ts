/**
 * DEVICE SPEC VALIDATOR - HELPERS
 * 
 * Funciones helper para validación
 */

import type { DeviceSpec } from '../canonical/device.spec';
import { switchCatalog, routerCatalog } from '../catalog/index.js';

export class ValidatorHelpers {
  static isValidInterfaceName(name: string): boolean {
    const iface = name.toLowerCase();
    const validPrefixes = [
      'fa', 'fastethernet', 'fe',
      'gi', 'gigabitethernet',
      'eth', 'ethernet',
      's', 'se', 'serial',
      'po', 'port-channel',
      'lo', 'loopback',
    ];
    
    for (const prefix of validPrefixes) {
      if (iface.startsWith(prefix)) {
        const rest = iface.substring(prefix.length);
        if (rest === '' || /^[\d/]+$/.test(rest)) return true;
      }
    }
    return false;
  }

  static interfaceExistsOnDevice(device: DeviceSpec, interfaceName: string): boolean {
    return (device.interfaces || []).some(i => 
      i.name.toLowerCase() === interfaceName.toLowerCase()
    );
  }

  static getAllDevicePorts(device: DeviceSpec): Array<{ prefix: string; module: number; range: [number, number] }> {
    const ports: Array<{ prefix: string; module: number; range: [number, number] }> = [];
    
    const modelStr = device.model?.model || '';
    const catalog = (modelStr.includes('Router') || modelStr === 'Cisco2821') 
      ? routerCatalog 
      : switchCatalog;
    
    const model = catalog.find(m => m.model === device.model?.model);
    if (!model) return ports;
    
    const ifaces = model.fixedPorts;
    
    if (Array.isArray(ifaces)) {
      for (const iface of ifaces) {
        if (iface.prefix && typeof iface.prefix === 'string') {
          ports.push({ 
            prefix: iface.prefix, 
            module: iface.module, 
            range: iface.range 
          });
        }
      }
    }
    
    return ports;
  }

  static getMaxVlansForDevice(device: DeviceSpec): number {
    const modelStr = device.model?.model || '';
    const catalog = (modelStr.includes('Router') || modelStr === 'Cisco2821') 
      ? routerCatalog 
      : switchCatalog;
    
    const model = catalog.find(m => m.model === device.model?.model);
    return model?.capabilities?.maxVlans ?? 4096;
  }

  static isValidIP(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255 && part === String(num);
    });
  }

  static isValidSubnetMask(mask: string): boolean {
    if (!this.isValidIP(mask)) return false;
    const parts = mask.split('.').map(p => parseInt(p, 10));
    const binary = parts.map(p => p.toString(2).padStart(8, '0')).join('');
    const matches = binary.match(/^1*0*$/);
    return !!matches;
  }

  static isValidVlanId(id: number): boolean {
    return id >= 1 && id <= 4094;
  }

  static calculateNetworkAddress(ip: string, mask: string): string {
    const ipParts = ip.split('.').map(p => parseInt(p, 10));
    const maskParts = mask.split('.').map(p => parseInt(p, 10));
    return ipParts.map((p, i) => p & (maskParts[i] ?? 0)).join('.');
  }

  static ipInRange(ip: string, networkCidr: string): boolean {
    const [network, prefixStr] = networkCidr.split('/');
    if (!network || !prefixStr) return false;
    
    const prefix = parseInt(prefixStr, 10);
    const mask = (0xffffffff << (32 - prefix)) >>> 0;
    
    const ipParts = ip.split('.').map(p => parseInt(p, 10));
    const netParts = network.split('.').map(p => parseInt(p, 10));
    
    const ipInt = ((ipParts[0]! << 24) | (ipParts[1]! << 16) | (ipParts[2]! << 8) | ipParts[3]!) >>> 0;
    const netInt = ((netParts[0]! << 24) | (netParts[1]! << 16) | (netParts[2]! << 8) | netParts[3]!) >>> 0;
    
    return (ipInt & mask) === (netInt & mask);
  }
}
