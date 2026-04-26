import { describe, expect, test } from "bun:test";

import {
  getHandler,
  getRegisteredTypes,
  registerRuntimeHandlers,
} from "../../handlers/runtime-handlers.js";

const stableHandlers = [
  "configHost",
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

const unsafeHandlers = [
  "__evaluate",
  "omni.evaluate.raw",
  "omni.physical.siphon",
  "omni.logical.siphonConfigs",
  "siphonAllConfigs",
  "evaluateInternalVariable",
  "getActivityTreeXml",
  "setEnvironmentRules",
  "controlSimulation",
  "getNetworkGenoma",
  "exfiltrateHostFile",
  "skipBoot",
  "workspaceVisuals",
  "siphonDesktopApps",
  "siphonActiveProcesses",
  "kvStore",
  "base64",
  "cryptoUtils",
];

describe("runtime handler groups", () => {
  test("stable handlers are registered by default", () => {
    for (const type of stableHandlers) {
      expect(getHandler(type), `${type} should be registered`).toBeDefined();
    }
  });

  test("unsafe handlers are not registered by default", () => {
    for (const type of unsafeHandlers) {
      expect(getHandler(type), `${type} should not be registered by default`).toBeUndefined();
    }
  });

  test("experimental registration enables evaluate handlers", () => {
    registerRuntimeHandlers({ experimental: true });

    expect(getHandler("__evaluate")).toBeDefined();
    expect(getHandler("omni.evaluate.raw")).toBeDefined();

    // Omni still disabled.
    expect(getHandler("siphonAllConfigs")).toBeUndefined();
    expect(getHandler("exfiltrateHostFile")).toBeUndefined();
  });

  test("omni registration enables omni handlers", () => {
    registerRuntimeHandlers({ omni: true });

    expect(getHandler("siphonAllConfigs")).toBeDefined();
    expect(getHandler("exfiltrateHostFile")).toBeDefined();
    expect(getHandler("skipBoot")).toBeDefined();
    expect(getHandler("siphonDesktopApps")).toBeDefined();
  });

  test("registered type list includes stable handlers", () => {
    const registered = getRegisteredTypes();

    for (const type of stableHandlers) {
      expect(registered).toContain(type);
    }
  });
});
