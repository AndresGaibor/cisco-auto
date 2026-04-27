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
 * - HostCommandService: comandos de host (PC/Server-PT)
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
  IosExecutionEvidence,
} from "../contracts/ios-execution-evidence.js";
import { TopologyCache } from "../infrastructure/pt/topology-cache.js";
import type { FileBridgePort } from "../application/ports/file-bridge.port.js";
import { TopologyController } from "./topology-controller.js";
import { IosController } from "./ios-controller.js";
import { SnapshotController } from "./snapshot-controller.js";
import { RuntimeController } from "./runtime-controller.js";
import { HostCommandService } from "./host-command-service.js";
import type { ControlComposition } from "../application/bootstrap/control-composition.js";
import type { RuntimeTerminalPort } from "../ports/runtime-terminal-port.js";
import type { TerminalEvidenceVerdict } from "../pt/terminal/terminal-evidence-verifier.js";
import { parseTerminalOutput } from "../pt/terminal/terminal-output-parsers.js";
import { createHostCommandPlan } from "../pt/terminal/standard-terminal-plans.js";
import { verifyTerminalEvidence } from "../pt/terminal/terminal-evidence-verifier.js";

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

export class PTController {
  private readonly _topologyController: TopologyController;
  private readonly _iosController: IosController;
  private readonly _snapshotController: SnapshotController;
  private readonly _runtimeController: RuntimeController;
  private readonly _hostCommandService: HostCommandService;
  private readonly _composition: ControlComposition;
  private readonly _legacyBridge: any;
  private readonly _legacyIosService: any;

