import type { TopologySnapshot, DeviceState, LinkState, CableType } from '../contracts/index.js';

/**
 * Manages topology cache, snapshots, and initialization
 */
export class TopologyCacheManager {
  private snapshot: TopologySnapshot;
  private version: number = 0;

  constructor(initialSnapshot?: TopologySnapshot) {
    this.snapshot = initialSnapshot || this.createEmpty();
  }

  getSnapshot(): TopologySnapshot {
    return structuredClone(this.snapshot);
  }

  getSnapshotRef(): Readonly<TopologySnapshot> {
    return this.snapshot;
  }

  getDevice(name: string): DeviceState | undefined {
    return this.snapshot.devices[name];
  }

  getDeviceNames(): string[] {
    return Object.keys(this.snapshot.devices);
  }

  getLink(id: string): LinkState | undefined {
    return this.snapshot.links[id];
  }

  getLinks(): LinkState[] {
    return Object.values(this.snapshot.links) as LinkState[];
  }

  getVersion(): number {
    return this.version;
  }

  getLastUpdate(): number {
    return this.snapshot.timestamp;
  }

  updateSnapshot(newSnapshot: TopologySnapshot): void {
    this.snapshot = newSnapshot;
    this.version++;
  }

  invalidateCache(): void {
    this.version++;
  }

  private createEmpty(): TopologySnapshot {
    return {
      version: '1.0',
      devices: {},
      links: {},
      timestamp: Date.now(),
      metadata: {
        deviceCount: 0,
        linkCount: 0,
      },
    };
  }

  createLinkId(device1: string, port1: string, device2: string, port2: string): string {
    return `${device1}:${port1}--${device2}:${port2}`;
  }

  normalizePortName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/^ethernet/, 'e')
      .replace(/^gigabitethernet/, 'g')
      .replace(/^serial/, 's')
      .replace(/^fa/, 'f')
      .replace(/^gi/, 'g')
      .replace(/^ser/, 's');
  }

  inferDeviceType(model: string): 'router' | 'switch' | 'server' | 'unknown' {
    const lower = model.toLowerCase();

    if (lower.includes('2911') || lower.includes('2921') || lower.includes('4331')) {
      return 'router';
    }

    if (lower.includes('2960') || lower.includes('3650') || lower.includes('catalyst')) {
      return 'switch';
    }

    if (lower.includes('server') || lower.includes('pc')) {
      return 'server';
    }

    return 'unknown';
  }

  cableTypeFromNumber(num?: number): CableType {
    switch (num) {
      case 0:
        return 'straight';
      case 1:
        return 'cross';
      case 2:
        return 'fiber';
      case 3:
      case 4:
        return 'serial';
      case 5:
        return 'console';
      default:
        return 'straight';
    }
  }
}
