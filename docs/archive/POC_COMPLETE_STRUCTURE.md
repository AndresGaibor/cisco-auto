/**
 * POC: Complete Runtime Structure (TypeScript → ES5)
 * 
 * This shows what the migrated src/runtime/ structure would look like
 */

// ============================================================================
// File: packages/pt-runtime/src/runtime/types.ts
// ============================================================================

export interface HandlerPayload {
  type: string;
  [key: string]: unknown;
}

export interface HandlerDependencies {
  ipc: any;
  dprint: (msg: string) => void;
}

export interface HandlerResult {
  ok: boolean;
  error?: string;
  value?: unknown;
}

export type HandlerFunction = (
  payload: HandlerPayload,
  deps: HandlerDependencies
) => HandlerResult;

// ============================================================================
// File: packages/pt-runtime/src/runtime/constants.ts
// ============================================================================

export const CABLE_TYPES = {
  "ethernet-straight": 8100,
  "ethernet-cross": 8101,
  "straight": 8100,
  "cross": 8101,
  "roll": 8102,
  "fiber": 8103,
  "phone": 8104,
  "cable": 8105,
  "serial": 8106,
  "auto": 8107,
  "console": 8108,
  "wireless": 8109,
  "coaxial": 8110,
  "octal": 8111,
  "cellular": 8112,
  "usb": 8113,
  "custom_io": 8114,
} as const;

export const DEVICE_TYPES = {
  "router": 0,
  "switch": 1,
  "cloud": 2,
  "bridge": 3,
  "hub": 4,
  "repeater": 5,
  "coaxialSplitter": 6,
  "wireless": 7,
  "pc": 8,
  "server": 9,
  "printer": 10,
  "wirelessRouter": 11,
  "ipPhone": 12,
  "dslModem": 13,
  "cableModem": 14,
  "multilayerSwitch": 16,
  "laptop": 18,
  "tablet": 19,
  "smartphone": 20,
  "wirelessEndDevice": 21,
  "wiredEndDevice": 22,
  "tv": 23,
  "homeVoip": 24,
  "analogPhone": 25,
  "firewall": 27,
  "dlc": 29,
  "homeRouter": 30,
  "cellTower": 31,
  "centralOfficeServer": 32,
  "iot": 34,
  "sniffer": 35,
  "mcu": 36,
  "sbc": 37,
  "embeddedServer": 40,
  "wlc": 41,
  "aironet": 44,
  "powerDistribution": 45,
  "patchPanel": 46,
  "wallMount": 47,
  "meraki": 48,
  "merakiServer": 49,
  "networkController": 50,
} as const;

// ============================================================================
// File: packages/pt-runtime/src/runtime/helpers.ts
// ============================================================================

import { DEVICE_TYPES } from "./constants.js";

/**
 * Validate device type
 */
export function isValidDeviceType(type: unknown): boolean {
  if (typeof type !== "string" && typeof type !== "number") {
    return false;
  }
  const typeStr = String(type).toLowerCase();
  return typeStr in DEVICE_TYPES;
}

/**
 * Get device type code
 */
export function getDeviceTypeCode(type: string): number | null {
  const typeStr = type.toLowerCase();
  if (typeStr in DEVICE_TYPES) {
    return DEVICE_TYPES[typeStr as keyof typeof DEVICE_TYPES];
  }
  return null;
}

/**
 * Format error message with context
 */
export function formatError(message: string, context?: Record<string, unknown>): string {
  if (!context) return message;
  
  let result = message + " [";
  let first = true;
  
  for (const [key, value] of Object.entries(context)) {
    if (!first) result += ", ";
    result += key + "=" + JSON.stringify(value);
    first = false;
  }
  
  result += "]";
  return result;
}

// ============================================================================
// File: packages/pt-runtime/src/runtime/handlers/device.ts
// ============================================================================

import type { HandlerPayload, HandlerDependencies, HandlerResult } from "../types.js";
import { getDeviceTypeCode, formatError } from "../helpers.js";

export interface AddDevicePayload extends HandlerPayload {
  type: "addDevice";
  name: string;
  model: string;
  x: number;
  y: number;
}

/**
 * Handle device addition
 */
export function handleAddDevice(
  payload: AddDevicePayload,
  deps: HandlerDependencies
): HandlerResult {
  try {
    const { ipc, dprint } = deps;
    const { name, model, x, y } = payload;
    
    if (!name || typeof name !== "string") {
      throw new Error("Invalid device name");
    }
    
    if (!model || typeof model !== "string") {
      throw new Error("Invalid device model");
    }
    
    const typeCode = getDeviceTypeCode(model);
    if (typeCode === null) {
      throw new Error(formatError("Unknown device type", { model }));
    }
    
    // Call PT API (IPC)
    const result = ipc.addDevice(name, typeCode, x, y);
    
    dprint("[ADD_DEVICE] Success: " + name);
    
    return {
      ok: true,
      value: { deviceId: name, model, x, y },
    };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    deps.dprint("[ADD_DEVICE] Error: " + message);
    
    return {
      ok: false,
      error: message,
    };
  }
}

// ============================================================================
// File: packages/pt-runtime/src/runtime/handlers/index.ts
// ============================================================================

import type { HandlerPayload, HandlerDependencies, HandlerResult, HandlerFunction } from "../types.js";
import { handleAddDevice } from "./device.js";

