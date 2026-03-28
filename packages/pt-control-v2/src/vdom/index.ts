import type { 
  TopologySnapshot, 
  DeviceState, 
  LinkState, 
  TopologyDelta, 
  PTEvent,
  CableType
} from "../types/index.js";

// ============================================================================
// Virtual DOM - Event-Driven Topology State
// ============================================================================

/**
 * VirtualTopology maintains a mirrored state of the PT topology
 * and updates it based on PT events.
 */
export class VirtualTopology {
  private snapshot: TopologySnapshot;
  private version: number = 0;
  private handlers: Array<(delta: TopologyDelta) => void> = [];

  constructor(initialSnapshot?: TopologySnapshot) {
    this.snapshot = initialSnapshot || this.createEmpty();
  }

  // ============================================================================
  // State Access
  // ============================================================================

  /**
   * Get current snapshot
   */
  getSnapshot(): TopologySnapshot {
    return { ...this.snapshot };
  }

  /**
   * Get a device by name
   */
  getDevice(name: string): DeviceState | undefined {
    return this.snapshot.devices[name];
  }

  /**
   * Get all device names
   */
  getDeviceNames(): string[] {
    return Object.keys(this.snapshot.devices);
  }

  /**
   * Get a link by ID
   */
  getLink(id: string): LinkState | undefined {
    return this.snapshot.links[id];
  }

  /**
   * Get all links
   */
  getLinks(): LinkState[] {
    return Object.values(this.snapshot.links) as LinkState[];
  }

