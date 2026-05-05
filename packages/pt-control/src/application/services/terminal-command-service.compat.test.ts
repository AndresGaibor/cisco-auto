import { describe, expect, test } from "bun:test";

import {
  createTerminalCommandService as fromDeprecatedShim,
} from "./terminal-command-service.js";
import {
  createTerminalCommandService as fromCanonicalModule,
} from "./terminal/terminal-command-service.js";

describe("terminal-command-service deprecated shim", () => {
  test("re-exporta la implementación canónica", () => {
    expect(fromDeprecatedShim).toBe(fromCanonicalModule);
  });
});