// Type-safe handler registry
const handlers: Record<string, HandlerFunction> = {
  addDevice: handleAddDevice as HandlerFunction,
  // ... more handlers
};

/**
 * Dispatch command to appropriate handler
 */
export function dispatch(
  payload: HandlerPayload,
  deps: HandlerDependencies
): HandlerResult {
  const handler = handlers[payload.type];
  
  if (!handler) {
    return {
      ok: false,
      error: "Unknown handler type: " + payload.type,
    };
  }
  
  try {
    return handler(payload, deps);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: "Handler error: " + message,
    };
  }
}

// ============================================================================
// File: packages/pt-runtime/src/runtime/index.ts
// ============================================================================

import type { HandlerPayload, HandlerDependencies, HandlerResult } from "./types.js";
import { dispatch } from "./handlers/index.js";

/**
 * Main runtime entry point
 * Called from PT main.js with: runtime(payload, ipc, dprint)
 * 
 * Example:
 *   var result = runtime({ type: "addDevice", name: "R1", model: "router" }, ipc, dprint);
 */
export function runtime(
  payload: HandlerPayload,
  ipc: any,
  dprint: (msg: string) => void
): HandlerResult {
  const deps: HandlerDependencies = { ipc, dprint };
  
  try {
    dprint("[RUNTIME] Command: " + payload.type);
    const result = dispatch(payload, deps);
    dprint("[RUNTIME] Result: " + (result.ok ? "OK" : "FAIL"));
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dprint("[RUNTIME] Fatal error: " + message);
    
    return {
      ok: false,
      error: "Runtime fatal: " + message,
    };
  }
}

// Make it global for PT to call
declare global {
  var runtime: typeof runtime;
}

(globalThis as any).runtime = runtime;

// ============================================================================
// COMPILATION OUTPUT (ES5, What PT Gets)
// ============================================================================

/*
After: tsc -p tsconfig.runtime.json
Output file: packages/generated/runtime.js

The ES5 output would be:

---
var CABLE_TYPES = {
  "ethernet-straight": 8100,
  // ...
};

function isValidDeviceType(type) {
  // ES5 implementation
}

function handleAddDevice(payload, deps) {
  try {
    // implementation
  } catch (error) {
    // error handling
  }
}

function dispatch(payload, deps) {
  var handler = handlers[payload.type];
  if (!handler) {
    return { ok: false, error: "Unknown handler type: " + payload.type };
  }
  // ...
}

function runtime(payload, ipc, dprint) {
  var deps = { ipc: ipc, dprint: dprint };
  try {
    dprint("[RUNTIME] Command: " + payload.type);
    var result = dispatch(payload, deps);
    return result;
  } catch (error) {
    // error handling
  }
}

globalThis.runtime = runtime;
---

Perfect! This is EXACTLY what PT needs, BUT:
- You developed it with TypeScript types ✅
- You have full IDE support ✅
- You can refactor safely ✅
- ESLint validates everything ✅
- No "string template" complexity ✅
*/

// ============================================================================
// DIRECTORY STRUCTURE AFTER MIGRATION
// ============================================================================

/*
packages/pt-runtime/
├── src/
│   ├── runtime/                    # ← NEW: Actual runtime code
│   │   ├── index.ts                # Entry point (main dispatcher)
│   │   ├── types.ts                # Shared types
│   │   ├── constants.ts            # Constants (was constants-template.ts)
│   │   ├── helpers.ts              # Helpers (was helpers-template.ts)
│   │   ├── session.ts              # Session management
│   │   └── handlers/
│   │       ├── index.ts            # Handler registry
│   │       ├── device.ts           # Device handlers
│   │       ├── link.ts             # Link handlers
│   │       ├── config.ts           # Config handlers
│   │       └── ...
│   │
│   ├── index.ts                    # Generator CLI (reads compiled runtime)
│   ├── compose.ts                  # SIMPLIFIED: No longer generates strings
│   ├── templates/                  # DEPRECATED: Keep for migration only
│   ├── handlers/                   # MOVED: logic now in runtime/handlers/
│   └── ...
│
├── dist/                           # Library exports (tsc output)
│   ├── runtime/
│   ├── index.d.ts
│   └── ...
│
├── generated/
│   ├── runtime.js                  # ← ES5 compiled runtime (read by PT)
│   └── main.js
│
├── tsconfig.json                   # Library config (ES2022, dist/)
├── tsconfig.runtime.json           # ← NEW: Runtime config (ES5, generated/)
└── package.json
*/

// ============================================================================
// BENEFITS SUMMARY
// ============================================================================

/*
BEFORE (String Templates):
❌ Untyped generated code
❌ Two-phase compilation (confusing)
❌ Hard to refactor
❌ Manual string concatenation error-prone
❌ Validator is smoke-test only
❌ No intellisense in templates

AFTER (TypeScript Source):
✅ Fully typed in development
✅ Single compilation phase
✅ Refactor-safe (rename, move, delete work)
✅ Type-checked at compile time
✅ ESLint validates all code
✅ Full intellisense and autocomplete
✅ Can use TypeScript idioms (interfaces, generics, readonly)
✅ Same ES5 output for PT
✅ Easier testing
✅ Better error messages
*/
