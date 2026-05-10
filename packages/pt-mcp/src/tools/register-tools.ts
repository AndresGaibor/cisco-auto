import type { RegisterToolContext } from "./tool-types.js";
import { registerAllTools } from "./register-all-tools.js";
import { wrapHandler } from "./live-logger.js";

export type RegisterToolsOptions = RegisterToolContext;

function wrapAllHandlers(ctx: RegisterToolContext): void {
  const { liveWriter } = ctx;
  if (!liveWriter) return;

  const orig = ctx.server.registerTool.bind(ctx.server);

  ctx.server.registerTool = (name: string, config: any, handler: any) => {
    orig(name, config as any, wrapHandler(name, handler, liveWriter) as any);
  };
}

export function registerTools(options: RegisterToolsOptions): void {
  if (options.live) {
    wrapAllHandlers(options);
  }

  registerAllTools(options);
}
