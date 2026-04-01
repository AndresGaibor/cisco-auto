/**
 * VIRTUAL TOPOLOGY - HELPERS
 * 
 * Funciones helper para operaciones de topología virtual
 */

import type { TopologySnapshot, DeviceState, LinkState } from "../contracts/index.js";

// Definir tipos locales alineados con @cisco-auto/types
type DeviceType = 
  | 'router' 
  | 'switch' 
  | 'switch_layer3' 
  | 'pc' 
  | 'server' 
  | 'wireless_router' 
  | 'access_point' 
  | 'cloud' 
  | 'multilayer_device' 
  | 'generic';

type CableType = 
  | 'straight' 
  | 'cross' 
  | 'roll' 
  | 'fiber' 
  | 'phone' 
  | 'cable' 
  | 'serial' 
  | 'auto' 
  | 'console' 
  | 'wireless' 
  | 'coaxial' 
  | 'octal' 
  | 'cellular' 
  | 'usb' 
  | 'custom_io';

export class VirtualTopologyHelpers {
  static normalizePortName(name: string): string {
    return name
      .toLowerCase()
      .replace('fastethernet', 'fa')
      .replace('gigabitethernet', 'gi')
      .replace('ethernet', 'eth');
  }

  static createLinkId(
    device1: string,
    port1: string,
    device2: string,
    port2: string
  ): string {
    const devices = [device1, device2].sort();
    const ports = [
      this.normalizePortName(port1),
      this.normalizePortName(port2),
    ];
    return `${devices[0]}-${ports[0]}__${devices[1]}-${ports[1]}`;
  }

  static inferDeviceType(model: string): DeviceType {
    const lowerModel = model.toLowerCase();

    if (lowerModel.includes('router')) return 'router';
    if (lowerModel.includes('switch') && !lowerModel.includes('multilayer') && !lowerModel.includes('layer3')) return 'switch';
    if (lowerModel.includes('multilayer') || lowerModel.includes('l3') || lowerModel.includes('layer3')) return 'switch_layer3';
    if (lowerModel.includes('pc') || lowerModel.includes('workstation')) return 'pc';
    if (lowerModel.includes('server')) return 'server';
    if (lowerModel.includes('wireless_router')) return 'wireless_router';
    if (lowerModel.includes('access_point') || lowerModel.includes('ap') || lowerModel.includes('access point')) return 'access_point';
    if (lowerModel.includes('cloud')) return 'cloud';
    if (lowerModel.includes('multilayer_device')) return 'multilayer_device';

    return 'generic';
  }

  static cableTypeFromNumber(num?: number): CableType {
    const mapping: Record<number, CableType> = {
      1: 'cross',
      2: 'straight',
      3: 'fiber',
      4: 'serial',
      5: 'console',
    };
    return mapping[num ?? 0] || 'straight';
  }

  static validateDeviceState(device: DeviceState): boolean {
    return !!(device.name && device.type);
  }

  static validateLinkState(link: LinkState): boolean {
    return !!(link.device1 && link.port1 && link.device2 && link.port2);
  }

  static cloneSnapshot(snapshot: TopologySnapshot): TopologySnapshot {
    return structuredClone(snapshot);
  }

  static mergeDeviceUpdates(
    current: DeviceState,
    updates: Partial<DeviceState>
  ): DeviceState {
    return { ...current, ...updates };
  }

  static getLinkKey(device1: string, device2: string): string {
    const devices = [device1, device2].sort();
    return `${devices[0]}<->${devices[1]}`;
  }

  static extractDeviceFromLink(linkId: string, index: 0 | 1 = 0): string {
    const parts = linkId.split('__');
    if (index === 0) {
      return parts[0].split('-')[0];
    }
    return parts[1].split('-')[0];
  }

  static countDevicesByType(
    snapshot: TopologySnapshot,
    type: DeviceType
  ): number {
    return Object.values(snapshot.devices).filter(d => d.type === type).length;
  }

  static findDevicesByModel(
    snapshot: TopologySnapshot,
    model: string
  ): string[] {
    return Object.entries(snapshot.devices)
      .filter(([, device]) => device.model === model)
      .map(([name]) => name);
  }
}