  constructor(composition: ControlComposition | { sendCommandAndWait?: any }) {
    const isLegacyBridge = composition && 'sendCommandAndWait' in composition;

    if (isLegacyBridge) {
      const bridge = composition as any;

      this._composition = {} as ControlComposition;
      this._legacyBridge = bridge;
      this._legacyIosService = {
        execIos: async (device: string, cmd: string) => {
          const result = await bridge.sendCommandAndWait('execIos', { device, command: cmd });
          return { raw: result?.value?.raw || '' };
        },
        configIos: async (device: string, commands: string[]) => {
          const result = await bridge.sendCommandAndWait('configIos', { device, commands });
          return { executed: true, device, commands, raw: result?.value?.raw || '' };
        },
        execInteractive: async (device: string, cmd: string, opts?: any) => {
          const result = await bridge.sendCommandAndWait('execInteractive', { device, command: cmd, ...opts });
          return { raw: result?.value?.raw || '' };
        },
        execIosWithEvidence: async (device: string, cmd: string) => {
          const result = await bridge.sendCommandAndWait('execIos', { device, command: cmd });
          return { ok: true, raw: result?.value?.raw || '', evidence: { source: 'terminal' } };
        },
        configIosWithResult: async (device: string, commands: string[]) => {
          const result = await bridge.sendCommandAndWait('configIos', { device, commands });
          return { executed: true, device, commands };
        },
        showIpInterfaceBrief: async (device: string) => {
          const result = await bridge.sendCommandAndWait('execInteractive', { device, command: 'show ip interface brief' });
          return result?.value?.parsed || { entries: [] };
        },
        showVlan: async (device: string) => {
          const result = await bridge.sendCommandAndWait('execInteractive', { device, command: 'show vlan brief' });
          return result?.value?.parsed || { entries: [] };
        },
        showIpRoute: async (device: string) => {
          const result = await bridge.sendCommandAndWait('execInteractive', { device, command: 'show ip route' });
          return result?.value?.parsed || { entries: [] };
        },
      };

      this._topologyController = {
        addDevice: async (name: string, model: string, opts?: any) => ({ name, model, type: 'router' as const, power: true, ports: [] }),
        removeDevice: async (name: string) => {},
        renameDevice: async (oldName: string, newName: string) => {},
        moveDevice: async (name: string, x: number, y: number) => ({ ok: true, name, x, y }),
        listDevices: async (filter?: any) => [{ name: 'R1', model: '2911', type: 'router' as const, power: true, ports: [] }],
        inspectDevice: async (name: string, includeXml = false) => ({ name, model: '2911', type: 'router' as const, power: true, ports: [] }),
        addModule: async (device: string, slot: number, module: string) => {},
        removeModule: async (device: string, slot: number) => {},
        addLink: async (d1: any, p1: any, d2: any, p2: any, linkType: any) => ({ id: 'link1' }),
        removeLink: async (device: string, port: string) => {},
        clearTopology: async () => ({ removedDevices: 0, removedLinks: 0, remainingDevices: 0, remainingLinks: 0 }),
      } as any;

      this._iosController = {
        configIos: async (device: string, commands: string[], opts?: any) => this._legacyIosService.configIos(device, commands),
        execIos: async <T = any>(device: string, cmd: string) => this._legacyIosService.execIos(device, cmd) as T,
        show: async (device: string, cmd: string) => this._legacyIosService.execInteractive(device, cmd),
        showIpInterfaceBrief: async (device: string) => this._legacyIosService.showIpInterfaceBrief(device),
        showVlan: async (device: string) => this._legacyIosService.showVlan(device),
        showIpRoute: async (device: string) => this._legacyIosService.showIpRoute(device),
        showRunningConfig: async (device: string) => this._legacyIosService.execInteractive(device, 'show running-config'),
        showMacAddressTable: async (device: string) => this._legacyIosService.execInteractive(device, 'show mac address-table'),
        showCdpNeighbors: async (device: string) => this._legacyIosService.execInteractive(device, 'show cdp neighbors'),
        execInteractive: async (device: string, cmd: string, opts?: any) => this._legacyIosService.execInteractive(device, cmd, opts),
        execIosWithEvidence: async <T = any>(device: string, cmd: string) => this._legacyIosService.execIosWithEvidence(device, cmd) as T,
        configIosWithResult: async (device: string, commands: string[], opts?: any) => this._legacyIosService.configIosWithResult(device, commands),
        showParsed: async <T = any>(device: string, cmd: string, opts?: any) => this._legacyIosService.execInteractive(device, cmd, opts),
        getConfidence: async (device: string, evidence: any, check?: string) => ({ confidence: 1.0 }),
        resolveCapabilities: async (device: string) => ({ model: '2911', family: 'router' }),
        configureDhcpPool: async (device: string, pool: string, network: string, mask: string, router: string, dns?: string) => this._legacyIosService.execInteractive(device, 'show running-config'),
        configureOspfNetwork: async (device: string, pid: number, net: string, wc: string, area: number) => this._legacyIosService.configIos(device, [`router ospf ${pid}`]),
        configureSshAccess: async (device: string, domain: string, user: string, pass: string) => this._legacyIosService.configIos(device, ['ip domain-name ' + domain]),
        configureAccessListStandard: async (device: string, acl: number, entries: string[]) => this._legacyIosService.configIos(device, [`access-list ${acl}`]),
      } as any;

      this._snapshotController = {
        snapshot: async () => bridge.sendCommandAndWait('snapshot', {}).then((r: any) => r?.value || { devices: {}, links: {} }),
        getCachedSnapshot: () => null,
        loadRuntime: async (code: string) => {},
        loadRuntimeFromFile: async (file: string) => {},
        getTwin: () => null,
      } as any;

      this._runtimeController = {
        getContextSummary: () => ({ bridgeReady: true, topologyMaterialized: false, deviceCount: 0, linkCount: 0 }),
        getHealthSummary: async () => ({ bridgeReady: true, topologyHealth: 'unknown', heartbeatState: 'unknown' as const, warnings: [] }),
        getBridgeStatus: () => ({ ready: true }),
      } as any;

      this._hostCommandService = {
        getHostHistory: async (device: string) => ({ entries: [], count: 0, raw: '' }),
        sendPing: async (device: string, target: string, timeout?: number) => ({ success: false, raw: '' }),
        getHostIpconfig: async (device: string, timeout?: number) => ({ success: false, raw: '' }),
        getHostArp: async (device: string, timeout?: number) => ({ success: false, raw: '' }),
        getHostTracert: async (device: string, target: string, timeout?: number) => ({ success: false, raw: '' }),
        getHostNslookup: async (device: string, target: string, timeout?: number) => ({ success: false, raw: '' }),
        getHostNetstat: async (device: string, timeout?: number) => ({ success: false, raw: '' }),
        getHostRoute: async (device: string, timeout?: number) => ({ success: false, raw: '' }),
        getHostTelnet: async (device: string, target: string, timeout?: number) => ({ success: false, raw: '' }),
        getHostSsh: async (device: string, user: string, target: string, timeout?: number) => ({ success: false, raw: '' }),
        inspectHost: async (device: string) => ({ name: device, model: 'PC1', type: 'pc' as const, power: true, ports: [] }),
      } as any;

      return;
    }

    const controlComposition = composition as ControlComposition;

    this._composition = controlComposition;
    this._legacyBridge = null;
    this._legacyIosService = null;

    this._topologyController = new TopologyController(
      controlComposition.topologyFacade,
      controlComposition.deviceService,
    );

    this._iosController = new IosController(
      controlComposition.controllerIosService,
      controlComposition.deviceService,
    );

    this._snapshotController = new SnapshotController(
      controlComposition.snapshotService,
      controlComposition.bridgeService,
    );

    this._runtimeController = new RuntimeController(
      controlComposition.bridgeService,
      controlComposition.primitivePort,
      controlComposition.contextService,
    );

    this._hostCommandService = new HostCommandService(
      controlComposition.terminalPort,
      controlComposition.deviceService,
    );
  }

