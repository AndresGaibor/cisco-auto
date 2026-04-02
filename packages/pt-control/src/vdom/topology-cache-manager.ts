import type { TopologySnapshot, DeviceState, LinkState, CableType } from '../contracts/index.js';

/**
 * Manages topology cache, snapshots, and initialization.
 *
 * Distinguimos entre:
 * - snapshot vacía inicial (nunca PT escribió state.json): no materializada
 * - snapshot materializada: proviene de PT, puede ser vacía o no
 *
 * Esto evita que la snapshot vacía de arranque tape una real.
 */
export class TopologyCacheManager {
  private snapshot: TopologySnapshot;
  private version: number = 0;
  private materialized: boolean = false;

  constructor(initialSnapshot?: TopologySnapshot) {
    this.snapshot = initialSnapshot || this.createEmpty();
  }

  /**
   * Indica si ya recibimos al menos una snapshot real de PT.
   * False = solo tenemos la vacía inicial.
   */
  isMaterialized(): boolean {
    return this.materialized;
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
    this.snapshot = {
      ...newSnapshot,
      metadata: {
        ...newSnapshot.metadata,
        deviceCount: Object.keys(newSnapshot.devices).length,
        linkCount: Object.keys(newSnapshot.links).length,
      },
    };
    this.version++;
    this.materialized = true;
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
    const a = `${device1}:${this.normalizePortName(port1)}`;
    const b = `${device2}:${this.normalizePortName(port2)}`;
    return [a, b].sort().join("--");
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

  inferDeviceType(model: string): string {
    const lower = model.toLowerCase();

    if (lower.includes('router') || lower.includes('isr') || lower.includes('1941') || lower.includes('2911') || lower.includes('2921') || lower.includes('4331')) {
      return 'router';
    }

    if (lower.includes('switch') || lower.includes('2960') || lower.includes('3560') || lower.includes('3650') || lower.includes('catalyst')) {
      return 'switch';
    }

    if (lower.includes('pc') || lower.includes('laptop') || lower.includes('workstation')) {
      return 'pc';
    }

    if (lower.includes('server')) {
      return 'server';
    }

    if (lower.includes('accesspoint') || lower.includes('access point') || lower.includes('ap') || lower.includes('wireless')) {
      return 'wireless_router';
    }

    if (lower.includes('cloud')) {
      return 'cloud';
    }

    return 'generic';
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
        return 'auto';
    }
  }
}
