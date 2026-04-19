import type { FileBridgePort } from "../application/ports/file-bridge.port.js";
import type {
  PTEvent,
  PTEventType,
  TopologySnapshot,
  DeviceState,
  LinkState,
  DeviceListResult,
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

  async runPrimitive(
    id: string,
    payload: unknown,
    options?: import("../ports/runtime-primitive-port.js").PrimitivePortOptions,
  ): Promise<import("../ports/runtime-primitive-port.js").PrimitivePortResult> {
    return this._composition.primitivePort.runPrimitive(id, payload, options);
  }

  async runTerminalPlan(
    plan: import("../ports/runtime-terminal-port.js").TerminalPlan,
    options?: import("../ports/runtime-terminal-port.js").TerminalPortOptions,
  ): Promise<import("../ports/runtime-terminal-port.js").TerminalPortResult> {
    return this._composition.terminalPort.runTerminalPlan(plan, options);
  }

  async ensureTerminalSession(
    device: string,
  ): Promise<import("../ports/runtime-terminal-port.js").SessionResult> {
    return this._composition.terminalPort.ensureSession(device);
  }

  async runOmniCapability(
    id: string,
    payload: unknown,
    options?: import("../ports/runtime-omni-port.js").OmniPortOptions,
  ): Promise<import("../ports/runtime-omni-port.js").OmniPortResult> {
    return this._composition.omniPort.runOmniCapability(id, payload, options);
  }

  /**
   * @deprecated Usar runPrimitive(), runTerminalPlan() o runOmniCapability().
   */
  async send(_type: string, _payload: Record<string, any>): Promise<any> {
    throw new Error(
      "PTController.send() está deprecated. Usa runPrimitive(), runTerminalPlan() o runOmniCapability().",
    );
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
