// ============================================================================
// Handlers Index - Export all handlers
// ============================================================================

export * from "./device";
export * from "./link";
export * from "./config";
export * from "./inspect";
export * from "./module";
export * from "./canvas";
export * from "./vlan";
export * from "./dhcp";
export * from "./host";
export * from "./ios-engine";

export * from "./device.handler";
export * from "./link.handler";
export * from "./config.handler";
export * from "./inspect.handler";
export * from "./module.handler";
export * from "./canvas.handler";
export * from "./vlan.handler";
export * from "./dhcp.handler";
export * from "./host.handler";

import { globalRegistry } from "../core/registry";
import { createCanvasHandler } from "./canvas.handler";
import { createConfigHandler } from "./config.handler";
import { createDeviceHandler } from "./device.handler";
import { createInspectHandler } from "./inspect.handler";
import { createLinkHandler } from "./link.handler";
import { createModuleHandler } from "./module.handler";
import { createVlanHandler } from "./vlan.handler";
import { createDhcpHandler } from "./dhcp.handler";
import { createHostHandler } from "./host.handler";

export function registerAllHandlers(): void {
  globalRegistry.register(createDeviceHandler());
  globalRegistry.register(createLinkHandler());
  globalRegistry.register(createConfigHandler());
  globalRegistry.register(createInspectHandler());
  globalRegistry.register(createModuleHandler());
  globalRegistry.register(createCanvasHandler());
  globalRegistry.register(createVlanHandler());
  globalRegistry.register(createDhcpHandler());
  globalRegistry.register(createHostHandler());
}

export function createDefaultHandlers() {
  return [
    createDeviceHandler(),
    createLinkHandler(),
    createConfigHandler(),
    createInspectHandler(),
    createModuleHandler(),
    createCanvasHandler(),
    createVlanHandler(),
    createDhcpHandler(),
    createHostHandler(),
  ];
}
