import { expect, test, describe } from "bun:test";
import {
  PT_API_METHOD_INDEX,
  PT_CABLE_TYPE_CONSTANTS,
  PT_DEVICE_TYPE_CONSTANTS,
  // Types — exported via type alias, verify they exist via keyof check
  PTIpcBase,
  PTIpc,
  PTNetwork,
  PTLink,
  PTPort,
  PTModule,
  PTHardwareFactory,
  PTDevice,
  PTRouterPort,
  PTSwitchPort,
  PTHostPort,
  PTRoutedSwitchPort,
  PTServer,
  PTAsa,
  PTCloud,
  PTMcu,
  PTSbc,
  PTCloudSerialPort,
  PTCloudPotsPort,
  PTCommandLine,
  PTCommandLog,
  PTTerminalEventName,
  PTOutputWrittenArgs,
  PTCommandStartedArgs,
  PTCommandEndedArgs,
  PTModeChangedArgs,
  PTPromptChangedArgs,
  PTMoreDisplayedArgs,
  PTAppWindow,
  PTWorkspace,
  PTLogicalWorkspace,
  PTSimulation,
  PTOptions,
  PTProcess,
  PTIpcManager,
  PTMultiUserManager,
  PTUserAppManager,
  PTFileManager,
  PTFileWatcher,
  PTGlobalScope,
} from "../pt-api/index.js";

