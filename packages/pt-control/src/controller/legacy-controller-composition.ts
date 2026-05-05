import type { ControlComposition } from "../application/bootstrap/control-composition.js";

export interface LegacyControllerComposition {
  composition: ControlComposition;
  legacyBridge: any;
  legacyIosService: any;
  topologyController: any;
  iosController: any;
  snapshotController: any;
  runtimeController: any;
  hostCommandService: any;
}

export function createLegacyControllerComposition(bridge: any): LegacyControllerComposition {
  const legacyIosService = {
    execIos: async (device: string, cmd: string) => {
      const result = await bridge.sendCommandAndWait("execIos", { device, command: cmd });
      return { raw: result?.value?.raw || "" };
    },
    configIos: async (device: string, commands: string[]) => {
      const result = await bridge.sendCommandAndWait("configIos", { device, commands });
      return { executed: true, device, commands, raw: result?.value?.raw || "" };
    },
    execInteractive: async (device: string, cmd: string, opts?: any) => {
      const result = await bridge.sendCommandAndWait("execInteractive", { device, command: cmd, ...opts });
      return { raw: result?.value?.raw || "" };
    },
    execIosWithEvidence: async (device: string, cmd: string) => {
      const result = await bridge.sendCommandAndWait("execIos", { device, command: cmd });
      return { ok: true, raw: result?.value?.raw || "", evidence: { source: "terminal" } };
    },
    configIosWithResult: async (device: string, commands: string[]) => {
      const result = await bridge.sendCommandAndWait("configIos", { device, commands });
      return { executed: true, device, commands };
    },
    showIpInterfaceBrief: async (device: string) => {
      const result = await bridge.sendCommandAndWait("execInteractive", {
        device,
        command: "show ip interface brief",
      });
      return result?.value?.parsed || { entries: [] };
    },
    showVlan: async (device: string) => {
      const result = await bridge.sendCommandAndWait("execInteractive", { device, command: "show vlan brief" });
      return result?.value?.parsed || { entries: [] };
    },
    showIpRoute: async (device: string) => {
      const result = await bridge.sendCommandAndWait("execInteractive", { device, command: "show ip route" });
      return result?.value?.parsed || { entries: [] };
    },
  };

  const topologyController = {
    addDevice: async (name: string, model: string, opts?: any) => ({ name, model, type: "router" as const, power: true, ports: [] }),
    removeDevice: async (name: string) => {},
    renameDevice: async (oldName: string, newName: string) => {},
    moveDevice: async (name: string, x: number, y: number) => ({ ok: true, name, x, y }),
    listDevices: async (filter?: any) => [{ name: "R1", model: "2911", type: "router" as const, power: true, ports: [] }],
    inspectDevice: async (name: string, includeXml = false) => ({ name, model: "2911", type: "router" as const, power: true, ports: [] }),
    addModule: async (device: string, slot: number, module: string) => {},
    removeModule: async (device: string, slot: number) => {},
    addLink: async (d1: any, p1: any, d2: any, p2: any, linkType: any) => ({ id: "link1" }),
    removeLink: async (device: string, port: string) => {},
    clearTopology: async () => ({ removedDevices: 0, removedLinks: 0, remainingDevices: 0, remainingLinks: 0 }),
  };

  const iosController = {
    configIos: async (device: string, commands: string[], opts?: any) => legacyIosService.configIos(device, commands),
    execIos: async <T = any>(device: string, cmd: string) => legacyIosService.execIos(device, cmd) as T,
    show: async (device: string, cmd: string) => legacyIosService.execInteractive(device, cmd),
    showIpInterfaceBrief: async (device: string) => legacyIosService.showIpInterfaceBrief(device),
    showVlan: async (device: string) => legacyIosService.showVlan(device),
    showIpRoute: async (device: string) => legacyIosService.showIpRoute(device),
    showRunningConfig: async (device: string) => legacyIosService.execInteractive(device, "show running-config"),
    showMacAddressTable: async (device: string) => legacyIosService.execInteractive(device, "show mac address-table"),
    showCdpNeighbors: async (device: string) => legacyIosService.execInteractive(device, "show cdp neighbors"),
    execInteractive: async (device: string, cmd: string, opts?: any) => legacyIosService.execInteractive(device, cmd, opts),
    execIosWithEvidence: async <T = any>(device: string, cmd: string) => legacyIosService.execIosWithEvidence(device, cmd) as T,
    configIosWithResult: async (device: string, commands: string[], opts?: any) => legacyIosService.configIosWithResult(device, commands),
    showParsed: async <T = any>(device: string, cmd: string, opts?: any) => legacyIosService.execInteractive(device, cmd, opts),
    getConfidence: async (device: string, evidence: any, check?: string) => ({ confidence: 1.0 }),
    resolveCapabilities: async (device: string) => ({ model: "2911", family: "router" }),
    configureDhcpPool: async (device: string, pool: string, network: string, mask: string, router: string, dns?: string) => legacyIosService.execInteractive(device, "show running-config"),
    configureOspfNetwork: async (device: string, pid: number, net: string, wc: string, area: number) => legacyIosService.configIos(device, [`router ospf ${pid}`]),
    configureSshAccess: async (device: string, domain: string, user: string, pass: string) => legacyIosService.configIos(device, ["ip domain-name " + domain]),
    configureAccessListStandard: async (device: string, acl: number, entries: string[]) => legacyIosService.configIos(device, [`access-list ${acl}`]),
  };

  const snapshotController = {
    snapshot: async () => bridge.sendCommandAndWait("snapshot", {}).then((r: any) => r?.value || { devices: {}, links: {} }),
    getCachedSnapshot: () => null,
    loadRuntime: async (code: string) => {},
    loadRuntimeFromFile: async (file: string) => {},
    getTwin: () => null,
  };

  const runtimeController = {
    getContextSummary: () => ({ bridgeReady: true, topologyMaterialized: false, deviceCount: 0, linkCount: 0 }),
    getHealthSummary: async () => ({ bridgeReady: true, topologyHealth: "unknown", heartbeatState: "unknown" as const, warnings: [] }),
    getBridgeStatus: () => ({ ready: true }),
  };

  const hostCommandService = {
    getHostHistory: async (device: string) => ({ entries: [], count: 0, raw: "" }),
    sendPing: async (device: string, target: string, timeout?: number) => ({ success: false, raw: "" }),
    getHostIpconfig: async (device: string, timeout?: number) => ({ success: false, raw: "" }),
    getHostArp: async (device: string, timeout?: number) => ({ success: false, raw: "" }),
    getHostTracert: async (device: string, target: string, timeout?: number) => ({ success: false, raw: "" }),
    getHostNslookup: async (device: string, target: string, timeout?: number) => ({ success: false, raw: "" }),
    getHostNetstat: async (device: string, timeout?: number) => ({ success: false, raw: "" }),
    getHostRoute: async (device: string, timeout?: number) => ({ success: false, raw: "" }),
    getHostTelnet: async (device: string, target: string, timeout?: number) => ({ success: false, raw: "" }),
    getHostSsh: async (device: string, user: string, target: string, timeout?: number) => ({ success: false, raw: "" }),
    inspectHost: async (device: string) => ({ name: device, model: "PC1", type: "pc" as const, power: true, ports: [] }),
  };

  const composition = {} as ControlComposition;

  return {
    composition,
    legacyBridge: bridge,
    legacyIosService,
    topologyController,
    iosController,
    snapshotController,
    runtimeController,
    hostCommandService,
  };
}
