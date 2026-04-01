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
import { TopologyCacheManager } from "./topology-cache-manager.js";
import { TopologyEventsHandler } from "./topology-events-handler.js";
import { TopologyChangeDetector } from "./topology-change-detector.js";

// ============================================================================
// Virtual DOM - Event-Driven Topology State
// ============================================================================

/**
 * VirtualTopology maintains a mirrored state of the PT topology
 * and updates it based on PT events.
 */
export class VirtualTopology {
  private cacheManager: TopologyCacheManager;
  private eventsHandler: TopologyEventsHandler;
  private changeDetector: TopologyChangeDetector;
  private handlers: Array<{
    fn: (delta: TopologyDelta) => void;
    addedAt: number;
    label?: string;
  }> = [];

  constructor(initialSnapshot?: TopologySnapshot) {
    this.cacheManager = new TopologyCacheManager(initialSnapshot);
    this.eventsHandler = new TopologyEventsHandler(this.cacheManager);
    this.changeDetector = new TopologyChangeDetector();
  }

  // ============================================================================
  // State Access
  // ============================================================================

  /**
   * Get current snapshot (deep cloned for immutability)
   */
  getSnapshot(): TopologySnapshot {
    return this.cacheManager.getSnapshot();
  }

  /**
   * Get read-only reference to current snapshot (shallow, for performance)
   * ⚠️ Do not mutate the returned object. Use for read-only operations only.
   */
  getSnapshotRef(): Readonly<TopologySnapshot> {
    return this.cacheManager.getSnapshotRef();
  }

  /**
   * Get a device by name
   */
  getDevice(name: string): DeviceState | undefined {
    return this.cacheManager.getDevice(name);
  }

  /**
   * Get all device names
   */
  getDeviceNames(): string[] {
    return this.cacheManager.getDeviceNames();
  }

  /**
   * Get a link by ID
   */
  getLink(id: string): LinkState | undefined {
    return this.cacheManager.getLink(id);
  }

  /**
   * Get all links
   */
  getLinks(): LinkState[] {
    return this.cacheManager.getLinks();
  }

  /**
   * Get version (incremented on each change)
   */
  getVersion(): number {
    return this.cacheManager.getVersion();
  }

  /**
   * Get timestamp of last update
   */
  getLastUpdate(): number {
    return this.cacheManager.getLastUpdate();
  }

  isMaterialized(): boolean {
    return this.cacheManager.isMaterialized();
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

   /**
    * Apply a PT event to update the virtual state
    */
  applyEvent(event: PTEvent): void {
    const prevSnapshot = this.cacheManager.getSnapshot();
    let changed = false;

    switch (event.type) {
      case "device-added":
        changed = this.eventsHandler.handleDeviceAdded(event);
        break;

      case "device-removed":
        changed = this.eventsHandler.handleDeviceRemoved(event);
        break;

      case "link-created":
        changed = this.eventsHandler.handleLinkCreated(event);
        break;

      case "link-deleted":
        changed = this.eventsHandler.handleLinkDeleted(event);
        break;

      case "snapshot":
        // Full snapshot replacement
        if (event.devices !== undefined) {
          const snapshot = this.cacheManager.getSnapshot();
          snapshot.timestamp = event.ts;
          this.cacheManager.updateSnapshot(snapshot);
          changed = true;
        }
        break;
    }

    if (changed) {
      const currentSnapshot = this.cacheManager.getSnapshot();
      const delta = this.changeDetector.calculateDeltaFrom(prevSnapshot, currentSnapshot);
      this.notifyHandlers(delta);
    }
  }

  /**
    * Replace entire snapshot (e.g., from PT state.json)
    */
  replaceSnapshot(snapshot: TopologySnapshot): void {
    const prevSnapshot = this.cacheManager.getSnapshot();
    this.cacheManager.updateSnapshot({
      ...snapshot,
      timestamp: Date.now(),
    });

    const currentSnapshot = this.cacheManager.getSnapshot();
    const delta = this.changeDetector.calculateDeltaFrom(prevSnapshot, currentSnapshot);
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

    // Obtener los enlaces desde el cacheManager
    const links = this.cacheManager.getLinks();
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
    const snapshot = this.cacheManager.getSnapshot();
    const links = Object.values(snapshot.links) as LinkState[];
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
   * Get devices located within a zone/rectangle
   * Uses center-point containment check
   */
  getDevicesInZone(zoneGeometry: { x1: number; y1: number; x2: number; y2: number }): string[] {
    // Import dynamically to avoid circular dependency
    const { ZoneGeometry, Coordinate2D } = require("../domain/topology/value-objects/index.js");
    
    const zoneGeom = ZoneGeometry.from(zoneGeometry.x1, zoneGeometry.y1, zoneGeometry.x2, zoneGeometry.y2);
    const snapshot = this.cacheManager.getSnapshot();
    const devices: string[] = [];

    for (const [name, device] of Object.entries(snapshot.devices)) {
      // Use device position from snapshot (x, y)
      if (device.x !== undefined && device.y !== undefined) {
        const devicePos = Coordinate2D.from(device.x, device.y);
        if (zoneGeom.containsCoordinate(devicePos)) {
          devices.push(name);
        }
      }
    }

    return devices;
  }

  /**
   * Check if a device is inside a zone
   */
  isDeviceInZone(deviceName: string, zoneGeometry: { x1: number; y1: number; x2: number; y2: number }): boolean {
    const { ZoneGeometry, Coordinate2D } = require("../domain/topology/value-objects/index.js");
    
    const snapshot = this.cacheManager.getSnapshot();
    const device = snapshot.devices[deviceName];
    if (!device || device.x === undefined || device.y === undefined) {
      return false;
    }

    const zoneGeom = ZoneGeometry.from(zoneGeometry.x1, zoneGeometry.y1, zoneGeometry.x2, zoneGeometry.y2);
    const devicePos = Coordinate2D.from(device.x, device.y);
    return zoneGeom.containsCoordinate(devicePos);
  }

  /**
   * Get zones that contain a specific device (reverse lookup)
   * Returns array of zone geometries that contain the device
   */
  getZonesForDevice(deviceName: string, allZones: Array<{ id: string; geometry: { x1: number; y1: number; x2: number; y2: number } }>): string[] {
    const { ZoneGeometry, Coordinate2D } = require("../domain/topology/value-objects/index.js");
    
    const snapshot = this.cacheManager.getSnapshot();
    const device = snapshot.devices[deviceName];
    if (!device || device.x === undefined || device.y === undefined) {
      return [];
    }

    const devicePos = Coordinate2D.from(device.x, device.y);
    const zoneIds: string[] = [];

    for (const zone of allZones) {
      const zoneGeom = ZoneGeometry.from(zone.geometry.x1, zone.geometry.y1, zone.geometry.x2, zone.geometry.y2);
      if (zoneGeom.containsCoordinate(devicePos)) {
        zoneIds.push(zone.id);
      }
    }

    return zoneIds;
  }

  /**
   * Export to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.cacheManager.getSnapshot(), null, 2);
  }

  /**
   * Convert to NetworkTwin for agent context
   */
  toNetworkTwin(): NetworkTwin {
    return topologySnapshotToNetworkTwin(this.cacheManager.getSnapshot());
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