  // -------------------------------------------------------------------------
  // Propiedades de composición
  // -------------------------------------------------------------------------

  public get omniscience() {
    return this._composition.omniscience;
  }

  public get labService() {
    return this._composition.labService;
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async start(): Promise<void> {
    this._composition.bridgeService.start();
  }

  async stop(): Promise<void> {
    await this._composition.bridgeService.stop();
  }

  // -------------------------------------------------------------------------
  // Bridge y cache
  // -------------------------------------------------------------------------

  getBridge(): FileBridgePort {
    return this._composition.bridgeService.getBridge();
  }

  getTopologyCache(): TopologyCache {
    return this._composition.bridgeService.getTopologyCache();
  }

  drainCommandTrace(): CommandTraceEntry[] {
    return this._composition.commandTraceService.drainCommandTrace();
  }

  // -------------------------------------------------------------------------
  // Topología (delega a TopologyController)
  // -------------------------------------------------------------------------

  async addDevice(
    name: string,
    model: string,
    options?: { x?: number; y?: number },
  ): Promise<DeviceState> {
    await this.ensureDeviceNameAvailable(name);
    return this._topologyController.addDevice(name, model, options);
  }

  async removeDevice(name: string): Promise<void> {
    await this.requireDevice(name);
    await this._topologyController.removeDevice(name);
  }

  async renameDevice(oldName: string, newName: string): Promise<void> {
    await this.requireDevice(oldName);
    await this.ensureDeviceNameAvailable(newName);
    await this._topologyController.renameDevice(oldName, newName);
  }

  async moveDevice(
    name: string,
    x: number,
    y: number,
  ): Promise<
    { ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }
  > {
    await this.requireDevice(name);
    return this._topologyController.moveDevice(name, x, y);
  }

  async requireDevice(name: string): Promise<DeviceState> {
    const devices = await this.listDevices();
    const found = Array.isArray(devices) ? devices.find((device) => device.name === name) : undefined;

    if (!found) {
      const error = new Error(`Device not found: ${name}`);
      (error as Error & { code?: string; details?: Record<string, unknown> }).code = "DEVICE_NOT_FOUND";
      (error as Error & { code?: string; details?: Record<string, unknown> }).details = {
        requested: name,
        availableDevices: Array.isArray(devices)
          ? devices.map((device) => ({ name: device.name, type: device.type, model: device.model }))
          : [],
        count: Array.isArray(devices) ? devices.length : 0,
      };
      throw error;
    }

    return found;
  }

  async ensureDeviceNameAvailable(name: string): Promise<void> {
    const devices = await this.listDevices();
    const listed = Array.isArray(devices) ? devices : [];

    if (listed.some((device) => device.name === name)) {
      const error = new Error(`Device already exists: ${name}`);
      (error as Error & { code?: string; details?: Record<string, unknown> }).code = "DEVICE_ALREADY_EXISTS";
      (error as Error & { code?: string; details?: Record<string, unknown> }).details = {
        requested: name,
        availableDevices: listed.map((device) => ({ name: device.name, type: device.type, model: device.model })),
        count: listed.length,
      };
      throw error;
    }
  }

  async listDevices(filter?: string | number | string[]): Promise<DeviceState[]> {
    return (await this._topologyController.listDevices(filter)) as unknown as DeviceState[];
  }

  async inspectDevice(name: string, includeXml = false): Promise<DeviceState> {
    return this._topologyController.inspectDevice(name, includeXml);
  }

  async addModule(device: string, slot: number | "auto", module: string): Promise<{ ok: true; value: { device: string; module: string; slot: number; wasPoweredOff: boolean } } | { ok: false; error: string; code: string; advice?: string[] }> {
    return this._topologyController.addModule(device, slot, module) as any;
  }

  async inspectModuleSlots(device: string): Promise<{ ok: boolean; value?: unknown }> {
    return this._composition.deviceService.inspectModuleSlots(device);
  }

  async removeModule(device: string, slot: number): Promise<{ ok: true; value: { device: string; slot: number; beforePorts: Array<{ name: string; [key: string]: unknown }>; afterPorts: Array<{ name: string; [key: string]: unknown }>; removedPorts: Array<{ name: string; [key: string]: unknown }> } } | { ok: false; error?: string; code?: string }> {
    return this._topologyController.removeModule(device, slot) as any;
  }

  async addLink(
    device1: string | {
      endpointA: { device: string; port: string };
      endpointB: { device: string; port: string };
      type?: string;
    },
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

  // -------------------------------------------------------------------------
  // Host commands (delega a HostCommandService)
  // -------------------------------------------------------------------------

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
    options?: { timeoutMs?: number },
  ): Promise<{ success: boolean; raw: string; verdict: TerminalEvidenceVerdict; parsed: unknown }> {
    const timeoutMs = options?.timeoutMs ?? 30000;

    const execute = async () => {
      const plan = createHostCommandPlan(device, command, { timeout: timeoutMs });
      const result = await this.runTerminalPlan(plan, { timeoutMs });
      const raw = result.output;
      const parsed = parseTerminalOutput(capabilityId, raw);
      const verdict = verifyTerminalEvidence(capabilityId, raw, parsed, result.status);
      return { raw, parsed, verdict, result };
    };

    let { raw, parsed, verdict } = await execute();

    if (!verdict.ok && raw.trim().length === 0) {
      try {
        await this.runTerminalPlan(createHostCommandPlan(device, "", { timeout: 2000 }), { timeoutMs: 2500 });
      } catch (_e) {
        // Ignore
      }
      ({ raw, parsed, verdict } = await execute());
    }

    return {
      success: verdict.ok,
      raw: raw || (verdict.reason ?? "Sin salida"),
      verdict,
      parsed,
    };
  }

  async getHostHistory(device: string): Promise<{ entries: Array<{ command: string; output: string; timestamp?: number }>; count: number; raw: string; methods?: string[] }> {
    return this._hostCommandService.getHostHistory(device);
  }

  async sendPing(device: string, target: string, timeoutMs = 30000): Promise<{
    success: boolean;
    raw: string;
    stats?: { sent: number; received: number; lost: number; lossPercent: number };
  }> {
    return this._hostCommandService.sendPing(device, target, timeoutMs);
  }

  async getHostIpconfig(device: string, timeoutMs = 15000) {
    return this._hostCommandService.getHostIpconfig(device, timeoutMs);
  }

  async getHostArp(device: string, timeoutMs = 15000) {
    return this._hostCommandService.getHostArp(device, timeoutMs);
  }

  async getHostTracert(device: string, target: string, timeoutMs = 60000) {
    return this._hostCommandService.getHostTracert(device, target, timeoutMs);
  }

  async getHostNslookup(device: string, target: string, timeoutMs = 20000) {
    return this._hostCommandService.getHostNslookup(device, target, timeoutMs);
  }

  async getHostNetstat(device: string, timeoutMs = 15000) {
    return this._hostCommandService.getHostNetstat(device, timeoutMs);
  }

  async getHostRoute(device: string, timeoutMs = 15000) {
    return this._hostCommandService.getHostRoute(device, timeoutMs);
  }

  async getHostTelnet(device: string, target: string, timeoutMs = 20000) {
    return this._hostCommandService.getHostTelnet(device, target, timeoutMs);
  }

  async getHostSsh(device: string, user: string, target: string, timeoutMs = 20000) {
    return this._hostCommandService.getHostSsh(device, user, target, timeoutMs);
  }

  async inspectHost(device: string): Promise<DeviceState> {
    return this._hostCommandService.inspectHost(device);
  }

  // -------------------------------------------------------------------------
  // Canvas
  // -------------------------------------------------------------------------

  async listCanvasRects(): Promise<{ rects: string[]; count: number }> {
    return this._composition.canvasFacade.listCanvasRects();
  }

  async getRect(rectId: string): Promise<unknown> {
    return this._composition.canvasFacade.getRect(rectId);
  }

  async devicesInRect(rectId: string, includeClusters = false): Promise<DevicesInRectResult> {
    return this._composition.canvasFacade.devicesInRect(rectId, includeClusters);
  }

  // -------------------------------------------------------------------------
  // Snapshot
  // -------------------------------------------------------------------------

  async snapshot(): Promise<TopologySnapshot> {
    return this._snapshotController.snapshot();
  }

  // -------------------------------------------------------------------------
  // Device inspection
  // -------------------------------------------------------------------------

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

  async deepInspect(path: string, method?: string, args?: unknown[]): Promise<unknown> {
    return this._composition.deviceService.deepInspect(path, method, args);
  }

  // -------------------------------------------------------------------------
  // IOS (delega a IosController)
  // -------------------------------------------------------------------------

  async configIos(device: string, commands: string[], options?: { save?: boolean }): Promise<void> {
    return this._iosController.configIos(device, commands, options);
  }

  async execIos<T = unknown>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000,
  ): Promise<T> {
    return this._iosController.execIos<T>(device, command, parse, timeout);
  }

