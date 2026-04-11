import { FileBridgeV2 } from "@cisco-auto/file-bridge";
import { TopologyCache } from "../infrastructure/pt/topology-cache.js";
import type { FileBridgePort } from "../application/ports/file-bridge.port.js";
import { topologySnapshotToNetworkTwin } from "../vdom/twin-adapter.js";
import { homedir, platform } from "node:os";
import { resolve } from "node:path";
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
  ShowCdpNeighbors,
  ParsedOutput,
  AddLinkPayload,
  DevicesInRectResult,
  NetworkTwin,
} from "../contracts/index.js";
import type {
  IosExecutionSuccess,
  IosConfigApplyResult,
  IosConfidence,
} from "../contracts/ios-execution-evidence.js";
import type { DeviceCapabilities } from "../domain/ios/capabilities/pt-capability-resolver.js";
import { TopologyService } from "../application/services/topology-service.js";
import { DeviceService } from "../application/services/device-service.js";
import { IosService } from "../application/services/ios-service.js";
import { CanvasService } from "../application/services/canvas-service.js";

export { FileBridgeV2 } from "@cisco-auto/file-bridge";

export interface PTControllerConfig {
  devDir: string;
}

export interface CommandTraceEntry {
  id: string;
  type: string;
  completedAt: number;
  ok?: boolean;
  ts?: number;
  status?: string;
  commandType?: string;
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
    if ("devDir" in configOrBridge) {
      const config = configOrBridge as PTControllerConfig;
      this.bridge = new FileBridgeV2({ root: config.devDir });
    } else {
      const externalBridge = configOrBridge as FileBridgePort;
      this.bridge = externalBridge;
    }

    this.bridge.onAll((event) => {
      const evt = event as Partial<CommandTraceEntry> & { type?: string; id?: string; ok?: boolean; ts?: number; status?: string; commandType?: string };
      if (!evt.id) return;
      if (!String(evt.type ?? "").startsWith("command-")) return;
      this.commandTrace.push({
        id: evt.id,
        type: evt.type ?? "command-event",
        completedAt: typeof evt.ts === "number" ? evt.ts : Date.now(),
        ok: typeof evt.ok === "boolean" ? evt.ok : undefined,
        ts: typeof evt.ts === "number" ? evt.ts : undefined,
        status: evt.status,
        commandType: evt.commandType,
      });
    });

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

