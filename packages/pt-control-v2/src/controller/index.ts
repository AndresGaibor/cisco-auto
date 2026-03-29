import { FileBridge, type FileBridgeConfig } from "./file-bridge.js";
import { homedir } from "node:os";
import type {
  CommandPayload,
  PTEvent,
  PTEventType,
  PTEventTypeMap,
  TopologySnapshot,
  DeviceState,
  LinkState,
  ShowIpInterfaceBrief,
  ShowVlan,
  ShowIpRoute,
  ShowRunningConfig,
  ParsedOutput,
  AddLinkPayload,
  CanvasRect,
  DevicesInRectResult,
} from "../types/index.js";
import { TopologyCache } from "./topology-cache.js";
import { resolveCapabilities, type DeviceCapabilities } from "../ios/capabilities/pt-capability-resolver.js";

// Re-export FileBridge for external use
export { FileBridge, type FileBridgeConfig } from "./file-bridge.js";

// ============================================================================
// PTController - High-level API for controlling Packet Tracer
// ============================================================================

export class PTController {
  private bridge: FileBridge;
  private topologyCache: TopologyCache;
  private _snapshot: TopologySnapshot | null = null;

  constructor(config: FileBridgeConfig) {
    this.bridge = new FileBridge(config);
    this.topologyCache = new TopologyCache(this.bridge);
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  async start(): Promise<void> {
    await this.bridge.start();
    this.topologyCache.start();
  }

  async stop(): Promise<void> {
    this.topologyCache.stop();
    await this.bridge.stop();
  }

  getBridge(): FileBridge {
    return this.bridge;
  }

  getTopologyCache(): TopologyCache {
    return this.topologyCache;
  }

  // ============================================================================
  // Device Operations
  // ============================================================================

  /**
   * Add a device to the topology
   */
  async addDevice(
    name: string,
    model: string,
    options?: { x?: number; y?: number }
  ): Promise<DeviceState> {
    const { event } = await this.bridge.sendCommandAndWait({
      type: "addDevice",
      id: this.generateId(),
      name,
      model,
      x: options?.x ?? 100,
      y: options?.y ?? 100,
    });

    return (event as { value: DeviceState }).value;
  }

  /**
   * Remove a device from the topology
   */
  async removeDevice(name: string): Promise<void> {
    await this.bridge.sendCommandAndWait({
      type: "removeDevice",
      id: this.generateId(),
      name,
    });
  }

  /**
   * Rename a device
   */
  async renameDevice(oldName: string, newName: string): Promise<void> {
    await this.bridge.sendCommandAndWait({
      type: "renameDevice",
      id: this.generateId(),
      oldName,
      newName,
    });
  }

  /**
   * List all devices
   */
  async listDevices(filter?: string | number | string[]): Promise<DeviceState[]> {
    const cachedDevices = this.topologyCache.getDevices();

    if (cachedDevices.length > 0) {
      if (typeof filter === "undefined") {
        return cachedDevices;
      }

      const normalizedFilter = String(filter).toLowerCase();
      return cachedDevices.filter((device) => {
        return (
          device.name.toLowerCase().includes(normalizedFilter) ||
          device.model.toLowerCase().includes(normalizedFilter) ||
          device.type.toLowerCase().includes(normalizedFilter)
        );
      });
    }

    const { value } = await this.bridge.sendCommandAndWait<
      DeviceState[] | { devices?: DeviceState[]; data?: unknown }
    >({
      type: "listDevices",
      id: this.generateId(),
      filter,
    });

    if (Array.isArray(value)) {
      return value;
    }

    if (value && typeof value === "object" && Array.isArray(value.devices)) {
      return value.devices;
    }

    return [];
  }

  // ============================================================================
  // Module Operations
  // ============================================================================

  /**
   * Add a module to a device
   */
  async addModule(device: string, slot: number, module: string): Promise<void> {
    await this.bridge.sendCommandAndWait({
      type: "addModule",
      id: this.generateId(),
      device,
      slot,
      module,
    });
  }

  /**
   * Remove a module from a device
   */
  async removeModule(device: string, slot: number): Promise<void> {
    await this.bridge.sendCommandAndWait({
      type: "removeModule",
      id: this.generateId(),
      device,
      slot,
    });
  }

  // ============================================================================
  // Link Operations
  // ============================================================================

  /**
   * Add a link between two devices
   */
  async addLink(
    device1: string,
    port1: string,
    device2: string,
    port2: string,
    linkType: AddLinkPayload["linkType"] = "auto"
  ): Promise<LinkState> {
    const { event } = await this.bridge.sendCommandAndWait({
      type: "addLink",
      id: this.generateId(),
      device1,
      port1,
      device2,
      port2,
      linkType,
    });

    return (event as { value: LinkState }).value;
  }

  /**
   * Remove a link
   */
  async removeLink(device: string, port: string): Promise<void> {
    await this.bridge.sendCommandAndWait({
      type: "removeLink",
      id: this.generateId(),
      device,
      port,
    });
  }

  // ============================================================================
  // Host Configuration
  // ============================================================================

  /**
   * Configure a host (PC/Server) IP settings
   */
  async configHost(
    device: string,
    options: {
      ip?: string;
      mask?: string;
      gateway?: string;
      dns?: string;
      dhcp?: boolean;
    }
  ): Promise<void> {
    await this.bridge.sendCommandAndWait({
      type: "configHost",
      id: this.generateId(),
      device,
      ...options,
    });
  }

  // ============================================================================
  // IOS Configuration
  // ============================================================================

  /**
   * Execute IOS commands on a device
   */
  async configIos(
    device: string,
    commands: string[],
    options?: { save?: boolean }
  ): Promise<void> {
    const { value } = await this.bridge.sendCommandAndWait<{ ok: boolean; error?: string }>({
      type: "configIos",
      id: this.generateId(),
      device,
      commands,
      save: options?.save ?? true,
    });

    if (value && typeof value === "object" && value.ok === false) {
      throw new Error(value.error || "IOS configuration failed");
    }
  }

  /**
   * Execute an IOS command and get the output (parsed)
   */
  async execIos<T = ParsedOutput>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000
  ): Promise<{ raw: string; parsed?: T }> {
    const { event } = await this.bridge.sendCommandAndWait<{ raw: string; parsed?: T }>({
      type: "execIos",
      id: this.generateId(),
      device,
      command,
      parse,
      timeout,
    });

    const value = (event as { value?: { raw: string; parsed?: T } }).value;
    return value ?? { raw: "", parsed: undefined };
  }

