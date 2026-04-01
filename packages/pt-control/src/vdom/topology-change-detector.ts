import type { DeviceState, LinkState, TopologyDelta } from '../contracts/index.js';

/**
 * Detects and categorizes changes between topology snapshots
 */
export class TopologyChangeDetector {
  detectDeviceChanges(prev: DeviceState, curr: DeviceState): Record<string, unknown> | null {
    const changes: Record<string, unknown> = {};
    let hasChanges = false;

    if (prev.model !== curr.model) {
      changes.model = { from: prev.model, to: curr.model };
      hasChanges = true;
    }

    if (prev.x !== curr.x || prev.y !== curr.y) {
      changes.position = { from: { x: prev.x, y: prev.y }, to: { x: curr.x, y: curr.y } };
      hasChanges = true;
    }

    if (prev.ports !== curr.ports) {
      const prevPorts = prev.ports || [];
      const currPorts = curr.ports || [];
      if (JSON.stringify(prevPorts) !== JSON.stringify(currPorts)) {
        changes.ports = { from: prevPorts, to: currPorts };
        hasChanges = true;
      }
    }

    return hasChanges ? changes : null;
  }

  detectLinkChanges(prev: LinkState, curr: LinkState): boolean {
    return (
      prev.device1 !== curr.device1 ||
      prev.port1 !== curr.port1 ||
      prev.device2 !== curr.device2 ||
      prev.port2 !== curr.port2 ||
      prev.cableType !== curr.cableType
    );
  }

  calculateDeltaFrom(
    previous: { devices: Record<string, DeviceState>; links: Record<string, LinkState>; timestamp?: number },
    current: { devices: Record<string, DeviceState>; links: Record<string, LinkState>; timestamp?: number }
  ): TopologyDelta {
    const devices: Array<any> = [];
    const links: Array<any> = [];

    const allDeviceNames = new Set([
      ...Object.keys(previous.devices),
      ...Object.keys(current.devices),
    ]);
    for (const name of allDeviceNames) {
      const prevDevice = previous.devices[name];
      const currDevice = current.devices[name];
      if (!prevDevice && currDevice) {
        devices.push({ op: 'add', device: currDevice });
      } else if (prevDevice && !currDevice) {
        devices.push({ op: 'remove', name });
      } else if (prevDevice && currDevice) {
        const changes = this.detectDeviceChanges(prevDevice, currDevice);
        if (changes && Object.keys(changes).length > 0) {
          devices.push({ op: 'update', name, changes });
        }
      }
    }

    const allLinkIds = new Set([
      ...Object.keys(previous.links),
      ...Object.keys(current.links),
    ]);
    for (const id of allLinkIds) {
      const prevLink = previous.links[id];
      const currLink = current.links[id];
      if (!prevLink && currLink) {
        links.push({ op: 'add', link: currLink });
      } else if (prevLink && !currLink) {
        links.push({ op: 'remove', id });
      }
    }

    return {
      from: previous.timestamp || 0,
      to: current.timestamp || Date.now(),
      devices,
      links,
    };
  }
}
