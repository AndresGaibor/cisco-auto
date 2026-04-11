// ============================================================================
// Handlers Index - Export all handlers
// ============================================================================

export * from "./device";
export * from "./link";
export * from "./config";
export * from "./inspect";
export * from "./module";
export * from "./canvas";

export * from "./device.handler";
export * from "./link.handler";
export * from "./config.handler";
export * from "./inspect.handler";
export * from "./module.handler";
export * from "./canvas.handler";

import { globalRegistry } from "../core/registry";
import { createCanvasHandler } from "./canvas.handler";
import { createConfigHandler } from "./config.handler";
import { createDeviceHandler } from "./device.handler";
import { createInspectHandler } from "./inspect.handler";
import { createLinkHandler } from "./link.handler";
import { createModuleHandler } from "./module.handler";

export function registerAllHandlers(): void {
  globalRegistry.register(createDeviceHandler());
  globalRegistry.register(createLinkHandler());
  globalRegistry.register(createConfigHandler());
  globalRegistry.register(createInspectHandler());
  globalRegistry.register(createModuleHandler());
  globalRegistry.register(createCanvasHandler());
}

export function createDefaultHandlers() {
  return [
    createDeviceHandler(),
    createLinkHandler(),
    createConfigHandler(),
    createInspectHandler(),
    createModuleHandler(),
    createCanvasHandler(),
  ];
}
