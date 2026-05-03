// ============================================================================
// Runtime Handlers - Public registration barrel
// ============================================================================
//
// IMPORTANTE:
// runtime.js default agora registra apenas handlers estaveis.
// Experimental/omni foram movidos para runtime-extended.
//
// ============================================================================

import type { PtResult } from "../pt-api/pt-results.js";

import {
  runtimeDispatcher,
  validateHandlerCoverage,
  HANDLER_MAP,
  getRegisteredTypes,
  getHandler,
  type HandlerFn,
} from "./dispatcher.js";

import {
  registerRuntimeHandlers,
  registerRuntimeHandlersFromGlobals,
  type RuntimeHandlerRegistrationOptions,
} from "./registration/runtime-registration.js";

import {
  registerStableRuntimeHandlers,
} from "./registration/stable-handlers.js";

// ============================================================================
// Backward-compatible type exports
// ============================================================================

export type {
  ConfigHostPayload,
  ConfigIosPayload,
  ExecIosPayload,
  PollDeferredPayload,
  ExecPcPayload,
} from "./ios-payloads.js";

export type {
  ConfigVlanInterfacesPayload,
} from "./vlan.js";

export type {
  ConfigDhcpServerPayload,
  InspectDhcpServerPayload,
} from "./dhcp.js";

export type {
  InspectHostPayload,
} from "./host.js";

export type {
  ListDevicesPayload,
} from "./device.js";

export type {
  InspectPayload,
  SnapshotPayload,
  HardwareInfoPayload,
  HardwareCatalogPayload,
  CommandLogPayload,
} from "./inspect.js";

export type {
  DeepInspectPayload,
} from "./deep-inspect.js";

export type {
  HandlerFn,
} from "./dispatcher.js";

export type {
  RuntimeHandlerRegistrationOptions,
} from "./registration/runtime-registration.js";

// Runtime result compatibility alias used by some old tests/consumers.
export type RuntimeHandlerResult = PtResult;

function publishHandlerMap(): void {
  try {
    const scope = Function("return this")() as Record<string, unknown>;
    const registeredTypes = getRegisteredTypes();
    const handlerMap: Record<string, true> = {};

    for (let i = 0; i < registeredTypes.length; i++) {
      handlerMap[registeredTypes[i]] = true;
    }

    scope.HANDLER_MAP = handlerMap;
  } catch {
    // El runtime debe seguir cargando aunque el scope global no sea accesible.
  }
}

// ============================================================================
// Handler registration side effect
// ============================================================================

registerRuntimeHandlersFromGlobals();
publishHandlerMap();

// ============================================================================
// Public exports
// ============================================================================

export {
  runtimeDispatcher,
  validateHandlerCoverage,
  HANDLER_MAP,
  getRegisteredTypes,
  getHandler,
  registerRuntimeHandlers,
  registerRuntimeHandlersFromGlobals,
  registerStableRuntimeHandlers,
};