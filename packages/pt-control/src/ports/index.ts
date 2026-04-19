// Exports de todos los puertos del runtime
// Puertos de entrada para la capa de orquestación (pt-control)

import type { FileBridgePort } from "../application/ports/file-bridge.port.js";
import { RuntimePrimitiveAdapter } from "../adapters/runtime-primitive-adapter.js";
import { createRuntimeTerminalAdapter } from "../adapters/runtime-terminal-adapter.js";
import { createOmniAdapter } from "../adapters/runtime-omni-adapter.js";
import type {
  RuntimePrimitivePort,
  PrimitivePortOptions,
  PrimitivePortResult,
} from "./runtime-primitive-port.js";
import type {
  RuntimeTerminalPort,
  TerminalPortOptions,
  TerminalPortResult,
  TerminalPlan,
  TerminalPlanStep,
} from "./runtime-terminal-port.js";
import type {
  RuntimeOmniPort,
  OmniPortOptions,
  OmniPortResult,
  OmniCapabilityMetadata,
  OmniRisk,
  OmniDomain,
} from "./runtime-omni-port.js";

export type {
  RuntimePrimitivePort,
  PrimitivePortOptions,
  PrimitivePortResult,
};

export type {
  RuntimeTerminalPort,
  TerminalPortOptions,
  TerminalPortResult,
  TerminalPlan,
  TerminalPlanStep,
};

export type {
  RuntimeOmniPort,
  OmniPortOptions,
  OmniPortResult,
  OmniCapabilityMetadata,
  OmniRisk,
  OmniDomain,
};

export interface PrimitivePortFactoryOptions {
  bridge: FileBridgePort;
  defaultTimeout?: number;
}

export interface TerminalPortFactoryOptions {
  bridge: FileBridgePort;
  defaultTimeout?: number;
  generateId?: () => string;
}

export interface OmniPortFactoryOptions {
  bridge: FileBridgePort;
}

export function createPrimitivePort(options: PrimitivePortFactoryOptions): RuntimePrimitivePort {
  const adapter = new RuntimePrimitiveAdapter(options.bridge);
  return adapter;
}

export function createTerminalPort(options: TerminalPortFactoryOptions): RuntimeTerminalPort {
  const generateId = options.generateId ?? (() => `term-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  return createRuntimeTerminalAdapter({
    bridge: options.bridge,
    generateId,
    defaultTimeout: options.defaultTimeout ?? 30000,
  });
}

export function createOmniPort(options: OmniPortFactoryOptions): RuntimeOmniPort {
  return createOmniAdapter({ bridge: options.bridge });
}