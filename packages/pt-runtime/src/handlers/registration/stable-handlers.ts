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

import { handleAddLink, handleRemoveLink, handleVerifyLink, handleListLinks } from "../link.js";

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
  handleDeviceInfo,
  handleDeviceListMethods,
} from "../device-info.js";

import { handleDevicePower } from "../device-power.js";

import { handleDeviceDhcpFlag } from "../device-dhcp-flag.js";

import {
  handleSetPortMtu,
  handleSetPortDns,
} from "../port-config.js";

import {
  handleFileRead,
  handleFileWrite,
  handleFileList,
  handleFileExists,
  handleFileMakeDir,
  handleFileRemove,
} from "../file-operations.js";

import {
  handleAddModule,
  handleRemoveModule,
  handleInspectModuleSlots,
} from "../module/index.js";

import {
  handleInspect,
  handleInspectDeviceFast,
  handleSnapshot,
  handleHardwareInfo,
  handleHardwareCatalog,
  handleCommandLog,
} from "../inspect.js";

import { handleConfigHost } from "../host-handler.js";
import { handleTerminalPlanRun } from "../terminal-plan-run.js";
import { handleTerminalNativeExec } from "../terminal-native-exec.js";
import { handlePollDeferred } from "../poll-deferred.js";
import {
  handleSubscribeTerminalEvents,
  handlePollTerminalEvents,
  handleUnsubscribeTerminalEvents,
  handleListSubscriptions,
} from "../terminal-events.js";
import {
  handleSubscribeIpcEvents,
  handlePollIpcEvents,
} from "../ipc-events.js";
import {
  handleExecIos,
  handleConfigIos,
  handleExecPc,
  handleReadTerminal,
} from "../ios/index.js";

import {
  handleProjectStatus,
  handleProjectSave,
  handleProjectSnapshotBegin,
  handleProjectSnapshotRead,
  handleProjectSnapshotClear,
  handleProjectOpen,
} from "../project.js";

let stableHandlersRegistered = false;

function handleRuntimePing(_payload: Record<string, unknown>, deps: any): any {
  return {
    ok: true,
    action: "__ping",
    pong: true,
    ts: Date.now(),
    runtimeLoaded: true,
  };
}

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
 * - deepInspect (movido a extended)
 */
export function registerStableRuntimeHandlers(): void {
  if (stableHandlersRegistered) {
    return;
  }

  stableHandlersRegistered = true;

  registerHandler("configHost", handleConfigHost as unknown as HandlerFn);
  registerHandler("terminal.plan.run", handleTerminalPlanRun as unknown as HandlerFn);
  registerHandler("terminal.native.exec", handleTerminalNativeExec as unknown as HandlerFn);
  registerHandler("__pollDeferred", handlePollDeferred as unknown as HandlerFn);

  registerHandler("configIos", handleConfigIos as unknown as HandlerFn);
  registerHandler("execIos", handleExecIos as unknown as HandlerFn);
  registerHandler("__ping", handleRuntimePing as unknown as HandlerFn);
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
  registerHandler("verifyLink", handleVerifyLink as unknown as HandlerFn);
  registerHandler("listLinks", handleListLinks as unknown as HandlerFn);

  registerHandler("listCanvasRects", handleListCanvasRects as unknown as HandlerFn);
  registerHandler("getRect", handleGetRect as unknown as HandlerFn);
  registerHandler("devicesInRect", handleDevicesInRect as unknown as HandlerFn);
  registerHandler("clearCanvas", handleClearCanvas as unknown as HandlerFn);

  registerHandler("addModule", handleAddModule as unknown as HandlerFn);
  registerHandler("removeModule", handleRemoveModule as unknown as HandlerFn);
  registerHandler("inspectModuleSlots", handleInspectModuleSlots as unknown as HandlerFn);

  registerHandler("inspect", handleInspect as unknown as HandlerFn);
  registerHandler("inspectDeviceFast", handleInspectDeviceFast as unknown as HandlerFn);
  registerHandler("snapshot", handleSnapshot as unknown as HandlerFn);
  registerHandler("hardwareInfo", handleHardwareInfo as unknown as HandlerFn);
  registerHandler("hardwareCatalog", handleHardwareCatalog as unknown as HandlerFn);
  registerHandler("commandLog", handleCommandLog as unknown as HandlerFn);

  registerHandler("__projectStatus", handleProjectStatus as unknown as HandlerFn);
  registerHandler("__projectSave", handleProjectSave as unknown as HandlerFn);
  registerHandler("__projectSnapshotBegin", handleProjectSnapshotBegin as unknown as HandlerFn);
  registerHandler("__projectSnapshotRead", handleProjectSnapshotRead as unknown as HandlerFn);
  registerHandler("__projectSnapshotClear", handleProjectSnapshotClear as unknown as HandlerFn);
  registerHandler("__projectOpen", handleProjectOpen as unknown as HandlerFn);

  registerHandler("subscribeTerminalEvents", handleSubscribeTerminalEvents as unknown as HandlerFn);
  registerHandler("pollTerminalEvents", handlePollTerminalEvents as unknown as HandlerFn);
  registerHandler("unsubscribeTerminalEvents", handleUnsubscribeTerminalEvents as unknown as HandlerFn);
  registerHandler("listSubscriptions", handleListSubscriptions as unknown as HandlerFn);
  registerHandler("subscribeIpcEvents", handleSubscribeIpcEvents as unknown as HandlerFn);
  registerHandler("pollIpcEvents", handlePollIpcEvents as unknown as HandlerFn);

  registerHandler("deviceInfo", handleDeviceInfo as unknown as HandlerFn);
  registerHandler("deviceListMethods", handleDeviceListMethods as unknown as HandlerFn);
  registerHandler("devicePower", handleDevicePower as unknown as HandlerFn);
  registerHandler("deviceDhcpFlag", handleDeviceDhcpFlag as unknown as HandlerFn);
  registerHandler("setPortMtu", handleSetPortMtu as unknown as HandlerFn);
  registerHandler("setPortDns", handleSetPortDns as unknown as HandlerFn);
  registerHandler("fileRead", handleFileRead as unknown as HandlerFn);
  registerHandler("fileWrite", handleFileWrite as unknown as HandlerFn);
  registerHandler("fileList", handleFileList as unknown as HandlerFn);
  registerHandler("fileExists", handleFileExists as unknown as HandlerFn);
  registerHandler("fileMakeDir", handleFileMakeDir as unknown as HandlerFn);
  registerHandler("fileRemove", handleFileRemove as unknown as HandlerFn);
}