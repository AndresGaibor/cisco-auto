import type { FileBridgePort } from "../application/ports/file-bridge.port.js";
import type {
  PTEvent,
  PTEventType,
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
  IosExecutionEvidence,
} from "../contracts/ios-execution-evidence.js";
import type { DeviceCapabilities } from "../domain/ios/capabilities/pt-capability-resolver.js";
import { TopologyCache } from "../infrastructure/pt/topology-cache.js";
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
import { OmniscienceService } from "../application/services/omniscience-service.js";
import { LabService } from "../application/services/lab-service.js";
import type { ControlComposition } from "../application/bootstrap/control-composition.js";

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
  private readonly _composition: ControlComposition;

  constructor(composition: ControlComposition) {
    this._composition = composition;
  }

  public get omniscience() {
    return this._composition.omniscience;
  }

  public get labService() {
    return this._composition.labService;
  }

  async start(): Promise<void> {
    this._composition.bridgeService.start();
  }

  async stop(): Promise<void> {
    await this._composition.bridgeService.stop();
  }

  getBridge(): FileBridgePort {
    return this._composition.bridgeService.getBridge();
  }

  getTopologyCache(): TopologyCache {
    return this._composition.bridgeService.getTopologyCache();
  }

  drainCommandTrace(): CommandTraceEntry[] {
    return this._composition.commandTraceService.drainCommandTrace();
  }

  async addDevice(
    name: string,
    model: string,
    options?: { x?: number; y?: number },
  ): Promise<DeviceState> {
    return this._composition.topologyFacade.addDevice(name, model, options);
  }

  async removeDevice(name: string): Promise<void> {
    await this._composition.topologyFacade.removeDevice(name);
  }

  async renameDevice(oldName: string, newName: string): Promise<void> {
    await this._composition.topologyFacade.renameDevice(oldName, newName);
  }

  async moveDevice(
    name: string,
    x: number,
    y: number,
  ): Promise<
    { ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }
  > {
    return this._composition.topologyFacade.moveDevice(name, x, y);
  }

  async listDevices(filter?: string | number | string[]): Promise<DeviceListResult> {
    return this._composition.topologyFacade.listDevices(filter);
  }

  async inspectDevice(name: string, includeXml = false): Promise<DeviceState> {
    return this._composition.deviceService.inspect(name, includeXml);
  }

  async addModule(device: string, slot: number, module: string): Promise<void> {
    await this._composition.deviceService.addModule(device, slot, module);
  }

  async removeModule(device: string, slot: number): Promise<void> {
    await this._composition.deviceService.removeModule(device, slot);
  }

  async addLink(
    device1: string,
    port1: string,
    device2: string,
    port2: string,
    linkType: AddLinkPayload["linkType"] = "auto",
  ): Promise<LinkState> {
    return this._composition.topologyFacade.addLink(device1, port1, device2, port2, linkType);
  }

  async removeLink(device: string, port: string): Promise<void> {
    await this._composition.topologyFacade.removeLink(device, port);
  }

  async clearTopology(): Promise<{
    removedDevices: number;
    removedLinks: number;
    remainingDevices: number;
    remainingLinks: number;
  }> {
    return this._composition.topologyFacade.clearTopology();
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
    await this._composition.topologyFacade.configHost(device, options);
  }

  async inspectHost(device: string): Promise<DeviceState> {
    const deviceState = await this._composition.deviceService.inspect(device);
    if (deviceState.type !== "pc" && deviceState.type !== "server") {
      throw new Error(
        `Dispositivo '${device}' no es un host (PC/Server-PT). Tipo: ${deviceState.type}`,
      );
    }
    return deviceState;
  }

  async configIos(device: string, commands: string[], options?: { save?: boolean }): Promise<void> {
    await this._composition.iosService.configIos(device, commands, options).then(() => undefined);
  }

  async execIos<T = ParsedOutput>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000,
  ): Promise<{ raw: string; parsed?: T }> {
    return this._composition.iosService.execIos<T>(device, command, parse, timeout);
  }

  async show(device: string, command: string): Promise<ParsedOutput> {
    return this._composition.iosService.show(device, command);
  }

  async showIpInterfaceBrief(device: string): Promise<ShowIpInterfaceBrief> {
    return this._composition.iosService.showIpInterfaceBrief(device);
  }

  async showVlan(device: string): Promise<ShowVlan> {
    return this._composition.iosService.showVlan(device);
  }

  async showIpRoute(device: string): Promise<ShowIpRoute> {
    return this._composition.iosService.showIpRoute(device);
  }

  async showRunningConfig(device: string): Promise<ShowRunningConfig> {
    return this._composition.iosService.showRunningConfig(device);
  }

  async showMacAddressTable(device: string): Promise<ShowMacAddressTable> {
    return this._composition.iosService.show(device, "show mac address-table") as Promise<ShowMacAddressTable>;
  }

  async showCdpNeighbors(device: string): Promise<ShowCdpNeighbors> {
    return this._composition.iosService.showCdpNeighbors(device);
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
    return this._composition.iosService.execInteractive(device, command, options);
  }

  async execIosWithEvidence<T = ParsedOutput>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000,
  ): Promise<IosExecutionSuccess<T>> {
    return this._composition.iosService.execIos<T>(device, command, parse, timeout);
  }

  async configIosWithResult(
    device: string,
    commands: string[],
    options?: { save?: boolean } | undefined,
  ): Promise<IosConfigApplyResult> {
    return this._composition.iosService.configIos(device, commands, options);
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
    return this._composition.controllerIosService.configureDhcpServer(device, options);
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
    return this._composition.controllerIosService.inspectDhcpServer(device);
  }

  async showParsed<T = ParsedOutput>(
    device: string,
    command: string,
    options?: { ensurePrivileged?: boolean; timeout?: number },
  ): Promise<IosExecutionSuccess<T>> {
    return this._composition.iosService.showParsed<T>(device, command, options);
  }

  async getIosConfidence(
    device: string,
    evidence: { source: string; status?: number; mode?: string },
    verificationCheck?: string,
  ): Promise<IosConfidence> {
    return this._composition.iosService.getConfidence(
      device,
      evidence as IosExecutionEvidence,
      verificationCheck,
    );
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
    await this._composition.iosService.configureDhcpPool(
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
    await this._composition.iosService.configureOspfNetwork(device, processId, network, wildcard, area, options);
  }

  async configureSshAccess(
    device: string,
    domainName: string,
    username: string,
    password: string,
    options?: { save?: boolean },
  ): Promise<void> {
    await this._composition.iosService.configureSshAccess(device, domainName, username, password, options);
  }

  async configureAccessListStandard(
    device: string,
    aclNumber: number,
    entries: string[],
    options?: { save?: boolean },
  ): Promise<void> {
    await this._composition.iosService.configureAccessListStandard(device, aclNumber, entries, options);
  }

  async resolveCapabilities(device: string): Promise<DeviceCapabilities> {
    return this._composition.iosService.resolveCapabilities(device);
  }

  async listCanvasRects(): Promise<{ rects: string[]; count: number }> {
    return this._composition.canvasFacade.listCanvasRects();
  }

  async getRect(rectId: string): Promise<unknown> {
    return this._composition.canvasFacade.getRect(rectId);
  }

  async devicesInRect(rectId: string, includeClusters = false): Promise<DevicesInRectResult> {
    return this._composition.canvasFacade.devicesInRect(rectId, includeClusters);
  }

  async snapshot(): Promise<TopologySnapshot> {
    return this._composition.snapshotService.snapshot();
  }

  async inspect(device: string, includeXml = false): Promise<DeviceState> {
    return this._composition.deviceService.inspect(device, includeXml);
  }

  async hardwareInfo(device: string): Promise<unknown> {
    return this._composition.deviceService.hardwareInfo(device);
  }

  async hardwareCatalog(deviceType?: string): Promise<unknown> {
    return this._composition.deviceService.hardwareCatalog(deviceType);
  }

  async commandLog(device?: string, limit = 100): Promise<unknown[]> {
    return this._composition.deviceService.commandLog(device, limit);
  }

  async deepInspect(path: string, method?: string, args?: any[]): Promise<any> {
    return this._composition.deviceService.deepInspect(path, method, args);
  }

  async send(type: string, payload: Record<string, any>): Promise<any> {
    const result = await (this._composition.bridge as any).sendCommandAndWait(type, payload);
    if (!result.ok) throw result.error || result;
    return result.value;
  }

  on<E extends PTEventType>(eventType: E, handler: (event: PTEvent) => void): this {
    this._composition.bridgeService.on(eventType, handler);
    return this;
  }

  onAll(handler: (event: PTEvent) => void): this {
    this._composition.bridgeService.onAll(handler);
    return this;
  }

  async loadRuntime(code: string): Promise<void> {
    return this._composition.bridgeService.loadRuntime(code);
  }

  async loadRuntimeFromFile(filePath: string): Promise<void> {
    return this._composition.bridgeService.loadRuntimeFromFile(filePath);
  }

  getCachedSnapshot(): TopologySnapshot | null {
    return this._composition.snapshotService.getCachedSnapshot();
  }

  getTwin(): NetworkTwin | null {
    return this._composition.snapshotService.getTwin();
  }

  readState<T = unknown>(): T | null {
    return this._composition.bridgeService.readState<T>();
  }

  getContextSummary(): {
    bridgeReady: boolean;
    topologyMaterialized: boolean;
    deviceCount: number;
    linkCount: number;
  } {
    return this._composition.contextService.getContextSummary();
  }

  async getHealthSummary(): Promise<{
    bridgeReady: boolean;
    topologyHealth: string;
    heartbeatState: "ok" | "stale" | "missing" | "unknown";
    warnings: string[];
  }> {
    return this._composition.contextService.getHealthSummary();
  }

  getHeartbeat<T = unknown>(): T | null {
    return this._composition.contextService.getHeartbeat<T>();
  }

  getHeartbeatHealth(): {
    state: "ok" | "stale" | "missing" | "unknown";
    ageMs?: number;
    lastSeenTs?: number;
  } {
    return this._composition.contextService.getHeartbeatHealth();
  }

  getBridgeStatus(): {
    ready: boolean;
    queuedCount?: number;
    inFlightCount?: number;
    warnings?: string[];
  } {
    return this._composition.contextService.getBridgeStatus();
  }

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
    return this._composition.contextService.getSystemContext();
  }
}

export function createPTController(composition: ControlComposition): PTController {
  return new PTController(composition);
}
