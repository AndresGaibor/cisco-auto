import { FileBridgeV2 } from "@cisco-auto/file-bridge";
import { TopologyCache } from "../infrastructure/pt/topology-cache.js";
import type { FileBridgePort } from "../application/ports/file-bridge.port.js";
import { homedir, platform } from "node:os";
import { resolve } from "node:path";
import type {
  PTEvent,
  PTEventType,
  PTEventTypeMap,
  TopologySnapshot,
  DeviceState,
  LinkState,
  DeviceListResult,
  ShowIpInterfaceBrief,
  ShowVlan,
  ShowIpRoute,
  ShowRunningConfig,
  ShowMacAddressTable,
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
import { ControllerContextService } from "./context-service.js";
import { SnapshotService } from "./snapshot-service.js";
import { CommandTraceService } from "./command-trace-service.js";
import { ControllerIosService } from "./ios-service.js";
import { BridgeService } from "./bridge-service.js";
import { ControllerCanvasService } from "./canvas-service.js";
import { ControllerTopologyService } from "./topology-service.js";

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
  private readonly contextService: ControllerContextService;
  private readonly snapshotService: SnapshotService;
  private readonly commandTraceService: CommandTraceService;
  private readonly controllerIosService: ControllerIosService;
  private readonly bridgeService: BridgeService;
  private readonly canvasFacade: ControllerCanvasService;
  private readonly topologyFacade: ControllerTopologyService;

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

    this.topologyCache = new TopologyCache(this.bridge);

    const generateId = () => `ctrl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    this.topologyService = new TopologyService(this.bridge, this.topologyCache, generateId);
    this.deviceService = new DeviceService(this.bridge, this.topologyCache, generateId);
    this.canvasService = new CanvasService(this.bridge, generateId);
    this.contextService = new ControllerContextService(this.bridge, this.topologyCache);
    this.snapshotService = new SnapshotService(this.topologyService, this.topologyCache);
    this.commandTraceService = new CommandTraceService(this.bridge);

    this.iosService = new IosService(this.bridge, generateId, (d) => this.deviceService.inspect(d));

    this.controllerIosService = new ControllerIosService(this.iosService, this.deviceService);
    this.bridgeService = new BridgeService(this.bridge, this.topologyCache);
    this.canvasFacade = new ControllerCanvasService(this.canvasService);
    this.topologyFacade = new ControllerTopologyService(this.topologyService, this.deviceService);
  }

  async start(): Promise<void> {
    this.bridgeService.start();
  }

  async stop(): Promise<void> {
    await this.bridgeService.stop();
  }

  getBridge(): FileBridgePort {
    return this.bridgeService.getBridge();
  }

  getTopologyCache(): TopologyCache {
    return this.bridgeService.getTopologyCache();
  }

  drainCommandTrace(): CommandTraceEntry[] {
    return this.commandTraceService.drainCommandTrace();
  }

  async addDevice(
    name: string,
    model: string,
    options?: { x?: number; y?: number },
  ): Promise<DeviceState> {
    return this.topologyFacade.addDevice(name, model, options);
  }

  async removeDevice(name: string): Promise<void> {
    await this.topologyFacade.removeDevice(name);
  }

  async renameDevice(oldName: string, newName: string): Promise<void> {
    await this.topologyFacade.renameDevice(oldName, newName);
  }

  async moveDevice(
    name: string,
    x: number,
    y: number,
  ): Promise<
    { ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }
  > {
    return this.topologyFacade.moveDevice(name, x, y);
  }

  async listDevices(filter?: string | number | string[]): Promise<DeviceListResult> {
    return this.topologyFacade.listDevices(filter);
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
    linkType: AddLinkPayload["linkType"] = "auto",
  ): Promise<LinkState> {
    return this.topologyFacade.addLink(device1, port1, device2, port2, linkType);
  }

  async removeLink(device: string, port: string): Promise<void> {
    await this.topologyFacade.removeLink(device, port);
  }

  async clearTopology(): Promise<{
    removedDevices: number;
    removedLinks: number;
    remainingDevices: number;
    remainingLinks: number;
  }> {
    return this.topologyFacade.clearTopology();
  }

  async configHost(
    device: string,
    options: {
      ip?: string;
      mask?: string;
      gateway?: string;
      dns?: string;
      dhcp?: boolean;
    },
  ): Promise<void> {
    await this.topologyFacade.configHost(device, options);
  }

  async inspectHost(device: string): Promise<DeviceState> {
    const deviceState = await this.deviceService.inspect(device);
    if (deviceState.type !== "pc" && deviceState.type !== "server") {
      throw new Error(
        `Dispositivo '${device}' no es un host (PC/Server-PT). Tipo: ${deviceState.type}`,
      );
    }
    return deviceState;
  }

  async configIos(device: string, commands: string[], options?: { save?: boolean }): Promise<void> {
    await this.controllerIosService.configIos(device, commands, options);
  }

  async execIos<T = ParsedOutput>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000,
  ): Promise<{ raw: string; parsed?: T }> {
    return this.controllerIosService.execIos<T>(device, command, parse, timeout);
  }

  async show(device: string, command: string): Promise<ParsedOutput> {
    return this.controllerIosService.show(device, command);
  }

  async showIpInterfaceBrief(device: string): Promise<ShowIpInterfaceBrief> {
    return this.controllerIosService.showIpInterfaceBrief(device);
  }

  async showVlan(device: string): Promise<ShowVlan> {
    return this.controllerIosService.showVlan(device);
  }

  async showIpRoute(device: string): Promise<ShowIpRoute> {
    return this.controllerIosService.showIpRoute(device);
  }

  async showRunningConfig(device: string): Promise<ShowRunningConfig> {
    return this.controllerIosService.showRunningConfig(device);
  }

  async showMacAddressTable(device: string): Promise<ShowMacAddressTable> {
    return this.controllerIosService.showMacAddressTable(device);
  }

  async showCdpNeighbors(device: string): Promise<ShowCdpNeighbors> {
    return this.controllerIosService.showCdpNeighbors(device);
  }

  async execInteractive(
    device: string,
    command: string,
    options?: {
      timeout?: number;
      parse?: boolean;
      ensurePrivileged?: boolean;
    },
  ): Promise<{ raw: string; parsed?: ParsedOutput; session?: { mode: string } }> {
    return this.controllerIosService.execInteractive(device, command, options);
  }

  async execIosWithEvidence<T = ParsedOutput>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000,
  ): Promise<IosExecutionSuccess<T>> {
    return this.controllerIosService.execIosWithEvidence<T>(device, command, parse, timeout);
  }

  async configIosWithResult(
    device: string,
    commands: string[],
    options?: { save?: boolean } | undefined,
  ): Promise<IosConfigApplyResult> {
    return this.controllerIosService.configIosWithResult(device, commands, options);
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
    },
  ): Promise<void> {
    await this.controllerIosService.configureDhcpServer(device, options);
  }

  async inspectDhcpServer(device: string): Promise<{
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
    return this.controllerIosService.inspectDhcpServer(device);
  }

  async showParsed<T = ParsedOutput>(
    device: string,
    command: string,
    options?: { ensurePrivileged?: boolean; timeout?: number },
  ): Promise<IosExecutionSuccess<T>> {
    return this.controllerIosService.showParsed<T>(device, command, options);
  }

  async getIosConfidence(
    device: string,
    evidence: { source: string; status?: number; mode?: string },
    verificationCheck?: string,
  ): Promise<IosConfidence> {
    return this.controllerIosService.getIosConfidence(device, evidence, verificationCheck);
  }

  async configureDhcpPool(
    device: string,
    poolName: string,
    network: string,
    mask: string,
    defaultRouter: string,
    dnsServer?: string,
    options?: { save?: boolean },
  ): Promise<void> {
    await this.controllerIosService.configureDhcpPool(
      device,
      poolName,
      network,
      mask,
      defaultRouter,
      dnsServer,
      options,
    );
  }

  async configureOspfNetwork(
    device: string,
    processId: number,
    network: string,
    wildcard: string,
    area: number,
    options?: { save?: boolean },
  ): Promise<void> {
    await this.controllerIosService.configureOspfNetwork(
      device,
      processId,
      network,
      wildcard,
      area,
      options,
    );
  }

  async configureSshAccess(
    device: string,
    domainName: string,
    username: string,
    password: string,
    options?: { save?: boolean },
  ): Promise<void> {
    await this.controllerIosService.configureSshAccess(
      device,
      domainName,
      username,
      password,
      options,
    );
  }

  async configureAccessListStandard(
    device: string,
    aclNumber: number,
    entries: string[],
    options?: { save?: boolean },
  ): Promise<void> {
    await this.controllerIosService.configureAccessListStandard(
      device,
      aclNumber,
      entries,
      options,
    );
  }

  async resolveCapabilities(device: string): Promise<DeviceCapabilities> {
    return this.controllerIosService.resolveCapabilities(device);
  }

  async listCanvasRects(): Promise<{ rects: string[]; count: number }> {
    return this.canvasFacade.listCanvasRects();
  }

  async getRect(rectId: string): Promise<unknown> {
    return this.canvasFacade.getRect(rectId);
  }

  async devicesInRect(rectId: string, includeClusters = false): Promise<DevicesInRectResult> {
    return this.canvasFacade.devicesInRect(rectId, includeClusters);
  }

  async snapshot(): Promise<TopologySnapshot> {
    return this.snapshotService.snapshot();
  }

  async inspect(device: string, includeXml = false): Promise<DeviceState> {
    return this.controllerIosService.inspect(device, includeXml);
  }

  async hardwareInfo(device: string): Promise<unknown> {
    return this.controllerIosService.hardwareInfo(device);
  }

  async hardwareCatalog(deviceType?: string): Promise<unknown> {
    return this.controllerIosService.hardwareCatalog(deviceType);
  }

  async commandLog(device?: string, limit = 100): Promise<unknown[]> {
    return this.controllerIosService.commandLog(device, limit);
  }

  async deepInspect(path: string, method?: string, args?: any[]): Promise<any> {
    return this.controllerIosService.deepInspect(path, method, args);
  }

  on<E extends PTEventType>(eventType: E, handler: (event: PTEvent) => void): this {
    this.bridgeService.on(eventType, handler);
    return this;
  }

  onAll(handler: (event: PTEvent) => void): this {
    this.bridgeService.onAll(handler);
    return this;
  }

  async loadRuntime(code: string): Promise<void> {
    return this.bridgeService.loadRuntime(code);
  }

  async loadRuntimeFromFile(filePath: string): Promise<void> {
    return this.bridgeService.loadRuntimeFromFile(filePath);
  }

  getCachedSnapshot(): TopologySnapshot | null {
    return this.snapshotService.getCachedSnapshot();
  }

  getTwin(): NetworkTwin | null {
    return this.snapshotService.getTwin();
  }

  readState<T = unknown>(): T | null {
    return this.bridgeService.readState<T>();
  }

  getContextSummary(): {
    bridgeReady: boolean;
    topologyMaterialized: boolean;
    deviceCount: number;
    linkCount: number;
  } {
    return this.contextService.getContextSummary();
  }

  async getHealthSummary(): Promise<{
    bridgeReady: boolean;
    topologyHealth: string;
    heartbeatState: "ok" | "stale" | "missing" | "unknown";
    warnings: string[];
  }> {
    return this.contextService.getHealthSummary();
  }

  // --- Bridge/Context helpers (Phase 5 additions)
  getHeartbeat<T = unknown>(): T | null {
    return this.contextService.getHeartbeat<T>();
  }

  getHeartbeatHealth(): {
    state: "ok" | "stale" | "missing" | "unknown";
    ageMs?: number;
    lastSeenTs?: number;
  } {
    return this.contextService.getHeartbeatHealth();
  }

  getBridgeStatus(): {
    ready: boolean;
    queuedCount?: number;
    inFlightCount?: number;
    warnings?: string[];
  } {
    return this.contextService.getBridgeStatus();
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
    return this.contextService.getSystemContext();
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
  if (platform() === "win32") {
    return resolve(process.env.USERPROFILE || home, "pt-dev");
  }
  return resolve(home, "pt-dev");
}

const DEFAULT_DEV_DIR = getDefaultDevDir();

export function createDefaultPTController(): PTController {
  return new PTController({ devDir: DEFAULT_DEV_DIR });
}
