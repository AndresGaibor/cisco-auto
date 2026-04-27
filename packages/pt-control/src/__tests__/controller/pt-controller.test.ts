import { describe, expect, test, beforeEach, vi } from "bun:test";
import { PTController } from "../../controller/pt-controller.js";
import { HostCommandService } from "../../controller/host-command-service.js";
import { createPTController, createDefaultPTController } from "../../controller/factory.js";

describe("PTController split", () => {
  describe("PTController composes HostCommandService", () => {
    test("creates PTController with composition containing terminalPort", () => {
      const mockTerminalPort = {
        runTerminalPlan: vi.fn(),
        ensureSession: vi.fn(),
      };
      const mockDeviceService = {
        inspect: vi.fn(),
        configHost: vi.fn(),
        configureDhcpServer: vi.fn(),
        inspectDhcpServer: vi.fn(),
        hardwareInfo: vi.fn(),
        hardwareCatalog: vi.fn(),
        commandLog: vi.fn(),
        deepInspect: vi.fn(),
      };
      const mockComposition = {
        terminalPort: mockTerminalPort,
        deviceService: mockDeviceService,
        bridgeService: { start: vi.fn(), stop: vi.fn(), getBridge: vi.fn(), getTopologyCache: vi.fn(), on: vi.fn(), onAll: vi.fn(), readState: vi.fn() },
        primitivePort: { runPrimitive: vi.fn() },
        contextService: { getHeartbeat: vi.fn(), getHeartbeatHealth: vi.fn(), getSystemContext: vi.fn() },
        omniscience: {},
        labService: {},
        canvasFacade: { listCanvasRects: vi.fn(), getRect: vi.fn(), devicesInRect: vi.fn() },
        topologyFacade: { addDevice: vi.fn(), removeDevice: vi.fn(), renameDevice: vi.fn(), moveDevice: vi.fn(), addLink: vi.fn(), removeLink: vi.fn(), clearTopology: vi.fn(), listDevices: vi.fn() },
        controllerIosService: { configIos: vi.fn(), execIos: vi.fn(), execInteractive: vi.fn(), execIosWithEvidence: vi.fn(), configIosWithResult: vi.fn(), show: vi.fn(), showParsed: vi.fn(), showIpInterfaceBrief: vi.fn(), showVlan: vi.fn(), showIpRoute: vi.fn(), showRunningConfig: vi.fn(), showMacAddressTable: vi.fn(), showCdpNeighbors: vi.fn(), getIosConfidence: vi.fn(), resolveCapabilities: vi.fn() },
        snapshotService: { snapshot: vi.fn(), getCachedSnapshot: vi.fn(), getTwin: vi.fn() },
        commandTraceService: { drainCommandTrace: vi.fn() },
      };

      const controller = new PTController(mockComposition as any);

      // Verify host command methods delegate to HostCommandService
      expect(controller).toBeDefined();
      expect(typeof controller.sendPing).toBe("function");
      expect(typeof controller.getHostIpconfig).toBe("function");
      expect(typeof controller.getHostArp).toBe("function");
      expect(typeof controller.getHostTracert).toBe("function");
      expect(typeof controller.getHostNslookup).toBe("function");
      expect(typeof controller.getHostNetstat).toBe("function");
      expect(typeof controller.getHostRoute).toBe("function");
      expect(typeof controller.getHostTelnet).toBe("function");
      expect(typeof controller.getHostSsh).toBe("function");
      expect(typeof controller.inspectHost).toBe("function");
      expect(typeof controller.getHostHistory).toBe("function");
    });

    test("expone omniscience desde la composición", () => {
      const mockComposition = {
        terminalPort: { runTerminalPlan: vi.fn(), ensureSession: vi.fn() },
        deviceService: { inspect: vi.fn() },
        bridgeService: { start: vi.fn(), stop: vi.fn(), getBridge: vi.fn(), getTopologyCache: vi.fn(), on: vi.fn(), onAll: vi.fn(), readState: vi.fn() },
        primitivePort: { runPrimitive: vi.fn() },
        contextService: { getHeartbeat: vi.fn(), getHeartbeatHealth: vi.fn(), getSystemContext: vi.fn() },
        omniscience: { runCapability: vi.fn() } as any,
        labService: {},
        canvasFacade: { listCanvasRects: vi.fn(), getRect: vi.fn(), devicesInRect: vi.fn() },
        topologyFacade: { addDevice: vi.fn(), removeDevice: vi.fn(), renameDevice: vi.fn(), moveDevice: vi.fn(), addLink: vi.fn(), removeLink: vi.fn(), clearTopology: vi.fn(), listDevices: vi.fn() },
        controllerIosService: { configIos: vi.fn(), execIos: vi.fn(), execInteractive: vi.fn(), execIosWithEvidence: vi.fn(), configIosWithResult: vi.fn(), show: vi.fn(), showParsed: vi.fn(), showIpInterfaceBrief: vi.fn(), showVlan: vi.fn(), showIpRoute: vi.fn(), showRunningConfig: vi.fn(), showMacAddressTable: vi.fn(), showCdpNeighbors: vi.fn(), getIosConfidence: vi.fn(), resolveCapabilities: vi.fn() },
        snapshotService: { snapshot: vi.fn(), getCachedSnapshot: vi.fn(), getTwin: vi.fn() },
        commandTraceService: { drainCommandTrace: vi.fn() },
      };

      const controller = new PTController(mockComposition as any);

      expect(controller.omniscience).toBe(mockComposition.omniscience);
      expect((controller.omniscience as any).runCapability).toBeDefined();
    });

    test("rechaza nombres duplicados antes de agregar dispositivo", async () => {
      const mockComposition = {
        terminalPort: { runTerminalPlan: vi.fn(), ensureSession: vi.fn() },
        deviceService: { inspect: vi.fn() },
        bridgeService: { start: vi.fn(), stop: vi.fn(), getBridge: vi.fn(), getTopologyCache: vi.fn(), on: vi.fn(), onAll: vi.fn(), readState: vi.fn() },
        primitivePort: { runPrimitive: vi.fn() },
        contextService: { getHeartbeat: vi.fn(), getHeartbeatHealth: vi.fn(), getSystemContext: vi.fn() },
        omniscience: {} as any,
        labService: {},
        canvasFacade: { listCanvasRects: vi.fn(), getRect: vi.fn(), devicesInRect: vi.fn() },
        topologyFacade: {
          addDevice: vi.fn(),
          removeDevice: vi.fn(),
          renameDevice: vi.fn(),
          moveDevice: vi.fn(),
          addLink: vi.fn(),
          removeLink: vi.fn(),
          clearTopology: vi.fn(),
          listDevices: vi.fn().mockResolvedValue([{ name: "FIE", type: "switch", model: "2960-24TT" }]),
        },
        controllerIosService: { configIos: vi.fn(), execIos: vi.fn(), execInteractive: vi.fn(), execIosWithEvidence: vi.fn(), configIosWithResult: vi.fn(), show: vi.fn(), showParsed: vi.fn(), showIpInterfaceBrief: vi.fn(), showVlan: vi.fn(), showIpRoute: vi.fn(), showRunningConfig: vi.fn(), showMacAddressTable: vi.fn(), showCdpNeighbors: vi.fn(), getIosConfidence: vi.fn(), resolveCapabilities: vi.fn() },
        snapshotService: { snapshot: vi.fn(), getCachedSnapshot: vi.fn(), getTwin: vi.fn() },
        commandTraceService: { drainCommandTrace: vi.fn() },
      };

      const controller = new PTController(mockComposition as any);

      await expect(controller.ensureDeviceNameAvailable("FIE")).rejects.toMatchObject({
        code: "DEVICE_ALREADY_EXISTS",
      });
    });

    test("sendPing returns correct shape", async () => {
      const mockTerminalPort = {
        runTerminalPlan: vi.fn().mockResolvedValue({
          ok: true,
          status: 0,
          output: "Ping statistics for 192.168.1.1:\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)",
          events: [],
        }),
        ensureSession: vi.fn(),
      };
      const mockDeviceService = {
        inspect: vi.fn(),
        configHost: vi.fn(),
        configureDhcpServer: vi.fn(),
        inspectDhcpServer: vi.fn(),
        hardwareInfo: vi.fn(),
        hardwareCatalog: vi.fn(),
        commandLog: vi.fn(),
        deepInspect: vi.fn(),
      };
      const mockComposition = {
        terminalPort: mockTerminalPort,
        deviceService: mockDeviceService,
        bridgeService: { start: vi.fn(), stop: vi.fn(), getBridge: vi.fn(), getTopologyCache: vi.fn(), on: vi.fn(), onAll: vi.fn(), readState: vi.fn() },
        primitivePort: { runPrimitive: vi.fn() },
        contextService: { getHeartbeat: vi.fn(), getHeartbeatHealth: vi.fn(), getSystemContext: vi.fn() },
        omniscience: {},
        labService: {},
        canvasFacade: { listCanvasRects: vi.fn(), getRect: vi.fn(), devicesInRect: vi.fn() },
        topologyFacade: { addDevice: vi.fn(), removeDevice: vi.fn(), renameDevice: vi.fn(), moveDevice: vi.fn(), addLink: vi.fn(), removeLink: vi.fn(), clearTopology: vi.fn(), listDevices: vi.fn() },
        controllerIosService: { configIos: vi.fn(), execIos: vi.fn(), execInteractive: vi.fn(), execIosWithEvidence: vi.fn(), configIosWithResult: vi.fn(), show: vi.fn(), showParsed: vi.fn(), showIpInterfaceBrief: vi.fn(), showVlan: vi.fn(), showIpRoute: vi.fn(), showRunningConfig: vi.fn(), showMacAddressTable: vi.fn(), showCdpNeighbors: vi.fn(), getIosConfidence: vi.fn(), resolveCapabilities: vi.fn() },
        snapshotService: { snapshot: vi.fn(), getCachedSnapshot: vi.fn(), getTwin: vi.fn() },
        commandTraceService: { drainCommandTrace: vi.fn() },
      };

      const controller = new PTController(mockComposition as any);
      const result = await controller.sendPing("PC1", "192.168.1.1");

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("raw");
      expect(result).toHaveProperty("stats");
    });

    test("execHost delegates to terminalPort.runTerminalPlan", async () => {
      const runTerminalPlanMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 0,
        output: "some output",
        events: [],
      });
      const mockTerminalPort = {
        runTerminalPlan: runTerminalPlanMock,
        ensureSession: vi.fn(),
      };
      const mockDeviceService = {
        inspect: vi.fn(),
        configHost: vi.fn(),
        configureDhcpServer: vi.fn(),
        inspectDhcpServer: vi.fn(),
        hardwareInfo: vi.fn(),
        hardwareCatalog: vi.fn(),
        commandLog: vi.fn(),
        deepInspect: vi.fn(),
      };
      const mockComposition = {
        terminalPort: mockTerminalPort,
        deviceService: mockDeviceService,
        bridgeService: { start: vi.fn(), stop: vi.fn(), getBridge: vi.fn(), getTopologyCache: vi.fn(), on: vi.fn(), onAll: vi.fn(), readState: vi.fn() },
        primitivePort: { runPrimitive: vi.fn() },
        contextService: { getHeartbeat: vi.fn(), getHeartbeatHealth: vi.fn(), getSystemContext: vi.fn() },
        omniscience: {},
        labService: {},
        canvasFacade: { listCanvasRects: vi.fn(), getRect: vi.fn(), devicesInRect: vi.fn() },
        topologyFacade: { addDevice: vi.fn(), removeDevice: vi.fn(), renameDevice: vi.fn(), moveDevice: vi.fn(), addLink: vi.fn(), removeLink: vi.fn(), clearTopology: vi.fn(), listDevices: vi.fn() },
        controllerIosService: { configIos: vi.fn(), execIos: vi.fn(), execInteractive: vi.fn(), execIosWithEvidence: vi.fn(), configIosWithResult: vi.fn(), show: vi.fn(), showParsed: vi.fn(), showIpInterfaceBrief: vi.fn(), showVlan: vi.fn(), showIpRoute: vi.fn(), showRunningConfig: vi.fn(), showMacAddressTable: vi.fn(), showCdpNeighbors: vi.fn(), getIosConfidence: vi.fn(), resolveCapabilities: vi.fn() },
        snapshotService: { snapshot: vi.fn(), getCachedSnapshot: vi.fn(), getTwin: vi.fn() },
        commandTraceService: { drainCommandTrace: vi.fn() },
      };

      const controller = new PTController(mockComposition as any);
      const result = await controller.execHost("PC1", "ipconfig", "host.ipconfig");

      expect(runTerminalPlanMock).toHaveBeenCalled();
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("raw");
      expect(result).toHaveProperty("verdict");
      expect(result).toHaveProperty("parsed");
    });
  });

  describe("HostCommandService standalone", () => {
    test("can be instantiated independently", () => {
      const mockTerminalPort = {
        runTerminalPlan: vi.fn(),
        ensureSession: vi.fn(),
      };
      const mockDeviceService = {
        inspect: vi.fn(),
      };

      const service = new HostCommandService(mockTerminalPort as any, mockDeviceService as any);
      expect(service).toBeDefined();
      expect(typeof service.sendPing).toBe("function");
      expect(typeof service.getHostIpconfig).toBe("function");
      expect(typeof service.getHostArp).toBe("function");
    });

    test("sendPing returns ping statistics", async () => {
      const mockTerminalPort = {
        runTerminalPlan: vi.fn().mockResolvedValue({
          ok: true,
          status: 0,
          output: "Ping statistics for 10.0.0.1:\n    Packets: Sent = 4, Received = 2, Lost = 2 (50% loss)",
          events: [],
        }),
        ensureSession: vi.fn(),
      };
      const mockDeviceService = {
        inspect: vi.fn(),
      };

      const service = new HostCommandService(mockTerminalPort as any, mockDeviceService as any);
      const result = await service.sendPing("PC1", "10.0.0.1");

      expect(result.success).toBe(true);
      expect(result.stats?.sent).toBe(4);
      expect(result.stats?.received).toBe(2);
      expect(result.stats?.lost).toBe(2);
      expect(result.stats?.lossPercent).toBe(50);
    });

    test("getHostIpconfig returns host command result", async () => {
      const mockTerminalPort = {
        runTerminalPlan: vi.fn().mockResolvedValue({
          ok: true,
          status: 0,
          output: "Ethernet adapter Local Area Connection:\n   Connection-specific DNS Suffix  . : lan\n   IPv4 Address. . . . . . . . . . : 192.168.1.100",
          events: [],
        }),
        ensureSession: vi.fn(),
      };
      const mockDeviceService = {
        inspect: vi.fn(),
      };

      const service = new HostCommandService(mockTerminalPort as any, mockDeviceService as any);
      const result = await service.getHostIpconfig("PC1");

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("raw");
      expect(result).toHaveProperty("verdict");
    });
  });

  describe("Public API surface unchanged", () => {
    test("PTController exports same public methods as before", () => {
      const expectedMethods = [
        "start",
        "stop",
        "getBridge",
        "getTopologyCache",
        "drainCommandTrace",
        "addDevice",
        "removeDevice",
        "renameDevice",
        "moveDevice",
        "listDevices",
        "inspectDevice",
        "addModule",
        "removeModule",
        "addLink",
        "removeLink",
        "clearTopology",
        "configHost",
        "configureDhcpServer",
        "inspectDhcpServer",
        "execHost",
        "getHostHistory",
        "sendPing",
        "getHostIpconfig",
        "getHostArp",
        "getHostTracert",
        "getHostNslookup",
        "getHostNetstat",
        "getHostRoute",
        "getHostTelnet",
        "getHostSsh",
        "inspectHost",
        "listCanvasRects",
        "getRect",
        "devicesInRect",
        "snapshot",
        "inspect",
        "hardwareInfo",
        "hardwareCatalog",
        "commandLog",
        "deepInspect",
        "configIos",
        "execIos",
        "execInteractive",
        "execIosWithEvidence",
        "configIosWithResult",
        "show",
        "showParsed",
        "showIpInterfaceBrief",
        "showVlan",
        "showIpRoute",
        "showRunningConfig",
        "showMacAddressTable",
        "showCdpNeighbors",
        "getConfidence",
        "resolveCapabilities",
        "runPrimitive",
        "runTerminalPlan",
        "ensureTerminalSession",
        "runOmniCapability",
        "send",
        "on",
        "onAll",
        "loadRuntime",
        "loadRuntimeFromFile",
        "getCachedSnapshot",
        "getTwin",
        "readState",
        "getContextSummary",
        "getHealthSummary",
        "getHeartbeat",
        "getHeartbeatHealth",
        "getBridgeStatus",
        "getSystemContext",
      ];

      const mockComposition = {
        terminalPort: { runTerminalPlan: vi.fn(), ensureSession: vi.fn() },
        deviceService: { inspect: vi.fn(), configHost: vi.fn(), configureDhcpServer: vi.fn(), inspectDhcpServer: vi.fn(), hardwareInfo: vi.fn(), hardwareCatalog: vi.fn(), commandLog: vi.fn(), deepInspect: vi.fn() },
        bridgeService: { start: vi.fn(), stop: vi.fn(), getBridge: vi.fn(), getTopologyCache: vi.fn(), on: vi.fn(), onAll: vi.fn(), readState: vi.fn() },
        primitivePort: { runPrimitive: vi.fn() },
        contextService: { getHeartbeat: vi.fn(), getHeartbeatHealth: vi.fn(), getSystemContext: vi.fn(), getContextSummary: vi.fn(), getHealthSummary: vi.fn(), getBridgeStatus: vi.fn() },
        omniscience: {},
        labService: {},
        canvasFacade: { listCanvasRects: vi.fn(), getRect: vi.fn(), devicesInRect: vi.fn() },
        topologyFacade: { addDevice: vi.fn(), removeDevice: vi.fn(), renameDevice: vi.fn(), moveDevice: vi.fn(), addLink: vi.fn(), removeLink: vi.fn(), clearTopology: vi.fn(), listDevices: vi.fn() },
        controllerIosService: { configIos: vi.fn(), execIos: vi.fn(), execInteractive: vi.fn(), execIosWithEvidence: vi.fn(), configIosWithResult: vi.fn(), show: vi.fn(), showParsed: vi.fn(), showIpInterfaceBrief: vi.fn(), showVlan: vi.fn(), showIpRoute: vi.fn(), showRunningConfig: vi.fn(), showMacAddressTable: vi.fn(), showCdpNeighbors: vi.fn(), getIosConfidence: vi.fn(), resolveCapabilities: vi.fn() },
        snapshotService: { snapshot: vi.fn(), getCachedSnapshot: vi.fn(), getTwin: vi.fn(), loadRuntime: vi.fn(), loadRuntimeFromFile: vi.fn() },
        commandTraceService: { drainCommandTrace: vi.fn() },
      };

      const controller = new PTController(mockComposition as any);

      for (const method of expectedMethods) {
        expect(typeof (controller as any)[method]).toBe("function");
      }
    });
  });
});
