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
import { handleListCanvasRects, handleGetRect, handleDevicesInRect } from "./canvas.js";
import { handleAddModule, handleRemoveModule } from "./module/index.js";
import { handleDeepInspect, type DeepInspectPayload } from "./deep-inspect.js";
import { handleEvaluate, type EvaluatePayload } from "./evaluate.js";
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

// Host handler
export { handleConfigHost } from "./host-handler.js";

// IOS execution handlers
export {
  handleConfigIos,
  handleExecIos,
  handleDeferredPoll,
  handlePing,
  handleExecPc,
} from "./ios-execution.js";

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

import { handleConfigHost } from "./host-handler.js";
import {
  handleConfigIos,
  handleExecIos,
  handleDeferredPoll,
  handlePing,
  handleExecPc,
} from "./ios-execution.js";

registerHandler("configHost", handleConfigHost as unknown as HandlerFn);
registerHandler("configIos", handleConfigIos as unknown as HandlerFn);
registerHandler("execIos", handleExecIos as unknown as HandlerFn);
registerHandler("__pollDeferred", handleDeferredPoll as unknown as HandlerFn);
registerHandler("__ping", handlePing as unknown as HandlerFn);
registerHandler("execPc", handleExecPc as unknown as HandlerFn);

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

registerHandler("addLink", handleAddLink as unknown as HandlerFn);
registerHandler("removeLink", handleRemoveLink as unknown as HandlerFn);

registerHandler("listCanvasRects", handleListCanvasRects as unknown as HandlerFn);
registerHandler("getRect", handleGetRect as unknown as HandlerFn);
registerHandler("devicesInRect", handleDevicesInRect as unknown as HandlerFn);

registerHandler("addModule", handleAddModule as unknown as HandlerFn);
registerHandler("removeModule", handleRemoveModule as unknown as HandlerFn);

registerHandler("inspect", handleInspect as unknown as HandlerFn);
registerHandler("snapshot", handleSnapshot as unknown as HandlerFn);
registerHandler("hardwareInfo", handleHardwareInfo as unknown as HandlerFn);
registerHandler("hardwareCatalog", handleHardwareCatalog as unknown as HandlerFn);
registerHandler("commandLog", handleCommandLog as unknown as HandlerFn);
registerHandler("deepInspect", handleDeepInspect as unknown as HandlerFn);
registerHandler("__evaluate", handleEvaluate as unknown as HandlerFn);

// ============================================================================
// Barrel Exports - Re-exportar funciones del dispatcher
// ============================================================================

export { runtimeDispatcher, validateHandlerCoverage, HANDLER_MAP, getParser };
export type { HandlerFn };
