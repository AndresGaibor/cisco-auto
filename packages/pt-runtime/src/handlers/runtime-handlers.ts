// ============================================================================
// Runtime Handlers - Public registration barrel
// ============================================================================
//
// Este archivo mantiene compatibilidad con el build actual, que usa
// handlers/runtime-handlers.ts como entrypoint.
//
// IMPORTANTE:
// - Por defecto registra solo handlers estables.
// - Experimental/omni requieren opt-in explícito vía registerRuntimeHandlers()
//   o flags globales antes de cargar runtime.js.
// ============================================================================

import type { PtResult } from "../pt-api/pt-results.js";

import { getParser, type ParserFn } from "./parsers/ios-parsers.js";

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

import {
  registerExperimentalRuntimeHandlers,
} from "./registration/experimental-handlers.js";

import {
  registerOmniRuntimeHandlers,
} from "./registration/omni-handlers.js";

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
  ParserFn,
  HandlerFn,
  RuntimeHandlerRegistrationOptions,
};

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
  getParser,
  registerRuntimeHandlers,
  registerRuntimeHandlersFromGlobals,
  registerStableRuntimeHandlers,
  registerExperimentalRuntimeHandlers,
  registerOmniRuntimeHandlers,
};
