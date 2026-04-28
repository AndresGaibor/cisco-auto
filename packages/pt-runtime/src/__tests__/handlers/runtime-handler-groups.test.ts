import { describe, expect, test } from "bun:test";

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

  test("evaluate handlers are registered with aliases", () => {
    registerRuntimeHandlers();

    for (const type of evaluateHandlers) {
      expect(getHandler(type), `${type} should be registered`).toBeDefined();
    }
  });

  test("omni handlers are registered", () => {
    registerRuntimeHandlers();

    for (const type of omniHandlers) {
      expect(getHandler(type), `${type} should be registered`).toBeDefined();
    }
  });

  test("registered type list includes all handlers", () => {
    registerRuntimeHandlers();
    const registered = getRegisteredTypes();

    for (const type of [...stableHandlers, ...evaluateHandlers, ...omniHandlers]) {
      expect(registered).toContain(type);
    }
  });
});