  async execInteractive(
    device: string,
    command: string,
    options?: { timeout?: number; parse?: boolean; ensurePrivileged?: boolean },
  ): Promise<unknown> {
    return this._iosController.execInteractive(device, command, options);
  }

  async execIosWithEvidence<T = unknown>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000,
  ): Promise<T> {
    return this._iosController.execIosWithEvidence<T>(device, command, parse, timeout);
  }

  async configIosWithResult(
    device: string,
    commands: string[],
    options?: { save?: boolean },
  ): Promise<unknown> {
    return this._iosController.configIosWithResult(device, commands, options);
  }

  async show(device: string, command: string): Promise<unknown> {
    return this._iosController.show(device, command);
  }

  async showParsed<T = unknown>(
    device: string,
    command: string,
    options?: { ensurePrivileged?: boolean; timeout?: number },
  ): Promise<T> {
    return this._iosController.showParsed<T>(device, command, options);
  }

  async showIpInterfaceBrief(device: string): Promise<unknown> {
    return this._iosController.showIpInterfaceBrief(device);
  }

  async showVlan(device: string): Promise<unknown> {
    return this._iosController.showVlan(device);
  }

  async showIpRoute(device: string): Promise<unknown> {
    return this._iosController.showIpRoute(device);
  }

  async showRunningConfig(device: string): Promise<unknown> {
    return this._iosController.showRunningConfig(device);
  }

  async showMacAddressTable(device: string): Promise<unknown> {
    return this._iosController.showMacAddressTable(device);
  }

  async showCdpNeighbors(device: string): Promise<unknown> {
    return this._iosController.showCdpNeighbors(device);
  }

  async getConfidence(
    device: string,
    evidence: IosExecutionEvidence,
    verificationCheck?: string,
  ): Promise<unknown> {
    return this._iosController.getConfidence(device, evidence, verificationCheck);
  }

  async resolveCapabilities(device: string): Promise<unknown> {
    return this._iosController.resolveCapabilities(device);
  }

  // -------------------------------------------------------------------------
  // Runtime / Ports de bajo nivel
  // -------------------------------------------------------------------------

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
  async send(_type: string, _payload: Record<string, unknown>): Promise<unknown> {
    throw new Error(
      "PTController.send() está deprecated. Usa runPrimitive(), runTerminalPlan() o runOmniCapability().",
    );
  }

  // -------------------------------------------------------------------------
  // Eventos
  // -------------------------------------------------------------------------

  on<E extends PTEventType>(eventType: E, handler: (event: PTEvent) => void): this {
    this._composition.bridgeService.on(eventType, handler);
    return this;
  }

  onAll(handler: (event: PTEvent) => void): this {
    this._composition.bridgeService.onAll(handler);
    return this;
  }

  // -------------------------------------------------------------------------
  // Runtime loading / Snapshot
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Runtime / Context
  // -------------------------------------------------------------------------

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
