import type { RegisterToolContext } from "./tool-types.js";
import { registerStatusTool } from "./status-tool.js";
import { registerAppTool } from "./app-tool.js";
import { registerProjectTool } from "./project-tool.js";
import { registerDeviceTool } from "./device-tool.js";
import { registerLinkTool } from "./link-tool.js";
import { registerCmdRunTool } from "./cmd-run-tool.js";
import { registerCmdQueueTool } from "./cmd-queue-tool.js";
import { registerOmniTool } from "./omni-tool.js";
import { registerCliFallbackTool } from "./cli-fallback-tool.js";

export function registerAllTools(ctx: RegisterToolContext): void {
  registerStatusTool(ctx);
  registerAppTool(ctx);
  registerProjectTool(ctx);
  registerDeviceTool(ctx);
  registerLinkTool(ctx);
  registerCmdRunTool(ctx);
  registerCmdQueueTool(ctx);
  registerOmniTool(ctx);
  registerCliFallbackTool(ctx);
}
