import { describe, expect, test, vi } from "bun:test";

import {
  getHandler,
  getRegisteredTypes,
  registerRuntimeHandlers,
} from "../../handlers/runtime-handlers.js";

const stableHandlers = [
  "configHost",
  "terminal.native.exec",
  "configIos",
  "execIos",
  "__pollDeferred",
  "__ping",
  "execPc",
  "readTerminal",
  "ensureVlans",
  "configVlanInterfaces",
  "configDhcpServer",
  "inspectDhcpServer",
  "inspectHost",
  "listDevices",
  "addDevice",
  "removeDevice",
  "renameDevice",
  "moveDevice",
  "setDeviceIp",
  "setDefaultGateway",
  "addLink",
  "removeLink",
  "listCanvasRects",
  "getRect",
  "devicesInRect",
  "clearCanvas",
  "addModule",
  "removeModule",
  "inspect",
  "snapshot",
  "hardwareInfo",
  "hardwareCatalog",
  "commandLog",
  "deepInspect",
];

// Handlers experimentales/omni que ahora se registran juntos
const evaluateHandlers = [
  "__evaluate",
  "omni.evaluate.raw",
  "omni.raw",
];

const omniHandlers = [
  "omni.physical.siphon",
  "omni.logical.siphonConfigs",
  "siphonAllConfigs",
  "evaluateInternalVariable",
  "getActivityTreeXml",
  "execIosOmni",
  "setEnvironmentRules",
  "controlSimulation",
  "getNetworkGenoma",
  "exfiltrateHostFile",
  "skipBoot",
  "workspaceVisuals",
  "siphonDesktopApps",
  "siphonActiveProcesses",
  "isDesktopReady",
  "kvStore",
  "base64",
  "cryptoUtils",
];

describe("runtime handler groups", () => {
  test("stable handlers are registered", () => {
    registerRuntimeHandlers();

    for (const type of stableHandlers) {
      expect(getHandler(type), `${type} should be registered`).toBeDefined();
    }
  });

  test("evaluate handlers are registered with experimental option", () => {
    registerRuntimeHandlers({ experimental: true });

    for (const type of evaluateHandlers) {
      expect(getHandler(type), `${type} should be registered`).toBeDefined();
    }
  });

  test("full omni handlers are not registered by runtime default", () => {
    registerRuntimeHandlers();
    const registered = getRegisteredTypes();

    expect(registered).not.toContain("omni.physical.siphon");
    expect(registered).not.toContain("exfiltrateHostFile");
  });

  test("registered type list includes stable and experimental raw handlers when enabled", () => {
    registerRuntimeHandlers({ experimental: true });
    const registered = getRegisteredTypes();

    for (const type of [...stableHandlers, ...evaluateHandlers]) {
      expect(registered).toContain(type);
    }
  });

  test("__ping handler returns synchronously", () => {
    registerRuntimeHandlers();

    const handler = getHandler("__ping");
    expect(handler).toBeDefined();

    const result = handler?.({ type: "__ping" }, { dprint: vi.fn() } as any);

    expect(typeof (result as any)?.then).toBe("undefined");
    expect((result as any)?.ok).toBe(true);
    expect((result as any)?.action).toBe("__ping");
  });
});