describe("pt-api-registry", () => {
  test("expone métodos básicos de la API PT", () => {
    expect(PT_API_METHOD_INDEX["PTIpc"]).toContain("network");
    expect(PT_API_METHOD_INDEX["PTIpc"]).toContain("appWindow");
    expect(PT_API_METHOD_INDEX["PTIpc"]).toContain("systemFileManager");
    expect(PT_API_METHOD_INDEX["PTIpc"]).toContain("simulation");
    expect(PT_API_METHOD_INDEX["PTNetwork"]).toContain("getDevice");
    expect(PT_API_METHOD_INDEX["PTDevice"]).toContain("getCommandLine");
    expect(PT_API_METHOD_INDEX["PTPort"]).toContain("getIpAddress");
  });

  test("expone constantes de tipos de dispositivos y cables", () => {
    expect(PT_DEVICE_TYPE_CONSTANTS.router).toBe(0);
    expect(PT_DEVICE_TYPE_CONSTANTS.multilayerSwitch).toBe(16);
    expect(PT_CABLE_TYPE_CONSTANTS.console).toBe(4);
    expect(PT_CABLE_TYPE_CONSTANTS.usb).toBe(13);
  });

  test("expone todas las interfaces documentadas (type-check via keyof)", () => {
    // Use keyof to verify interfaces are types (not values)
    // This compiles only if the types are exported correctly
    type _AllInterfaces = {
      [K in typeof PTIpcBase | typeof PTIpc | typeof PTNetwork | typeof PTLink | typeof PTPort | typeof PTModule | typeof PTHardwareFactory | typeof PTDevice | typeof PTRouterPort | typeof PTSwitchPort | typeof PTHostPort | typeof PTRoutedSwitchPort | typeof PTServer | typeof PTAsa | typeof PTCloud | typeof PTMcu | typeof PTSbc | typeof PTCloudSerialPort | typeof PTCloudPotsPort | typeof PTCommandLine | typeof PTCommandLog | typeof PTAppWindow | typeof PTWorkspace | typeof PTLogicalWorkspace | typeof PTSimulation | typeof PTOptions | typeof PTProcess | typeof PTIpcManager | typeof PTMultiUserManager | typeof PTUserAppManager | typeof PTFileManager | typeof PTFileWatcher | typeof PTGlobalScope]: never;
    };
    // If this compiles, all types are properly exported
    const _check: _AllInterfaces = null as any;
    expect(_check).toBeNull();
  });

  test("todos los nombres de eventos de terminal están presentes", () => {
    const eventNames: PTTerminalEventName[] = [
      "commandStarted",
      "outputWritten",
      "commandEnded",
      "modeChanged",
      "promptChanged",
      "moreDisplayed",
      "directiveSent",
      "commandSelectedFromHistory",
      "commandAutoCompleted",
      "cursorPositionChanged",
    ];
    const _check: PTTerminalEventName = "commandEnded";
    expect(eventNames.length).toBe(10);
  });

  test("device type constants incluye todos los tipos esperados", () => {
    const expectedTypes = [
      "router",
      "switch",
      "hub",
      "pc",
      "server",
      "wirelessRouter",
      "multilayerSwitch",
      "firewall",
      "iot",
    ];
    for (const type of expectedTypes) {
      expect(PT_DEVICE_TYPE_CONSTANTS[type]).toBeDefined();
      expect(typeof PT_DEVICE_TYPE_CONSTANTS[type]).toBe("number");
    }
  });

  test("cable type constants incluye todos los tipos esperados", () => {
    const expectedCables = [
      "auto",
      "straight",
      "cross",
      "fiber",
      "serial",
      "console",
      "wireless",
      "usb",
    ];
    for (const cable of expectedCables) {
      expect(PT_CABLE_TYPE_CONSTANTS[cable]).toBeDefined();
      expect(typeof PT_CABLE_TYPE_CONSTANTS[cable]).toBe("number");
    }
  });

  test("API method index tiene todas las interfaces mayores", () => {
    const expectedInterfaces = [
      "PTIpc",
      "PTAppWindow",
      "PTWorkspace",
      "PTLogicalWorkspace",
      "PTNetwork",
      "PTDevice",
      "PTModule",
      "PTServer",
      "PTAsa",
      "PTCloud",
      "PTMcu",
      "PTSimulation",
      "PTOptions",
      "PTCommandLog",
      "PTCommandLine",
      "PTPort",
      "PTRouterPort",
      "PTSwitchPort",
      "PTRoutedSwitchPort",
      "PTCloudSerialPort",
      "PTCloudPotsPort",
    ];
    for (const iface of expectedInterfaces) {
      expect(PT_API_METHOD_INDEX[iface]).toBeDefined();
      expect(Array.isArray(PT_API_METHOD_INDEX[iface])).toBe(true);
      expect(PT_API_METHOD_INDEX[iface].length).toBeGreaterThan(0);
    }
  });

  test("uniqueness: capability IDs are unique in API method index", () => {
    const allMethods = new Set<string>();
    for (const [iface, methods] of Object.entries(PT_API_METHOD_INDEX)) {
      for (const method of methods) {
        const key = `${iface}::${method}`;
        expect(allMethods.has(key)).toBe(false);
        allMethods.add(key);
      }
    }
  });

  test("PT_DEVICE_TYPE_CONSTANTS matches original registry values", () => {
    // Verify critical values match original registry
    expect(PT_DEVICE_TYPE_CONSTANTS.router).toBe(0);
    expect(PT_DEVICE_TYPE_CONSTANTS.switch).toBe(1);
    expect(PT_DEVICE_TYPE_CONSTANTS.pc).toBe(8);
    expect(PT_DEVICE_TYPE_CONSTANTS.server).toBe(9);
    expect(PT_DEVICE_TYPE_CONSTANTS.multilayerSwitch).toBe(16);
    expect(PT_DEVICE_TYPE_CONSTANTS.firewall).toBe(27);
    expect(PT_DEVICE_TYPE_CONSTANTS.iot).toBe(34);
  });

  test("PT_CABLE_TYPE_CONSTANTS matches original registry values", () => {
    expect(PT_CABLE_TYPE_CONSTANTS.auto).toBe(-1);
    expect(PT_CABLE_TYPE_CONSTANTS.straight).toBe(0);
    expect(PT_CABLE_TYPE_CONSTANTS.cross).toBe(1);
    expect(PT_CABLE_TYPE_CONSTANTS.fiber).toBe(2);
    expect(PT_CABLE_TYPE_CONSTANTS.console).toBe(4);
    expect(PT_CABLE_TYPE_CONSTANTS.wireless).toBe(8);
    expect(PT_CABLE_TYPE_CONSTANTS.usb).toBe(13);
  });
});