import { FileBridgeV2 } from "@cisco-auto/file-bridge";
import { FileBridgeV2Adapter } from "../infrastructure/pt/file-bridge-v2-adapter.js";
import { TopologyCache } from "../infrastructure/pt/topology-cache.js";
import type { FileBridgePort } from "../application/ports/file-bridge.port.js";
import { TraceableBridgePort, type CommandTraceEntry } from "./traceable-bridge.js";
import { topologySnapshotToNetworkTwin } from "../vdom/twin-adapter.js";
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
  DevicesInRectResult,
  NetworkTwin,
} from "../contracts/index.js";
import type { DeviceCapabilities } from "../domain/ios/capabilities/pt-capability-resolver.js";
import { TopologyService } from "../application/services/topology-service.js";
import { DeviceService } from "../application/services/device-service.js";
import { IosService } from "../application/services/ios-service.js";
import { CanvasService } from "../application/services/canvas-service.js";

export { FileBridgeV2 } from "@cisco-auto/file-bridge";

export interface PTControllerConfig {
  devDir: string;
}

export class PTController {
  private readonly bridge: FileBridgePort;
  private readonly topologyCache: TopologyCache;
  private readonly topologyService: TopologyService;
  private readonly deviceService: DeviceService;
  private readonly iosService: IosService;
  private readonly canvasService: CanvasService;
  private readonly commandTrace: CommandTraceEntry[] = [];
  private _snapshot: TopologySnapshot | null = null;
  private _twin: NetworkTwin | null = null;

  constructor(config: PTControllerConfig);
  constructor(bridge: FileBridgePort);
  constructor(configOrBridge: PTControllerConfig | FileBridgePort) {
    const recordCommand = (entry: CommandTraceEntry) => {
      this.commandTrace.push(entry);
    };

    if ("devDir" in configOrBridge) {
      const config = configOrBridge as PTControllerConfig;
      const baseBridge = new FileBridgeV2Adapter(new FileBridgeV2({ root: config.devDir }));
      this.bridge = new TraceableBridgePort(baseBridge, recordCommand);
    } else {
      const externalBridge = configOrBridge as FileBridgePort;
      this.bridge = new TraceableBridgePort(externalBridge, recordCommand);
    }

    this.topologyCache = new TopologyCache(this.bridge);

    const generateId = () => `ctrl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    this.topologyService = new TopologyService(this.bridge, this.topologyCache, generateId);
    this.deviceService = new DeviceService(this.bridge, this.topologyCache, generateId);
    this.canvasService = new CanvasService(this.bridge, generateId);

    this.iosService = new IosService(
      this.bridge,
      generateId,
      (d) => this.deviceService.inspect(d),
    );
  }

  async start(): Promise<void> {
    this.bridge.start();
    this.topologyCache.start();
  }

  async stop(): Promise<void> {
    this.topologyCache.stop();
    await this.bridge.stop();
  }

  getBridge(): FileBridgePort {
    return this.bridge;
  }

  getTopologyCache(): TopologyCache {
    return this.topologyCache;
  }

  drainCommandTrace(): CommandTraceEntry[] {
    return this.commandTrace.splice(0, this.commandTrace.length);
  }

  async addDevice(
    name: string,
    model: string,
    options?: { x?: number; y?: number }
  ): Promise<DeviceState> {
    return this.topologyService.addDevice(name, model, options);
  }

  async removeDevice(name: string): Promise<void> {
    await this.topologyService.removeDevice(name);
  }

  async renameDevice(oldName: string, newName: string): Promise<void> {
    await this.topologyService.renameDevice(oldName, newName);
  }

  async moveDevice(
    name: string,
    x: number,
    y: number
  ): Promise<{ ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }> {
    return this.topologyService.moveDevice(name, x, y);
  }

  async listDevices(filter?: string | number | string[]): Promise<DeviceState[]> {
    return this.topologyService.listDevices(filter);
  }

  async inspectDevice(name: string, includeXml = false): Promise<DeviceState> {
    return this.deviceService.inspect(name, includeXml);
  }

  async addModule(device: string, slot: number, module: string): Promise<void> {
    await this.deviceService.addModule(device, slot, module);
  }

  async removeModule(device: string, slot: number): Promise<void> {
    await this.deviceService.removeModule(device, slot);
  }

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
    await this.topologyService.removeLink(device, port);
  }

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
    await this.deviceService.configHost(device, options);
  }

  async configIos(
    device: string,
    commands: string[],
    options?: { save?: boolean }
  ): Promise<void> {
    await this.iosService.configIos(device, commands, options);
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

  async listCanvasRects(): Promise<{ rects: string[]; count: number }> {
    return this.canvasService.listCanvasRects();
  }

  async devicesInRect(
    rectId: string,
    includeClusters = false
  ): Promise<DevicesInRectResult> {
    return this.canvasService.devicesInRect(rectId, includeClusters);
  }

  async snapshot(): Promise<TopologySnapshot> {
    const cachedSnapshot = this.topologyCache.getSnapshot();

    if (cachedSnapshot) {
      this._snapshot = cachedSnapshot;
      this._twin = topologySnapshotToNetworkTwin(cachedSnapshot);
      return cachedSnapshot;
    }

    const snapshot = await this.topologyService.snapshot();
    if (snapshot) {
      this._snapshot = snapshot;
      this._twin = topologySnapshotToNetworkTwin(snapshot);
      return snapshot;
    }

    return this._snapshot ?? { timestamp: Date.now(), version: "1.0", devices: {}, links: {} };
  }

  async inspect(device: string, includeXml = false): Promise<DeviceState> {
    return this.deviceService.inspect(device, includeXml);
  }

  async hardwareInfo(device: string): Promise<unknown> {
    return this.deviceService.hardwareInfo(device);
  }

  async hardwareCatalog(deviceType?: string): Promise<unknown> {
    return this.deviceService.hardwareCatalog(deviceType);
  }

  async commandLog(device?: string, limit = 100): Promise<unknown[]> {
    return this.deviceService.commandLog(device, limit);
  }

  on<E extends PTEventType>(eventType: E, handler: (event: PTEvent) => void): () => void {
    return this.bridge.on(eventType, handler);
  }

  onAll(handler: (event: PTEvent) => void): () => void {
    return this.bridge.onAll(handler);
  }

  async loadRuntime(code: string): Promise<void> {
    return this.bridge.loadRuntime(code);
  }

  async loadRuntimeFromFile(filePath: string): Promise<void> {
    return this.bridge.loadRuntimeFromFile(filePath);
  }

  getCachedSnapshot(): TopologySnapshot | null {
    return this.topologyCache.getSnapshot() ?? this._snapshot;
  }

  getTwin(): NetworkTwin | null {
    const snapshot = this.topologyCache.getSnapshot() ?? this._snapshot;
    if (!snapshot) return this._twin;
    this._twin = topologySnapshotToNetworkTwin(snapshot);
    return this._twin;
  }

  readState<T = unknown>(): T | null {
    return this.bridge.readState<T>();
  }
}

export function createPTController(config: PTControllerConfig): PTController {
  return new PTController(config);
}

const DEFAULT_DEV_DIR = process.env.PT_DEV_DIR || `${process.env.HOME ?? ""}/pt-dev`;

export function createDefaultPTController(): PTController {
  return new PTController({ devDir: DEFAULT_DEV_DIR });
}