  async clearTopology(): Promise<{ removedDevices: number; removedLinks: number; remainingDevices: number; remainingLinks: number }> {
    return this.topologyService.clearTopology();
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

  async showCdpNeighbors(device: string): Promise<ShowCdpNeighbors> {
    return this.iosService.showCdpNeighbors(device);
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

  async execIosWithEvidence<T = ParsedOutput>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000
  ): Promise<IosExecutionSuccess<T>> {
    return this.iosService.execIos<T>(device, command, parse, timeout);
  }

  async configIosWithResult(
    device: string,
    commands: string[],
    options?: { save?: boolean } | undefined
  ): Promise<IosConfigApplyResult> {
    return this.iosService.configIos(device, commands, options);
  }

  async configureDhcpServer(
    device: string,
    options: {
      poolName: string;
      network: string;
      subnetMask: string;
      defaultRouter?: string;
      dnsServers?: string[];
      excludedAddresses?: string[];
      leaseTime?: number;
      domainName?: string;
    }
  ): Promise<void> {
    await this.deviceService.configureDhcpServer(device, options);
  }

  async inspectDhcpServer(
    device: string
  ): Promise<{
    ok: boolean;
    device: string;
    pools: Array<{
      name: string;
      network: string;
      subnetMask: string;
      defaultRouter?: string;
      dnsServers?: string[];
      leaseTime?: number;
      domainName?: string;
    }>;
    excludedAddresses?: string[];
    poolCount: number;
    excludedAddressCount: number;
  }> {
    return this.deviceService.inspectDhcpServer(device);
  }

  async showParsed<T = ParsedOutput>(
    device: string,
    command: string,
    options?: { ensurePrivileged?: boolean; timeout?: number }
  ): Promise<IosExecutionSuccess<T>> {
    return this.iosService.showParsed<T>(device, command, options);
  }

  async getIosConfidence(
    device: string,
    evidence: { source: string; status?: number; mode?: string },
    verificationCheck?: string
  ): Promise<IosConfidence> {
    return this.iosService.getConfidence(device, evidence as any, verificationCheck);
  }

  async configureDhcpPool(
    device: string,
    poolName: string,
    network: string,
    mask: string,
    defaultRouter: string,
    dnsServer?: string,
    options?: { save?: boolean }
  ): Promise<void> {
    await this.iosService.configureDhcpPool(
      device, poolName, network, mask, defaultRouter, dnsServer, options
    );
  }

  async configureOspfNetwork(
    device: string,
    processId: number,
    network: string,
    wildcard: string,
    area: number,
    options?: { save?: boolean }
  ): Promise<void> {
    await this.iosService.configureOspfNetwork(
      device, processId, network, wildcard, area, options
    );
  }

  async configureSshAccess(
    device: string,
    domainName: string,
    username: string,
    password: string,
    options?: { save?: boolean }
  ): Promise<void> {
    await this.iosService.configureSshAccess(
      device, domainName, username, password, options
    );
  }

  async configureAccessListStandard(
    device: string,
    aclNumber: number,
    entries: string[],
    options?: { save?: boolean }
  ): Promise<void> {
    await this.iosService.configureAccessListStandard(
      device, aclNumber, entries, options
    );
  }

  async resolveCapabilities(device: string): Promise<DeviceCapabilities> {
    return this.iosService.resolveCapabilities(device);
  }

  async listCanvasRects(): Promise<{ rects: string[]; count: number }> {
    return this.canvasService.listCanvasRects();
  }

  async getRect(rectId: string): Promise<unknown> {
    return this.canvasService.getRect(rectId);
  }

  async devicesInRect(
    rectId: string,
    includeClusters = false
  ): Promise<DevicesInRectResult> {
    return this.canvasService.devicesInRect(rectId, includeClusters);
  }

  async snapshot(): Promise<TopologySnapshot> {
    const snapshot = await this.topologyService.snapshot();
    if (snapshot) {
      this._snapshot = snapshot;
      this._twin = topologySnapshotToNetworkTwin(snapshot);
      return snapshot;
    }

    if (this.topologyCache.isMaterialized()) {
      const cachedSnapshot = this.topologyCache.getSnapshot();
      this._snapshot = cachedSnapshot;
      this._twin = topologySnapshotToNetworkTwin(cachedSnapshot);
      return cachedSnapshot;
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

  on<E extends PTEventType>(eventType: E, handler: (event: PTEvent) => void): this {
    this.bridge.on(eventType, handler);
    return this;
  }

  onAll(handler: (event: PTEvent) => void): this {
    this.bridge.onAll(handler);
    return this;
  }

  async loadRuntime(code: string): Promise<void> {
    return this.bridge.loadRuntime(code);
  }

  async loadRuntimeFromFile(filePath: string): Promise<void> {
    return this.bridge.loadRuntimeFromFile(filePath);
  }

  getCachedSnapshot(): TopologySnapshot | null {
    if (this.topologyCache.isMaterialized()) {
      return this.topologyCache.getSnapshot();
    }

    return this._snapshot;
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

  getContextSummary(): {
    bridgeReady: boolean;
    topologyMaterialized: boolean;
    deviceCount: number;
    linkCount: number;
  } {
    const bridgeReady = this.bridge.isReady();
    const snapshot = this.topologyCache.getSnapshot();
    const deviceCount = snapshot.devices ? Object.keys(snapshot.devices).length : 0;
    const linkCount = snapshot.links ? Object.keys(snapshot.links).length : 0;
    const topologyMaterialized = this.topologyCache.isMaterialized();
    return { bridgeReady, topologyMaterialized, deviceCount, linkCount };
  }

  async getHealthSummary(): Promise<{
    bridgeReady: boolean;
    topologyHealth: string;
    heartbeatState: 'ok' | 'stale' | 'missing' | 'unknown';
    warnings: string[];
  }> {
    const bridgeReady = this.bridge.isReady();
    const snapshot = this.topologyCache.getSnapshot();
    const topologyMaterialized = this.topologyCache.isMaterialized();
    
    let topologyHealth = 'unknown';
    if (!topologyMaterialized) {
      topologyHealth = 'warming';
    } else {
      const deviceCount = snapshot?.devices ? Object.keys(snapshot.devices).length : 0;
      topologyHealth = deviceCount > 0 ? 'healthy' : 'warming';
    }
    
    const hbHealth = this.bridge.getHeartbeatHealth();
    const warnings: string[] = [];
    
    if (hbHealth.state === 'stale') {
      warnings.push('Heartbeat stale - PT podría no estar respondiendo');
    } else if (hbHealth.state === 'missing') {
      warnings.push('Heartbeat missing - PT probablemente no está disponible');
    }
    
    if (!bridgeReady) {
      warnings.push('Bridge no está listo');
    }
    
    return {
      bridgeReady,
      topologyHealth,
      heartbeatState: hbHealth.state,
      warnings,
    };
  }

  // --- Bridge/Context helpers (Phase 5 additions)
  getHeartbeat<T = unknown>(): T | null {
    return this.bridge.getHeartbeat<T>();
  }

  getHeartbeatHealth(): {
    state: "ok" | "stale" | "missing" | "unknown";
    ageMs?: number;
    lastSeenTs?: number;
  } {
    return this.bridge.getHeartbeatHealth();
  }

  getBridgeStatus(): {
    ready: boolean;
    leaseValid?: boolean;
    queuedCount?: number;
    inFlightCount?: number;
    warnings?: string[];
  } {
    return this.bridge.getBridgeStatus();
  }

  /**
   * getSystemContext(): aggregated system context meant to be the single source of truth
   * for CLI commands like `status` and `doctor`.
   */
  getSystemContext(): {
    bridgeReady: boolean;
    topologyMaterialized: boolean;
    deviceCount: number;
    linkCount: number;
    heartbeat: {
      state: "ok" | "stale" | "missing" | "unknown";
      ageMs?: number;
      lastSeenTs?: number;
    };
    warnings: string[];
  } {
    const bridgeReady = this.bridge.isReady();
    const snapshot = this.topologyCache.getSnapshot();
    const deviceCount = snapshot?.devices ? Object.keys(snapshot.devices).length : 0;
    const linkCount = snapshot?.links ? Object.keys(snapshot.links).length : 0;
    const topologyMaterialized = this.topologyCache.isMaterialized();
    const hb = this.bridge.getHeartbeatHealth();
    const bridgeStatus = this.bridge.getBridgeStatus();
    const warnings: string[] = [];

    if (hb.state === 'stale') warnings.push('Heartbeat stale - PT podría no estar respondiendo');
    if (hb.state === 'missing') warnings.push('Heartbeat missing - PT probablemente no está disponible');
    if (!bridgeStatus.ready) warnings.push('Bridge no está listo');
    // surface bridge-level warnings if present
    if (bridgeStatus.warnings && bridgeStatus.warnings.length) warnings.push(...bridgeStatus.warnings);

    return {
      bridgeReady,
      topologyMaterialized,
      deviceCount,
      linkCount,
      heartbeat: hb,
      warnings,
    };
  }
}

export function createPTController(config: PTControllerConfig): PTController {
  return new PTController(config);
}

function getDefaultDevDir(): string {
  if (process.env.PT_DEV_DIR) {
    return process.env.PT_DEV_DIR;
  }
  const home = homedir();
  if (platform() === 'win32') {
    return resolve(process.env.USERPROFILE || home, 'pt-dev');
  }
  return resolve(home, 'pt-dev');
}

const DEFAULT_DEV_DIR = getDefaultDevDir();

export function createDefaultPTController(): PTController {
  return new PTController({ devDir: DEFAULT_DEV_DIR });
}
