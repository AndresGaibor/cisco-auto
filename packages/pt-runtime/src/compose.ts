// ============================================================================
// Runtime Composer - Assembles handlers into executable runtime.js
// ============================================================================

import { generateRuntimeCode } from "./runtime-generator";
import { validateRuntimeCode } from "./runtime-validator";
import {
  type HandlerDeps,
  type HandlerResult,
} from "./utils/helpers";
import {
  handleAddDevice,
  handleRemoveDevice,
  handleListDevices,
  handleRenameDevice,
} from "./handlers/device";
import { handleAddLink, handleRemoveLink } from "./handlers/link";
import { handleConfigHost, handleConfigIos, handleExecIos } from "./handlers/config";
import { handleInspect, handleSnapshot } from "./handlers/inspect";
import { handleAddModule, handleRemoveModule } from "./handlers/module";
import { handleListCanvasRects, handleGetRect, handleDevicesInRect } from "./handlers/canvas";

// ============================================================================
// Handler Map Type
// ============================================================================

type HandlerFn = (payload: Record<string, unknown>, deps: HandlerDeps) => HandlerResult;

interface HandlerMap {
  [key: string]: HandlerFn;
}

// ============================================================================
// Compose Runtime
// ============================================================================

/**
 * Generate the complete runtime.js code
 * This function creates a self-contained JavaScript string that runs in PT
 */
export function composeRuntime(): string {
  const code = generateRuntimeCode();

  // Validate before returning - fail fast if generation produced bad code
  validateRuntimeCode(code);

  return code;
}

// ============================================================================
// Exports
// ============================================================================

export const HANDLERS: HandlerMap = {
  addDevice: (p, d) => handleAddDevice(p as unknown as Parameters<typeof handleAddDevice>[0], d),
  removeDevice: (p, d) => handleRemoveDevice(p as unknown as Parameters<typeof handleRemoveDevice>[0], d),
  listDevices: (p, d) => handleListDevices(p as unknown as Parameters<typeof handleListDevices>[0], d),
  renameDevice: (p, d) => handleRenameDevice(p as unknown as Parameters<typeof handleRenameDevice>[0], d),
  addLink: (p, d) => handleAddLink(p as unknown as Parameters<typeof handleAddLink>[0], d),
  removeLink: (p, d) => handleRemoveLink(p as unknown as Parameters<typeof handleRemoveLink>[0], d),
  configHost: (p, d) => handleConfigHost(p as unknown as Parameters<typeof handleConfigHost>[0], d),
  configIos: (p, d) => handleConfigIos(p as unknown as Parameters<typeof handleConfigIos>[0], d),
  execIos: (p, d) => handleExecIos(p as unknown as Parameters<typeof handleExecIos>[0], d),
  snapshot: (p, d) => handleSnapshot(p as unknown as Parameters<typeof handleSnapshot>[0], d),
  inspect: (p, d) => handleInspect(p as unknown as Parameters<typeof handleInspect>[0], d),
  addModule: (p, d) => handleAddModule(p as unknown as Parameters<typeof handleAddModule>[0], d),
  removeModule: (p, d) => handleRemoveModule(p as unknown as Parameters<typeof handleRemoveModule>[0], d),
  listCanvasRects: (p, d) => handleListCanvasRects(p as unknown as Parameters<typeof handleListCanvasRects>[0], d),
  getRect: (p, d) => handleGetRect(p as unknown as Parameters<typeof handleGetRect>[0], d),
  devicesInRect: (p, d) => handleDevicesInRect(p as unknown as Parameters<typeof handleDevicesInRect>[0], d),
};
