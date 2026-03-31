import type {
  TopologySnapshot,
  DeviceState,
  LinkState,
  TopologyDelta,
  PTEvent,
  CableType,
  DeviceType
} from "../contracts/index.js";
import { topologySnapshotToNetworkTwin, enrichWithZones } from "./twin-adapter.js";
import type { NetworkTwin } from "../contracts/twin-types.js";

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
  private handlers: Array<{
    fn: (delta: TopologyDelta) => void;
    addedAt: number;
    label?: string;
  }> = [];

  constructor(initialSnapshot?: TopologySnapshot) {
    this.snapshot = initialSnapshot || this.createEmpty();
  }

  // ============================================================================
  // State Access
  // ============================================================================

  /**
   * Get current snapshot (deep cloned for immutability)
   */
  getSnapshot(): TopologySnapshot {
    return structuredClone(this.snapshot);
  }

  /**
   * Get read-only reference to current snapshot (shallow, for performance)
   * ⚠️ Do not mutate the returned object. Use for read-only operations only.
   */
  getSnapshotRef(): Readonly<TopologySnapshot> {
    return this.snapshot;
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
    const prevSnapshot = structuredClone(this.snapshot);
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
      this.invalidateCache();

      // Calculate delta and notify handlers
      const delta = this.calculateDeltaFrom(prevSnapshot);
      this.notifyHandlers(delta);
    }
  }

  /**
   * Replace entire snapshot (e.g., from PT state.json)
   */
  replaceSnapshot(snapshot: TopologySnapshot): void {
    const prevSnapshot = structuredClone(this.snapshot);
    this.snapshot = {
      ...snapshot,
      timestamp: Date.now(),
    };
    this.version++;
    this.invalidateCache();

    const delta = this.calculateDeltaFrom(prevSnapshot);
    this.notifyHandlers(delta);
  }

  // ============================================================================
  // Subscriptions
  // ============================================================================

  /**
   * Subscribe to topology changes
   */
  onChange(handler: (delta: TopologyDelta) => void, label?: string): () => void {
    const entry = {
      fn: handler,
      addedAt: Date.now(),
      label: label || "anonymous",
    };

    this.handlers.push(entry);

    if (this.handlers.length > 20) {
      console.warn(
        `VirtualTopology: ${this.handlers.length} handlers registered. ` +
        `Possible leak. Labels: ${this.handlers.map(h => h.label).join(", ")}`
      );
    }

    let removed = false;
    return () => {
      if (removed) return;
      removed = true;
      const index = this.handlers.indexOf(entry);
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

  /**
   * Convert to NetworkTwin for agent context
   */
  toNetworkTwin(): NetworkTwin {
    return topologySnapshotToNetworkTwin(this.snapshot);
  }

  /**
   * Enrich NetworkTwin with zone information from canvas rects
   */
  enrichNetworkTwinWithZones(twin: NetworkTwin, rects: unknown[]): NetworkTwin {
    return enrichWithZones(twin, rects as Parameters<typeof enrichWithZones>[1]);
  }

  // ============================================================================
  // Internal
  // ============================================================================

  private invalidateCache(): void {
    // No-op: kept for API compatibility, caching removed for simplicity
  }

  private inferDeviceType(model: string): DeviceType {
    const m = (model || "").toLowerCase();

    if (m.includes("2960") || m.includes("3560") || m.includes("switch")) {
      return "switch";
    }
    if (m.includes("2911") || m.includes("1941") || m.includes("router") || m.includes("isr")) {
      return "router";
    }
    if (m.includes("pc") || m.includes("laptop")) {
      return "pc";
    }
    if (m.includes("server")) {
      return "server";
    }
    if (m.includes("accesspoint") || m.includes("wireless")) {
      return "wireless_router";
    }
    if (m.includes("cloud")) {
      return "cloud";
    }

    return "generic";
  }

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
    const ep1 = `${device1}:${this.normalizePortName(port1)}`;
    const ep2 = `${device2}:${this.normalizePortName(port2)}`;
    return ep1 < ep2 ? `${ep1}--${ep2}` : `${ep2}--${ep1}`;
  }

  private normalizePortName(name: string): string {
    const lower = name.toLowerCase();
    let normalized = lower
      .replace(/^gi(gabitethernet)?/i, "gig")
      .replace(/^fa(stethernet)?/i, "fas")
      .replace(/^se(rial)?/i, "ser")
      .replace(/^vlan/i, "vla")
      .replace(/^lo(opback)?/i, "loo");
    normalized = normalized.replace(/(\d+)/g, (match) => match.padStart(3, "0"));
    return normalized;
  }

  private handleDeviceAdded(event: { name: string; model: string; uuid?: string; x?: number; y?: number }): boolean {
    if (this.snapshot.devices[event.name]) {
      return false; // Already exists
    }

    this.snapshot.devices[event.name] = {
      name: event.name,
      model: event.model,
      type: this.inferDeviceType(event.model),
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

  /**
   * Calculate delta between two snapshots (optimized for performance)
   * 
   * Optimizations:
   * - Early exit for empty previous snapshot (full add scenario)
   * - Shallow comparison for primitive values
   * - Deep comparison only for arrays/objects
   * - Single pass through device/link sets
   */
  private calculateDeltaFrom(previous: TopologySnapshot): TopologyDelta {
    const deviceDeltas: TopologyDelta["devices"] = [];
    const linkDeltas: TopologyDelta["links"] = [];

    // Early exit: if previous is empty, all current items are additions
    const prevDeviceKeys = Object.keys(previous.devices);
    const currDeviceKeys = Object.keys(this.snapshot.devices);
    
    if (prevDeviceKeys.length === 0 && currDeviceKeys.length > 0) {
      // All devices are new
      for (const name of currDeviceKeys) {
        deviceDeltas.push({ op: "add", device: this.snapshot.devices[name]! });
      }
    } else if (currDeviceKeys.length === 0 && prevDeviceKeys.length > 0) {
      // All devices removed
      for (const name of prevDeviceKeys) {
        deviceDeltas.push({ op: "remove", name });
      }
    } else if (prevDeviceKeys.length > 0 || currDeviceKeys.length > 0) {
      // Normal case: check for changes
      const allDeviceNames = new Set([...prevDeviceKeys, ...currDeviceKeys]);

      for (const name of allDeviceNames) {
        const prev = previous.devices[name] as DeviceState | undefined;
        const curr = this.snapshot.devices[name] as DeviceState | undefined;

        if (!prev && curr) {
          deviceDeltas.push({ op: "add", device: curr });
        } else if (prev && !curr) {
          deviceDeltas.push({ op: "remove", name });
        } else if (prev && curr) {
          const changes = this.detectDeviceChanges(prev, curr);
          if (changes) {
            deviceDeltas.push({ op: "update", name, changes });
          }
        }
      }
    }

    // Link changes (same optimization pattern)
    const prevLinkKeys = Object.keys(previous.links);
    const currLinkKeys = Object.keys(this.snapshot.links);

    if (prevLinkKeys.length === 0 && currLinkKeys.length > 0) {
      for (const id of currLinkKeys) {
        linkDeltas.push({ op: "add", link: this.snapshot.links[id]! });
      }
    } else if (currLinkKeys.length === 0 && prevLinkKeys.length > 0) {
      for (const id of prevLinkKeys) {
        linkDeltas.push({ op: "remove", id });
      }
    } else if (prevLinkKeys.length > 0 || currLinkKeys.length > 0) {
      const allLinkIds = new Set([...prevLinkKeys, ...currLinkKeys]);

      for (const id of allLinkIds) {
        const prev = previous.links[id] as LinkState | undefined;
        const curr = this.snapshot.links[id] as LinkState | undefined;

        if (!prev && curr) {
          linkDeltas.push({ op: "add", link: curr });
        } else if (prev && !curr) {
          linkDeltas.push({ op: "remove", id });
        }
        // Note: Link updates are not supported - links are removed and re-added instead
      }
    }

    return {
      from: previous.timestamp,
      to: this.snapshot.timestamp,
      devices: deviceDeltas,
      links: linkDeltas,
    };
  }

  /**
   * Detect changes between two device states (optimized)
   */
  private detectDeviceChanges(prev: DeviceState, curr: DeviceState): Record<string, unknown> | null {
    const changes: Record<string, unknown> = {};
    const prevKeys = Object.keys(prev);
    const currKeys = Object.keys(curr);
    const allKeys = new Set([...prevKeys, ...currKeys]);

    for (const key of allKeys) {
      const prevVal = prev[key as keyof DeviceState];
      const currVal = curr[key as keyof DeviceState];

      // Skip if same reference (fast path)
      if (prevVal === currVal) continue;

      // Handle arrays (ports)
      if (Array.isArray(prevVal) && Array.isArray(currVal)) {
        if (prevVal.length !== currVal.length) {
          changes[key] = currVal;
        } else {
          // Deep compare arrays
          let different = false;
          for (let i = 0; i < prevVal.length; i++) {
            if (JSON.stringify(prevVal[i]) !== JSON.stringify(currVal[i])) {
              different = true;
              break;
            }
          }
          if (different) {
            changes[key] = currVal;
          }
        }
      } else if (typeof prevVal === 'object' && typeof currVal === 'object') {
        // Handle objects - use JSON for deep comparison
        if (JSON.stringify(prevVal) !== JSON.stringify(currVal)) {
          changes[key] = currVal;
        }
      } else {
        // Primitive values
        changes[key] = currVal;
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  /**
   * Detect changes between two link states
   */
  private detectLinkChanges(prev: LinkState, curr: LinkState): boolean {
    return (
      prev.device1 !== curr.device1 ||
      prev.port1 !== curr.port1 ||
      prev.device2 !== curr.device2 ||
      prev.port2 !== curr.port2 ||
      prev.cableType !== curr.cableType
    );
  }

  private notifyHandlers(delta: TopologyDelta): void {
    for (const entry of this.handlers) {
      try {
        entry.fn(delta);
      } catch (err) {
        console.error(`[VirtualTopology] Handler error (${entry.label}):`, err);
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
