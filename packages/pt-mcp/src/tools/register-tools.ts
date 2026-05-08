import type { RegisterToolContext } from "./tool-types.js";
import { registerAllTools } from "./register-all-tools.js";

export type RegisterToolsOptions = RegisterToolContext;

export function registerTools(options: RegisterToolsOptions): void {
  registerAllTools(options);
}
