// ============================================================================
// PTController - High-level API for controlling Packet Tracer
// ============================================================================

import { FileBridge, type FileBridgeConfig } from "../infrastructure/pt/file-bridge.js";
import { TopologyCache } from "../infrastructure/pt/topology-cache.js";
import { homedir } from "node:os";
import type {
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
} from "../contracts/index.js";
import type { DeviceCapabilities } from "../domain/ios/capabilities/pt-capability-resolver.js";
import { TopologyService } from "../application/services/topology-service.js";
import { DeviceService } from "../application/services/device-service.js";
import { IosService } from "../application/services/ios-service.js";
import { CanvasService } from "../application/services/canvas-service.js";

// Re-export FileBridge for external use
export { FileBridge, type FileBridgeConfig } from "../infrastructure/pt/file-bridge.js";

// ============================================================================
// PTController - Thin facade delegating to services
// ============================================================================

export class PTController {
  private readonly bridge: FileBridge;
  private readonly topologyCache: TopologyCache;
  private readonly topologyService: TopologyService;
  private readonly deviceService: DeviceService;
  private readonly iosService: IosService;
  private readonly canvasService: CanvasService;
  private _snapshot: TopologySnapshot | null = null;

  constructor(config: FileBridgeConfig) {
    this.bridge = new FileBridge(config);
    this.topologyCache = new TopologyCache(this.bridge);

    const generateId = () => `ctrl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    this.topologyService = new TopologyService(this.bridge, this.topologyCache, generateId);
    this.deviceService = new DeviceService(this.bridge, this.topologyCache, generateId);
    this.iosService = new IosService(this.bridge, generateId, (d) => this.deviceService.inspect(d));
    this.canvasService = new CanvasService(this.bridge, generateId);
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
  // Device Operations (delegated to TopologyService)
  // ============================================================================

  async addDevice(
    name: string,
    model: string,
    options?: { x?: number; y?: number }
  ): Promise<DeviceState> {
    return this.topologyService.addDevice(name, model, options);
  }

  async removeDevice(name: string): Promise<void> {
    return this.topologyService.removeDevice(name);
  }

  async renameDevice(oldName: string, newName: string): Promise<void> {
    return this.topologyService.renameDevice(oldName, newName);
  }

  async listDevices(filter?: string | number | string[]): Promise<DeviceState[]> {
    return this.topologyService.listDevices(filter);
  }

  // ============================================================================
  // Module Operations (delegated to DeviceService)
  // ============================================================================

  async addModule(device: string, slot: number, module: string): Promise<void> {
    return this.deviceService.addModule(device, slot, module);
  }

  async removeModule(device: string, slot: number): Promise<void> {
    return this.deviceService.removeModule(device, slot);
  }

  // ============================================================================
  // Link Operations (delegated to TopologyService)
  // ============================================================================

  async addLink(
    device1: string,
    port1: string,
    device2: string,
    port2: string,
    linkType: AddLinkPayload["linkType"] = "auto"
  ): Promise<LinkState> {
    return this.topologyService.addLink(device1, port1, device2, port2, linkType);
  }

  async removeLink(device: string, port: string): Promise<void> {
    return this.topologyService.removeLink(device, port);
  }

  // ============================================================================
  // Host Configuration (delegated to DeviceService)
  // ============================================================================

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
    return this.deviceService.configHost(device, options);
  }

  // ============================================================================
  // IOS Configuration (delegated to IosService)
  // ============================================================================

  async configIos(
    device: string,
    commands: string[],
    options?: { save?: boolean }
  ): Promise<void> {
    return this.iosService.configIos(device, commands, options);
  }

  async execIos<T = ParsedOutput>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000
  ): Promise<{ raw: string; parsed?: T }> {
    return this.iosService.execIos<T>(device, command, parse, timeout);
  }

  async show(device: string, command: string): Promise<ParsedOutput> {
    return this.iosService.show(device, command);
  }

  async showIpInterfaceBrief(device: string): Promise<ShowIpInterfaceBrief> {
    return this.iosService.showIpInterfaceBrief(device);
  }

  async showVlan(device: string): Promise<ShowVlan> {
    return this.iosService.showVlan(device);
  }

  async showIpRoute(device: string): Promise<ShowIpRoute> {
    return this.iosService.showIpRoute(device);
  }

  async showRunningConfig(device: string): Promise<ShowRunningConfig> {
    return this.iosService.showRunningConfig(device);
  }

  async execInteractive(
    device: string,
    command: string,
    options?: {
      timeout?: number;
      parse?: boolean;
      ensurePrivileged?: boolean;
    }
  ): Promise<{ raw: string; parsed?: ParsedOutput; session?: { mode: string } }> {
    return this.iosService.execInteractive(device, command, options);
  }

  async resolveCapabilities(device: string): Promise<DeviceCapabilities> {
    return this.iosService.resolveCapabilities(device);
  }

  // ============================================================================
  // Canvas/Rect Operations (delegated to CanvasService)
  // ============================================================================

  async listCanvasRects(): Promise<{ rects: string[]; count: number }> {
    return this.canvasService.listCanvasRects();
  }

  async devicesInRect(
    rectId: string,
    includeClusters = false
  ): Promise<DevicesInRectResult> {
    return this.canvasService.devicesInRect(rectId, includeClusters);
  }

  // ============================================================================
  // Snapshot & Inspection (delegated to TopologyService/DeviceService)
  // ============================================================================

  async snapshot(): Promise<TopologySnapshot> {
    const cachedSnapshot = this.topologyCache.getSnapshot();

    if (cachedSnapshot) {
      this._snapshot = cachedSnapshot;
      return cachedSnapshot;
    }

    const snapshot = await this.topologyService.snapshot();
    if (snapshot) {
      this._snapshot = snapshot;
      return snapshot;
    }

    return this._snapshot ?? { timestamp: Date.now(), version: "1.0", devices: {}, links: {} };
  }

  async inspect(device: string, includeXml = false): Promise<DeviceState> {
    return this.deviceService.inspect(device, includeXml);
  }

  // ============================================================================
  // Hardware & Catalog (delegated to DeviceService)
  // ============================================================================

  async hardwareInfo(device: string): Promise<unknown> {
    return this.deviceService.hardwareInfo(device);
  }

  async hardwareCatalog(deviceType?: string): Promise<unknown> {
    return this.deviceService.hardwareCatalog(deviceType);
  }

  async commandLog(device?: string, limit = 100): Promise<unknown[]> {
    return this.deviceService.commandLog(device, limit);
  }

  // ============================================================================
  // Event Subscription
  // ============================================================================

  on<E extends PTEventType>(eventType: E, handler: (event: PTEventTypeMap[E]) => void): () => void {
    return this.bridge.on(eventType, handler);
  }

  onAll(handler: (event: PTEvent) => void): () => void {
    return this.bridge.onAll(handler);
  }

  // ============================================================================
  // Runtime Management
  // ============================================================================

  async loadRuntime(code: string): Promise<void> {
    return this.bridge.loadRuntime(code);
  }

  async loadRuntimeFromFile(filePath: string): Promise<void> {
    return this.bridge.loadRuntimeFromFile(filePath);
  }

  // ============================================================================
  // State
  // ============================================================================

  getCachedSnapshot(): TopologySnapshot | null {
    return this.topologyCache.getSnapshot() ?? this._snapshot;
  }

  readState<T = unknown>(): T | null {
    return this.bridge.readState<T>();
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