  /**
   * Show command shortcuts (common IOS show commands with parsing)
   */
  async show(device: string, command: string): Promise<ParsedOutput> {
    const { parsed } = await this.execIos<ParsedOutput>(device, command, true);
    return parsed ?? { raw: "" };
  }

  // Convenience methods for common show commands
  async showIpInterfaceBrief(device: string): Promise<ShowIpInterfaceBrief> {
    return this.show(device, "show ip interface brief") as Promise<ShowIpInterfaceBrief>;
  }

  async showVlan(device: string): Promise<ShowVlan> {
    return this.show(device, "show vlan brief") as Promise<ShowVlan>;
  }

  async showIpRoute(device: string): Promise<ShowIpRoute> {
    return this.show(device, "show ip route") as Promise<ShowIpRoute>;
  }

  async showRunningConfig(device: string): Promise<ShowRunningConfig> {
    return this.show(device, "show running-config") as Promise<ShowRunningConfig>;
  }

  // ============================================================================
  // Interactive IOS Execution (Session-aware)
  // ============================================================================

  /**
   * Execute an IOS command with full session state management
   * Handles mode transitions, paging, and confirmations automatically
   */
  async execInteractive(
    device: string,
    command: string,
    options?: {
      timeout?: number;
      parse?: boolean;
      ensurePrivileged?: boolean;
    }
  ): Promise<{ raw: string; parsed?: ParsedOutput; session?: { mode: string } }> {
    const { value } = await this.bridge.sendCommandAndWait<{
      raw: string;
      parsed?: ParsedOutput;
      session?: { mode: string; paging?: boolean; awaitingConfirm?: boolean };
    }>({
      type: "execInteractive",
      id: this.generateId(),
      device,
      command,
      options: {
        timeout: options?.timeout ?? 30000,
        parse: options?.parse ?? true,
        ensurePrivileged: options?.ensurePrivileged ?? false,
      },
    });

    return value ?? { raw: "" };
  }

  // ============================================================================
  // Device Capabilities
  // ============================================================================

  /**
   * Get IOS device capabilities based on model
   */
  async resolveCapabilities(device: string): Promise<DeviceCapabilities> {
    // First get the device model
    const deviceState = await this.inspect(device);
    const model = deviceState.model || "unknown";

    return resolveCapabilities(model);
  }

  // ============================================================================
  // Canvas/Rect Operations
  // ============================================================================

