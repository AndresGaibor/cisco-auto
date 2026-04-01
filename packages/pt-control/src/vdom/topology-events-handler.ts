import type { TopologySnapshot, DeviceState, LinkState } from '../contracts/index.js';
import { TopologyCacheManager } from './topology-cache-manager.js';

/**
 * Handles PT events and updates the topology snapshot
 */
export class TopologyEventsHandler {
  constructor(private cacheManager: TopologyCacheManager) {}

  handleDeviceAdded(event: { name: string; model: string; uuid?: string; x?: number; y?: number }): boolean {
    const current = this.cacheManager.getSnapshot();

    if (current.devices[event.name]) {
      return false;
    }

    const snapshot = structuredClone(current);
    snapshot.devices[event.name] = {
      name: event.name,
      model: event.model,
      type: this.cacheManager.inferDeviceType(event.model) as DeviceState["type"],
      power: true,
      uuid: event.uuid || `uuid-${event.name}`,
      x: event.x ?? 0,
      y: event.y ?? 0,
      ports: [],
    };
    snapshot.timestamp = Date.now();

    this.cacheManager.updateSnapshot(snapshot);
    return true;
  }

  handleDeviceRemoved(event: { name: string }): boolean {
    const current = this.cacheManager.getSnapshot();

    if (!current.devices[event.name]) {
      return false;
    }

    const snapshot = structuredClone(current);
    delete snapshot.devices[event.name];

    const linksToRemove = Object.entries(snapshot.links)
      .filter(([, link]) => link.device1 === event.name || link.device2 === event.name)
      .map(([id]) => id);

    for (const id of linksToRemove) {
      delete snapshot.links[id];
    }

    snapshot.timestamp = Date.now();
    this.cacheManager.updateSnapshot(snapshot);
    return true;
  }

  handleLinkCreated(event: { device1: string; port1: string; device2: string; port2: string; connType?: number }): boolean {
    const current = this.cacheManager.getSnapshot();

    const linkId = this.cacheManager.createLinkId(event.device1, event.port1, event.device2, event.port2);

    if (current.links[linkId]) {
      return false;
    }

    const snapshot = structuredClone(current);

    const port1 = this.cacheManager.normalizePortName(event.port1);
    const port2 = this.cacheManager.normalizePortName(event.port2);

    snapshot.links[linkId] = {
      id: linkId,
      device1: event.device1,
      port1,
      device2: event.device2,
      port2,
      cableType: this.cacheManager.cableTypeFromNumber(event.connType),
    };

    snapshot.timestamp = Date.now();
    this.cacheManager.updateSnapshot(snapshot);
    return true;
  }

  handleLinkDeleted(event: { device1: string; port1: string; device2: string; port2: string }): boolean {
    const current = this.cacheManager.getSnapshot();
    const linkId = this.cacheManager.createLinkId(event.device1, event.port1, event.device2, event.port2);

    if (!current.links[linkId]) {
      return false;
    }

    const snapshot = structuredClone(current);
    delete snapshot.links[linkId];
    snapshot.timestamp = Date.now();

    this.cacheManager.updateSnapshot(snapshot);
    return true;
  }
}