  /**
   * Get version (incremented on each change)
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Get timestamp of last update
   */
  getLastUpdate(): number {
    return this.snapshot.timestamp;
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Apply a PT event to update the virtual state
   */
  applyEvent(event: PTEvent): void {
    const prevSnapshot = { ...this.snapshot, devices: { ...this.snapshot.devices }, links: { ...this.snapshot.links } };
    let changed = false;

    switch (event.type) {
      case "device-added":
        changed = this.handleDeviceAdded(event);
        break;

      case "device-removed":
        changed = this.handleDeviceRemoved(event);
        break;

      case "link-created":
        changed = this.handleLinkCreated(event);
        break;

      case "link-deleted":
        changed = this.handleLinkDeleted(event);
        break;

      case "snapshot":
        // Full snapshot replacement
        if (event.devices !== undefined) {
          this.snapshot.timestamp = event.ts;
          changed = true;
        }
        break;
    }

    if (changed) {
      this.version++;
      this.snapshot.timestamp = event.ts;

      // Calculate delta and notify handlers
      const delta = this.calculateDeltaFrom(prevSnapshot);
      this.notifyHandlers(delta);
    }
  }

  /**
   * Replace entire snapshot (e.g., from PT state.json)
   */
  replaceSnapshot(snapshot: TopologySnapshot): void {
    const prevSnapshot = this.snapshot;
    this.snapshot = {
      ...snapshot,
      timestamp: Date.now(),
    };
    this.version++;

    const delta = this.calculateDeltaFrom(prevSnapshot);
    this.notifyHandlers(delta);
  }

  // ============================================================================
  // Subscriptions
  // ============================================================================

  /**
   * Subscribe to topology changes
   */
  onChange(handler: (delta: TopologyDelta) => void): () => void {
    this.handlers.push(handler);
    return () => {
      const index = this.handlers.indexOf(handler);
      if (index >= 0) {
        this.handlers.splice(index, 1);
      }
    };
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Find devices connected to a device
   */
  getConnectedDevices(deviceName: string): string[] {
    const connected: Set<string> = new Set();

    const links = Object.values(this.snapshot.links) as LinkState[];
    for (const link of links) {
      if (link.device1 === deviceName) {
        connected.add(link.device2);
      }
      if (link.device2 === deviceName) {
        connected.add(link.device1);
      }
    }

    return Array.from(connected);
  }

  /**
   * Find link between two devices
   */
  findLinkBetween(device1: string, device2: string): LinkState | undefined {
    const links = Object.values(this.snapshot.links) as LinkState[];
    for (const link of links) {
      if (
        (link.device1 === device1 && link.device2 === device2) ||
        (link.device1 === device2 && link.device2 === device1)
      ) {
        return link;
      }
    }
    return undefined;
  }

  /**
   * Export to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.snapshot, null, 2);
  }

  // ============================================================================
  // Internal
  // ============================================================================

  private createEmpty(): TopologySnapshot {
    return {
      version: "1.0",
      timestamp: Date.now(),
      devices: {},
      links: {},
      metadata: {
        deviceCount: 0,
        linkCount: 0,
      },
    };
  }

  private createLinkId(device1: string, port1: string, device2: string, port2: string): string {
    const endpoints = [
      `${device1}:${port1}`,
      `${device2}:${port2}`,
    ].sort();
    return endpoints.join("-");
  }

  private handleDeviceAdded(event: { name: string; model: string; uuid?: string; x?: number; y?: number }): boolean {
    if (this.snapshot.devices[event.name]) {
      return false; // Already exists
    }

    this.snapshot.devices[event.name] = {
      name: event.name,
      model: event.model,
      type: "generic", // Will be updated on snapshot
      power: true,
      uuid: event.uuid,
      x: event.x,
      y: event.y,
      ports: [],
    };

    this.snapshot.metadata!.deviceCount = Object.keys(this.snapshot.devices).length;
    return true;
  }

  private handleDeviceRemoved(event: { name: string }): boolean {
    if (!this.snapshot.devices[event.name]) {
      return false; // Doesn't exist
    }

    // Remove device
    delete this.snapshot.devices[event.name];

    // Remove associated links
    const links = Object.entries(this.snapshot.links) as [string, LinkState][];
    for (const [linkId, link] of links) {
      if (link.device1 === event.name || link.device2 === event.name) {
        delete this.snapshot.links[linkId];
      }
    }

    this.snapshot.metadata!.deviceCount = Object.keys(this.snapshot.devices).length;
    this.snapshot.metadata!.linkCount = Object.keys(this.snapshot.links).length;
    return true;
  }

  private handleLinkCreated(event: { device1: string; port1: string; device2: string; port2: string; connType?: number }): boolean {
    const linkId = this.createLinkId(event.device1, event.port1, event.device2, event.port2);

    if (this.snapshot.links[linkId]) {
      return false; // Already exists
    }

    this.snapshot.links[linkId] = {
      id: linkId,
      device1: event.device1,
      port1: event.port1,
      device2: event.device2,
      port2: event.port2,
      cableType: this.cableTypeFromNumber(event.connType),
    };

    this.snapshot.metadata!.linkCount = Object.keys(this.snapshot.links).length;
    return true;
  }

  private handleLinkDeleted(event: { device1: string; port1: string; device2: string; port2: string }): boolean {
    const linkId = this.createLinkId(event.device1, event.port1, event.device2, event.port2);

    if (!this.snapshot.links[linkId]) {
      return false; // Doesn't exist
    }

    delete this.snapshot.links[linkId];
    this.snapshot.metadata!.linkCount = Object.keys(this.snapshot.links).length;
    return true;
  }

  private cableTypeFromNumber(num?: number): CableType {
    const types: Record<number, CableType> = {
      8100: "straight", 8101: "cross", 8102: "roll", 8103: "fiber",
      8104: "phone", 8105: "cable", 8106: "serial", 8107: "auto",
      8108: "console", 8109: "wireless", 8110: "coaxial", 8111: "octal",
      8112: "cellular", 8113: "usb", 8114: "custom_io",
    };
    return num ? types[num] || "auto" : "auto";
  }

  private calculateDeltaFrom(previous: TopologySnapshot): TopologyDelta {
    const deviceDeltas: TopologyDelta["devices"] = [];
    const linkDeltas: TopologyDelta["links"] = [];

    // Device changes
    const allDeviceNames = new Set([
      ...Object.keys(previous.devices),
      ...Object.keys(this.snapshot.devices),
    ]);

    for (const name of allDeviceNames) {
      const prev = previous.devices[name] as DeviceState | undefined;
      const curr = this.snapshot.devices[name] as DeviceState | undefined;

      if (!prev && curr) {
        deviceDeltas.push({ op: "add", device: curr });
      } else if (prev && !curr) {
        deviceDeltas.push({ op: "remove", name });
      } else if (prev && curr) {
        const changes: Record<string, unknown> = {};
        for (const key of Object.keys(curr)) {
          if (JSON.stringify(prev[key as keyof DeviceState]) !== JSON.stringify(curr[key as keyof DeviceState])) {
            changes[key] = curr[key as keyof DeviceState];
          }
        }
        if (Object.keys(changes).length > 0) {
          deviceDeltas.push({ op: "update", name, changes });
        }
      }
    }

    // Link changes
    const allLinkIds = new Set([
      ...Object.keys(previous.links),
      ...Object.keys(this.snapshot.links),
    ]);

    for (const id of allLinkIds) {
      const prev = previous.links[id] as LinkState | undefined;
      const curr = this.snapshot.links[id] as LinkState | undefined;

      if (!prev && curr) {
        linkDeltas.push({ op: "add", link: curr });
      } else if (prev && !curr) {
        linkDeltas.push({ op: "remove", id });
      }
    }

    return {
      from: previous.timestamp,
      to: this.snapshot.timestamp,
      devices: deviceDeltas,
      links: linkDeltas,
    };
  }

  private notifyHandlers(delta: TopologyDelta): void {
    for (const handler of this.handlers) {
      try {
        handler(delta);
      } catch (err) {
        console.error("[VirtualTopology] Handler error:", err);
      }
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createVirtualTopology(initialSnapshot?: TopologySnapshot): VirtualTopology {
  return new VirtualTopology(initialSnapshot);
}
