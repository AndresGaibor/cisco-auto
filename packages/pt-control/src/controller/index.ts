import { createHostPingPlan, createHostCommandPlan } from "../pt/terminal/standard-terminal-plans.js";
import { parseHostPing, parseTerminalOutput } from "../pt/terminal/terminal-output-parsers.js";
import { verifyTerminalEvidence, type TerminalEvidenceVerdict } from "../pt/terminal/terminal-evidence-verifier.js";
import type { FileBridgePort } from "../application/ports/file-bridge.port.js";
import type {
  PTEvent,
  PTEventType,
  TopologySnapshot,
  DeviceState,
  LinkState,
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
import { createControlComposition, type ControlCompositionConfig } from "../application/bootstrap/control-composition.js";
import { FileBridgeV2 } from "@cisco-auto/file-bridge";
import { homedir } from "node:os";
import { join } from "node:path";
import { TopologyController } from "./topology-controller.js";
import { IosController } from "./ios-controller.js";
import { SnapshotController } from "./snapshot-controller.js";
import { RuntimeController } from "./runtime-controller.js";

/**
 * Entrada de trace de comando - campos verificados del código.
 *
 * Usado para trazabilidad de comandos ejecutados en el bridge.
 */
export interface CommandTraceEntry {
  id: string;
  type: string;
  completedAt: number;
  ok?: boolean;
  ts?: number;
  status?: string;
  commandType?: string;
}

/**
 * PTController - Punto de entrada principal para controlar Packet Tracer.
 *
 * Provee una API unificada de alto nivel para interactuar con dispositivos PT:
 * - Gestión de topología (addDevice, removeDevice, addLink, etc.)
 * - Ejecución de comandos IOS (show, configIos, execInteractive)
 * - Servicios de contexto y salud del sistema
 * - Acceso a servicios de omnisciencia (lectura profunda de PT)
 *
 * Internamente delega a sub-controladores especializados:
 * - TopologyController: gestión de dispositivos y enlaces
 * - IosController: ejecución de comandos IOS
 * - SnapshotController: snapshots y cache de topología
 * - RuntimeController: gestión del runtime y diagnósticos
 *
 * @example
 * ```typescript
 * const controller = createPTController({ devDir: "~/pt-dev" });
 * await controller.start();
 *
 * // Añadir dispositivo
 * const device = await controller.addDevice("R1", "2911", { x: 100, y: 200 });
 *
 * // Ejecutar comando show
 * const brief = await controller.showIpInterfaceBrief("R1");
 *
 * // Aplicar configuración
 * await controller.configIos("R1", [
 *   "interface GigabitEthernet0/0",
 *   "ip address 192.168.1.1 255.255.255.0"
 * ]);
 * ```
 */
export class PTController {
  private readonly _composition: ControlComposition;
  private readonly _topologyController: TopologyController;
  private readonly _iosController: IosController;
  private readonly _snapshotController: SnapshotController;
  private readonly _runtimeController: RuntimeController;

  constructor(composition: ControlComposition) {
    this._composition = composition;

    this._topologyController = new TopologyController(
      composition.topologyFacade,
      composition.deviceService,
    );

    this._iosController = new IosController(
      composition.controllerIosService,
      composition.deviceService,
    );

    this._snapshotController = new SnapshotController(
      composition.snapshotService,
      composition.bridgeService,
    );

    this._runtimeController = new RuntimeController(
      composition.bridgeService,
      composition.primitivePort,
      composition.contextService,
    );
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
    return this._topologyController.addDevice(name, model, options);
  }

  async removeDevice(name: string): Promise<void> {
    await this._topologyController.removeDevice(name);
  }

  async renameDevice(oldName: string, newName: string): Promise<void> {
    await this._topologyController.renameDevice(oldName, newName);
  }

  async moveDevice(
    name: string,
    x: number,
    y: number,
  ): Promise<
    { ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }
  > {
    return this._topologyController.moveDevice(name, x, y);
  }

  async listDevices(filter?: string | number | string[]): Promise<import("../contracts/index.js").DeviceListResult> {
    return this._topologyController.listDevices(filter);
  }

  async inspectDevice(name: string, includeXml = false): Promise<DeviceState> {
    return this._topologyController.inspectDevice(name, includeXml);
  }

  async addModule(device: string, slot: number, module: string): Promise<void> {
    await this._topologyController.addModule(device, slot, module);
  }

  async removeModule(device: string, slot: number): Promise<void> {
    await this._topologyController.removeModule(device, slot);
  }

  async addLink(
    device1: string | { endpointA: { device: string; port: string }; endpointB: { device: string; port: string }; type?: string },
    port1?: string,
    device2?: string,
    port2?: string,
    linkType: AddLinkPayload["cableType"] = "auto",
  ): Promise<LinkState> {
    return this._topologyController.addLink(device1, port1, device2, port2, linkType);
  }

  async removeLink(device: string, port: string): Promise<void> {
    await this._topologyController.removeLink(device, port);
  }

  async clearTopology(): Promise<{
    removedDevices: number;
    removedLinks: number;
    remainingDevices: number;
    remainingLinks: number;
  }> {
    return this._topologyController.clearTopology();
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
    return this._composition.deviceService.configHost(device, options);
  }

  async configureDhcpServer(
    device: string,
    options: {
      enabled: boolean;
      port?: string;
      pools: Array<{
        name: string;
        network: string;
        mask: string;
        defaultRouter: string;
        dns?: string;
        startIp?: string;
        endIp?: string;
        maxUsers?: number;
      }>;
      excluded?: Array<{ start: string; end: string }>;
    },
  ): Promise<void> {
    return this._composition.deviceService.configureDhcpServer(device, options);
  }

  async inspectDhcpServer(device: string, port?: string) {
    return this._composition.deviceService.inspectDhcpServer(device, port);
  }

  async execHost(
    device: string, 
    command: string, 
    capabilityId: string, 
    options?: { timeoutMs?: number }
  ): Promise<{ success: boolean; raw: string; verdict: TerminalEvidenceVerdict; parsed: any }> {
    const timeoutMs = options?.timeoutMs ?? 30000;
    
    const execute = async () => {
      const plan = createHostCommandPlan(device, command, { timeout: timeoutMs });
      const result = await this.runTerminalPlan(plan, { timeoutMs });
      const raw = result.output;
      const parsed = parseTerminalOutput(capabilityId, raw);
      const verdict = verifyTerminalEvidence(capabilityId, raw, parsed, result.status);
      return { raw, parsed, verdict, result };
    };

    let { raw, parsed, verdict, result } = await execute();

    if (!verdict.ok && raw.trim().length === 0) {
       try {
           await this.runTerminalPlan(createHostCommandPlan(device, "", { timeout: 2000 }), { timeoutMs: 2500 });
       } catch(e) {
       }
       ({ raw, parsed, verdict, result } = await execute());
    }

    return {
      success: verdict.ok,
      raw: raw || (verdict.reason ?? "Sin salida"),
      verdict,
      parsed
    };
  }

  async getHostHistory(device: string): Promise<{ entries: Array<{ command: string; output: string; timestamp?: number }>; count: number; raw: string; methods?: string[] }> {
    const result = await this.runPrimitive("readTerminal", { device });
    const data = (result as any).value || {};
    const raw = data.raw || "";
    const methods = data.methods || [];
    const historyFromSession = data.history || [];
    
    if (historyFromSession.length > 0) {
      return {
        entries: historyFromSession,
        count: historyFromSession.length,
        raw,
        methods
      };
    }

    const parsed = parseTerminalOutput("host.history", raw);

    return {
      entries: (parsed?.facts.entries as any[]) ?? [],
      count: Number(parsed?.facts.count ?? 0),
      raw,
      methods
    };
  }

  async sendPing(device: string, target: string, timeoutMs = 30000): Promise<{ 
    success: boolean; 
    raw: string; 
    stats?: { sent: number; received: number; lost: number; lossPercent: number } 
  }> {
    const result = await this.execHost(device, `ping ${target}`, "host.ping", { timeoutMs });
    
    const raw = result.raw;
    const statsIndex = raw.lastIndexOf("Ping statistics");
    const relevantRaw = statsIndex !== -1 ? raw.slice(statsIndex) : raw;
    
    return {
      success: result.success,
      raw: relevantRaw,
      stats: result.parsed?.facts ? {
        sent: Number(result.parsed.facts.sent ?? 0),
        received: Number(result.parsed.facts.received ?? 0),
        lost: Number(result.parsed.facts.lost ?? 0),
        lossPercent: Number(result.parsed.facts.lossPercent ?? 100),
      } : undefined
    };
  }

  async getHostIpconfig(device: string, timeoutMs = 15000) {
    return this.execHost(device, "ipconfig /all", "host.ipconfig", { timeoutMs });
  }

  async getHostArp(device: string, timeoutMs = 15000) {
    return this.execHost(device, "arp -a", "host.arp", { timeoutMs });
  }

  async getHostTracert(device: string, target: string, timeoutMs = 60000) {
    return this.execHost(device, `tracert ${target}`, "host.tracert", { timeoutMs });
  }

  async getHostNslookup(device: string, target: string, timeoutMs = 20000) {
    return this.execHost(device, `nslookup ${target}`, "host.nslookup", { timeoutMs });
  }

  async getHostNetstat(device: string, timeoutMs = 15000) {
    return this.execHost(device, "netstat", "host.netstat", { timeoutMs });
  }

  async getHostRoute(device: string, timeoutMs = 15000) {
    return this.execHost(device, "route print", "host.route", { timeoutMs });
  }

  async getHostTelnet(device: string, target: string, timeoutMs = 20000) {
    return this.execHost(device, `telnet ${target}`, "host.telnet", { timeoutMs });
  }

  async getHostSsh(device: string, user: string, target: string, timeoutMs = 20000) {
    return this.execHost(device, `ssh -l ${user} ${target}`, "host.ssh", { timeoutMs });
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
    return this._snapshotController.snapshot();
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

  async configIos(device: string, commands: string[], options?: { save?: boolean }): Promise<void> {
    return this._iosController.configIos(device, commands, options);
  }

  async execIos<T = any>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000,
  ): Promise<any> {
    return this._iosController.execIos<T>(device, command, parse, timeout);
  }

  async execInteractive(
    device: string,
    command: string,
    options?: { timeout?: number; parse?: boolean; ensurePrivileged?: boolean },
  ): Promise<any> {
    return this._iosController.execInteractive(device, command, options);
  }

  async execIosWithEvidence<T = any>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000,
  ): Promise<any> {
    return this._iosController.execIosWithEvidence<T>(device, command, parse, timeout);
  }

  async configIosWithResult(
    device: string,
    commands: string[],
    options?: { save?: boolean },
  ): Promise<any> {
    return this._iosController.configIosWithResult(device, commands, options);
  }

  async show(device: string, command: string): Promise<any> {
    return this._iosController.show(device, command);
  }

  async showParsed<T = any>(
    device: string,
    command: string,
    options?: { ensurePrivileged?: boolean; timeout?: number },
  ): Promise<any> {
    return this._iosController.showParsed<T>(device, command, options);
  }

  async showIpInterfaceBrief(device: string): Promise<any> {
    return this._iosController.showIpInterfaceBrief(device);
  }

  async showVlan(device: string): Promise<any> {
    return this._iosController.showVlan(device);
  }

  async showIpRoute(device: string): Promise<any> {
    return this._iosController.showIpRoute(device);
  }

  async showRunningConfig(device: string): Promise<any> {
    return this._iosController.showRunningConfig(device);
  }

  async showMacAddressTable(device: string): Promise<any> {
    return this._iosController.showMacAddressTable(device);
  }

  async showCdpNeighbors(device: string): Promise<any> {
    return this._iosController.showCdpNeighbors(device);
  }

  async getConfidence(
    device: string,
    evidence: IosExecutionEvidence,
    verificationCheck?: string,
  ): Promise<any> {
    return this._iosController.getConfidence(device, evidence, verificationCheck);
  }

  async resolveCapabilities(device: string): Promise<any> {
    return this._iosController.resolveCapabilities(device);
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
    return this._snapshotController.loadRuntime(code);
  }

  async loadRuntimeFromFile(filePath: string): Promise<void> {
    return this._snapshotController.loadRuntimeFromFile(filePath);
  }

  getCachedSnapshot(): TopologySnapshot | null {
    return this._snapshotController.getCachedSnapshot();
  }

  getTwin(): NetworkTwin | null {
    return this._snapshotController.getTwin();
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
    return this._runtimeController.getContextSummary();
  }

  async getHealthSummary(): Promise<{
    bridgeReady: boolean;
    topologyHealth: string;
    heartbeatState: "ok" | "stale" | "missing" | "unknown";
    warnings: string[];
  }> {
    return this._runtimeController.getHealthSummary();
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
    return this._runtimeController.getBridgeStatus();
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

function getDefaultDevDir(): string {
  const home = homedir();
  const isWindows = process.platform === "win32";
  if (isWindows) {
    return process.env.PT_DEV_DIR ?? join(home, "pt-dev");
  }
  return process.env.PT_DEV_DIR ?? join(home, "pt-dev");
}

export interface PTControllerConfig {
  devDir?: string;
  resultTimeoutMs?: number;
}

export function createPTController(config?: PTControllerConfig | ControlComposition): PTController {
  if (config === undefined) {
    const devDir = getDefaultDevDir();
    const bridge = new FileBridgeV2({ root: devDir, resultTimeoutMs: 10_000 });
    const composition = createControlComposition({ bridge });
    return new PTController(composition);
  }
  if (typeof config === "object" && "devDir" in config) {
    const devDir = config.devDir ?? getDefaultDevDir();
    const bridge = new FileBridgeV2({
      root: devDir,
      resultTimeoutMs: config.resultTimeoutMs ?? 10_000,
    });
    const composition = createControlComposition({ bridge });
    return new PTController(composition);
  }
  return new PTController(config as ControlComposition);
}

export function createDefaultPTController(): PTController {
  return createPTController({ devDir: getDefaultDevDir() });
}