import type { HandlerFn } from "../dispatcher.js";
import { registerHandler } from "../dispatcher.js";

import {
  handleEnsureVlans,
  handleConfigVlanInterfaces,
} from "../vlan.js";

import {
  handleConfigDhcpServer,
  handleInspectDhcpServer,
} from "../dhcp.js";

import { handleInspectHost } from "../host.js";

import {
  handleListDevices,
  handleAddDevice,
  handleRemoveDevice,
  handleRenameDevice,
  handleMoveDevice,
} from "../device.js";

import { handleAddLink, handleRemoveLink } from "../link.js";

import {
  handleSetDeviceIp,
  handleSetDefaultGateway,
} from "../device-config.js";

import {
  handleListCanvasRects,
  handleGetRect,
  handleDevicesInRect,
  handleClearCanvas,
} from "../canvas.js";

import {
  handleAddModule,
  handleRemoveModule,
} from "../module/index.js";

import { handleDeepInspect } from "../deep-inspect.js";

import {
  handleInspect,
  handleSnapshot,
  handleHardwareInfo,
  handleHardwareCatalog,
  handleCommandLog,
} from "../inspect.js";

import { handleConfigHost } from "../host-handler.js";

import {
  handleConfigIos,
  handleExecIos,
  handleDeferredPoll,
  handlePing,
  handleExecPc,
  handleReadTerminal,
} from "../ios/index.js";

let stableHandlersRegistered = false;

/**
 * Registra únicamente handlers operativos/estables.
 *
 * No registrar aquí:
 * - __evaluate
 * - omni.*
 * - siphon*
 * - exfiltrate*
 * - skipBoot
 * - evaluateInternalVariable
 */
export function registerStableRuntimeHandlers(): void {
  if (stableHandlersRegistered) {
    return;
  }

  stableHandlersRegistered = true;

  registerHandler("configHost", handleConfigHost as unknown as HandlerFn);
  registerHandler("configIos", handleConfigIos as unknown as HandlerFn);
  registerHandler("execIos", handleExecIos as unknown as HandlerFn);
  registerHandler("__pollDeferred", handleDeferredPoll as unknown as HandlerFn);
  registerHandler("__ping", handlePing as unknown as HandlerFn);
  registerHandler("execPc", handleExecPc as unknown as HandlerFn);
  registerHandler("readTerminal", handleReadTerminal as unknown as HandlerFn);

  registerHandler("ensureVlans", handleEnsureVlans as unknown as HandlerFn);
  registerHandler("configVlanInterfaces", handleConfigVlanInterfaces as unknown as HandlerFn);
  registerHandler("configDhcpServer", handleConfigDhcpServer as unknown as HandlerFn);
  registerHandler("inspectDhcpServer", handleInspectDhcpServer as unknown as HandlerFn);
  registerHandler("inspectHost", handleInspectHost as unknown as HandlerFn);

  registerHandler("listDevices", handleListDevices as unknown as HandlerFn);
  registerHandler("addDevice", handleAddDevice as unknown as HandlerFn);
  registerHandler("removeDevice", handleRemoveDevice as unknown as HandlerFn);
  registerHandler("renameDevice", handleRenameDevice as unknown as HandlerFn);
  registerHandler("moveDevice", handleMoveDevice as unknown as HandlerFn);

  registerHandler("setDeviceIp", handleSetDeviceIp as unknown as HandlerFn);
  registerHandler("setDefaultGateway", handleSetDefaultGateway as unknown as HandlerFn);

  registerHandler("addLink", handleAddLink as unknown as HandlerFn);
  registerHandler("removeLink", handleRemoveLink as unknown as HandlerFn);

  registerHandler("listCanvasRects", handleListCanvasRects as unknown as HandlerFn);
  registerHandler("getRect", handleGetRect as unknown as HandlerFn);
  registerHandler("devicesInRect", handleDevicesInRect as unknown as HandlerFn);
  registerHandler("clearCanvas", handleClearCanvas as unknown as HandlerFn);

  registerHandler("addModule", handleAddModule as unknown as HandlerFn);
  registerHandler("removeModule", handleRemoveModule as unknown as HandlerFn);

  registerHandler("inspect", handleInspect as unknown as HandlerFn);
  registerHandler("snapshot", handleSnapshot as unknown as HandlerFn);
  registerHandler("hardwareInfo", handleHardwareInfo as unknown as HandlerFn);
  registerHandler("hardwareCatalog", handleHardwareCatalog as unknown as HandlerFn);
  registerHandler("commandLog", handleCommandLog as unknown as HandlerFn);

  // Deep inspect sigue siendo estable porque ya existía como comando de inspección
  // explícito y no ejecuta evaluación arbitraria.
  registerHandler("deepInspect", handleDeepInspect as unknown as HandlerFn);
}
