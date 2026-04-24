// ============================================================================
// Runtime Handlers - Fascia delgada (Barrel Export)
// ============================================================================
//
// Este archivo re-exporta las responsabilidades extraídas a módulos separados.
// Mantiene los handlers y su registro para compatibilidad hacia atrás.
// ============================================================================

import type { PtResult } from "../pt-api/pt-results.js";

import {
  handleEnsureVlans,
  handleConfigVlanInterfaces,
  type ConfigVlanInterfacesPayload,
} from "./vlan.js";
import {
  handleConfigDhcpServer,
  handleInspectDhcpServer,
  type ConfigDhcpServerPayload,
  type InspectDhcpServerPayload,
} from "./dhcp.js";
import { handleInspectHost, type InspectHostPayload } from "./host.js";
import {
  handleListDevices,
  handleAddDevice,
  handleRemoveDevice,
  handleRenameDevice,
  handleMoveDevice,
  type ListDevicesPayload,
} from "./device.js";
import { handleAddLink, handleRemoveLink } from "./link.js";
import { handleSetDeviceIp, handleSetDefaultGateway } from "./device-config.js";
import {
  handleListCanvasRects,
  handleGetRect,
  handleDevicesInRect,
  handleClearCanvas,
} from "./canvas.js";
import { handleAddModule, handleRemoveModule } from "./module/index.js";
import { handleDeepInspect, type DeepInspectPayload } from "./deep-inspect.js";
import { handleEvaluate, type EvaluatePayload } from "./evaluate.js";
import {
  handleSiphonPhysicalTopology,
  handleGetDeviceHardwareInfo,
  handleGetPortDeepStats,
} from "./omniscience-physical.js";
import {
  handleSiphonAllConfigs,
  handleGetAssessmentState,
  handleSetInstructionPanel,
  handleEvaluateInternalVariable,
  handleGetActivityTreeXml,
  handleExecIosOmni,
} from "./omniscience-logical.js";
import {
  handleSetEnvironmentRules,
  handleControlSimulation,
  handleGetNetworkGenoma,
  handleExfiltrateHostFile,
  handleSkipBoot,
  handleWorkspaceVisuals,
} from "./omniscience-environment.js";
import {
  handleSiphonDesktopApps,
  handleSiphonActiveProcesses,
  handleIsDesktopReady,
} from "./omniscience-telepathy.js";
import { handleKVStore, handleBase64, handleCryptoUtils } from "./omniscience-utils.js";
import {
  handleInspect,
  handleSnapshot,
  handleHardwareInfo,
  handleHardwareCatalog,
  handleCommandLog,
  type InspectPayload,
  type SnapshotPayload,
  type HardwareInfoPayload,
  type HardwareCatalogPayload,
  type CommandLogPayload,
} from "./inspect.js";
import { getParser, type ParserFn } from "./parsers/ios-parsers.js";

import {
  registerHandler,
  runtimeDispatcher,
  validateHandlerCoverage,
  HANDLER_MAP,
  type HandlerFn,
} from "./dispatcher";

// ============================================================================
// Re-exports desde módulos separados
// ============================================================================

// IOS payloads (solo tipos)
export type {
  ConfigHostPayload,
  ConfigIosPayload,
  ExecIosPayload,
  PollDeferredPayload,
  ExecPcPayload,
} from "./ios-payloads.js";

import { handleConfigHost } from "./host-handler.js";
export { handleConfigHost };

import {
  handleConfigIos,
  handleExecIos,
  handleDeferredPoll,
  handlePing,
  handleExecPc,
  handleReadTerminal,
} from "./ios-execution.js";
export {
  handleConfigIos,
  handleExecIos,
  handleDeferredPoll,
  handlePing,
  handleExecPc,
  handleReadTerminal,
};

// Otros handlers de tipos
export type {
  ConfigVlanInterfacesPayload,
  ConfigDhcpServerPayload,
  InspectDhcpServerPayload,
  InspectHostPayload,
  ListDevicesPayload,
  InspectPayload,
  SnapshotPayload,
  HardwareInfoPayload,
  HardwareCatalogPayload,
  CommandLogPayload,
  DeepInspectPayload,
  ParserFn,
};

// ============================================================================
// Handler Registration - Registro único en runtime-handlers.ts
// ============================================================================

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

// Device Config
registerHandler("setDeviceIp", handleConfigHost as unknown as HandlerFn);
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
registerHandler("deepInspect", handleDeepInspect as unknown as HandlerFn);
registerHandler("__evaluate", handleEvaluate as unknown as HandlerFn);
registerHandler("omni.evaluate.raw", handleEvaluate as unknown as HandlerFn);
registerHandler("omni.physical.siphon", handleSiphonPhysicalTopology as unknown as HandlerFn);
registerHandler("omni.logical.siphonConfigs", handleSiphonAllConfigs as unknown as HandlerFn);
registerHandler("getDeviceHardwareInfo", handleGetDeviceHardwareInfo as unknown as HandlerFn);
registerHandler("getPortDeepStats", handleGetPortDeepStats as unknown as HandlerFn);

// Omniscience Logical
registerHandler("siphonAllConfigs", handleSiphonAllConfigs as unknown as HandlerFn);
registerHandler("getAssessmentState", handleGetAssessmentState as unknown as HandlerFn);
registerHandler("setInstructionPanel", handleSetInstructionPanel as unknown as HandlerFn);
registerHandler("evaluateInternalVariable", handleEvaluateInternalVariable as unknown as HandlerFn);
registerHandler("getActivityTreeXml", handleGetActivityTreeXml as unknown as HandlerFn);
registerHandler("execIosOmni", handleExecIosOmni as unknown as HandlerFn);

// Omniscience Environment
registerHandler("setEnvironmentRules", handleSetEnvironmentRules as unknown as HandlerFn);
registerHandler("controlSimulation", handleControlSimulation as unknown as HandlerFn);
registerHandler("getNetworkGenoma", handleGetNetworkGenoma as unknown as HandlerFn);
registerHandler("exfiltrateHostFile", handleExfiltrateHostFile as unknown as HandlerFn);
registerHandler("skipBoot", handleSkipBoot as unknown as HandlerFn);
registerHandler("workspaceVisuals", handleWorkspaceVisuals as unknown as HandlerFn);

// Omniscience Telepathy
registerHandler("siphonDesktopApps", handleSiphonDesktopApps as unknown as HandlerFn);
registerHandler("siphonActiveProcesses", handleSiphonActiveProcesses as unknown as HandlerFn);
registerHandler("isDesktopReady", handleIsDesktopReady as unknown as HandlerFn);

// Omniscience Utils
registerHandler("kvStore", handleKVStore as unknown as HandlerFn);
registerHandler("base64", handleBase64 as unknown as HandlerFn);
registerHandler("cryptoUtils", handleCryptoUtils as unknown as HandlerFn);

// ============================================================================
// Barrel Exports - Re-exportar funciones del dispatcher
// ============================================================================

export { runtimeDispatcher, validateHandlerCoverage, HANDLER_MAP, getParser };
export type { HandlerFn };