  /**
   * List all canvas rectangle IDs (colored zones)
   */
  async listCanvasRects(): Promise<{ rects: string[]; count: number }> {
    const { value } = await this.bridge.sendCommandAndWait<{ rects: string[]; count: number }>({
      type: "listCanvasRects",
      id: this.generateId(),
    });

    return value ?? { rects: [], count: 0 };
  }

  /**
   * Get devices located within a canvas rectangle zone
   */
  async devicesInRect(
    rectId: string,
    includeClusters = false
  ): Promise<DevicesInRectResult> {
    const { value } = await this.bridge.sendCommandAndWait<DevicesInRectResult>({
      type: "devicesInRect",
      id: this.generateId(),
      rectId,
      includeClusters,
    });

    return value ?? { ok: false, rectId, devices: [], count: 0 };
  }

  // ============================================================================
  // Snapshot & Inspection
  // ============================================================================

  /**
   * Get a full topology snapshot
   */
  async snapshot(): Promise<TopologySnapshot> {
    const cachedSnapshot = this.topologyCache.getSnapshot();

    if (cachedSnapshot) {
      this._snapshot = cachedSnapshot;
      return cachedSnapshot;
    }

    const { value } = await this.bridge.sendCommandAndWait<TopologySnapshot>({
      type: "snapshot",
      id: this.generateId(),
    }, 30000);
    this._snapshot = value;
    this.topologyCache.applySnapshot(value);
    return value;
  }

  /**
   * Inspect a specific device
   */
  async inspect(device: string, includeXml = false): Promise<DeviceState> {
    if (!includeXml) {
      const cachedDevice = this.topologyCache.getDevice(device);

      if (cachedDevice) {
        return cachedDevice;
      }
    }

    const { value } = await this.bridge.sendCommandAndWait<DeviceState>({
      type: "inspect",
      id: this.generateId(),
      device,
      includeXml,
    }, 30000);
    return value;
  }

  // ============================================================================
  // Hardware & Catalog
  // ============================================================================

  /**
   * Get hardware info for a device
   */
  async hardwareInfo(device: string): Promise<unknown> {
    const { value } = await this.bridge.sendCommandAndWait({
      type: "hardwareInfo",
      id: this.generateId(),
      device,
    });
    return value;
  }

  /**
   * Get hardware catalog
   */
  async hardwareCatalog(deviceType?: string): Promise<unknown> {
    const { value } = await this.bridge.sendCommandAndWait({
      type: "hardwareCatalog",
      id: this.generateId(),
      deviceType,
    });
    return value;
  }

  // ============================================================================
  // Command Log
  // ============================================================================

  /**
   * Get command log
   */
  async commandLog(device?: string, limit = 100): Promise<unknown[]> {
    const { value } = await this.bridge.sendCommandAndWait<unknown[]>({
      type: "commandLog",
      id: this.generateId(),
      device,
      limit,
    });
    return value;
  }

  // ============================================================================
  // Event Subscription
  // ============================================================================

  /**
   * Subscribe to PT events
   */
  on<E extends PTEventType>(eventType: E, handler: (event: PTEventTypeMap[E]) => void): () => void {
    return this.bridge.on(eventType, handler);
  }

  /**
   * Subscribe to all PT events
   */
  onAll(handler: (event: PTEvent) => void): () => void {
    return this.bridge.onAll(handler);
  }

  // ============================================================================
  // Runtime Management
  // ============================================================================

  /**
   * Load runtime code into PT
   */
  async loadRuntime(code: string): Promise<void> {
    return this.bridge.loadRuntime(code);
  }

  /**
   * Load runtime from file
   */
  async loadRuntimeFromFile(filePath: string): Promise<void> {
    return this.bridge.loadRuntimeFromFile(filePath);
  }

  // ============================================================================
  // State
  // ============================================================================

  /**
   * Get current cached snapshot
   */
  getCachedSnapshot(): TopologySnapshot | null {
    return this.topologyCache.getSnapshot() ?? this._snapshot;
  }

  /**
   * Read state from PT state file
   */
  readState<T = unknown>(): T | null {
    return this.bridge.readState<T>();
  }

  // ============================================================================
  // Internal
  // ============================================================================

  private generateId(): string {
    return `ctrl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createPTController(config: FileBridgeConfig): PTController {
  return new PTController(config);
}

const DEFAULT_DEV_DIR = process.env.PT_DEV_DIR || `${process.env.HOME ?? homedir()}/pt-dev`;

export function createDefaultPTController(): PTController {
  return new PTController({ devDir: DEFAULT_DEV_DIR });
}
