// ============================================================================
// Read Terminal Handler Tests
// ============================================================================

import { describe, it, expect } from "bun:test";
import { handleReadTerminal } from "../../../packages/pt-runtime/src/handlers/ios/read-terminal-handler.ts";

describe("handleReadTerminal", () => {
  it("should return error when terminal is not accessible", () => {
    const api = {
      getDeviceByName: (_name: string) => null,
    } as any;
    const result = handleReadTerminal({ device: "R1" }, api);

    expect(result.ok).toBe(false);
    expect(result.code).toBe("NO_TERMINAL");
  });

  it("should return terminal info when accessible", () => {
    const mockTerminal = {
      getPrompt: () => "Router#",
      getOutput: () => "show ip int brief output",
      getCommandInput: () => "",
    };

    const mockSession = { history: ["show version", "show ip int brief"] };

    const api = {
      getDeviceByName: (_name: string) => ({
        getCommandLine: () => mockTerminal,
      }),
    } as any;

    // Mock getSession
    const originalSession = (globalThis as any).__mockSession;
    (globalThis as any).__mockSession = mockSession;

    try {
      const result = handleReadTerminal({ device: "R1" }, api);

      expect(result.ok).toBe(true);
      expect((result as any).device).toBe("R1");
      expect((result as any).prompt).toBe("Router#");
      expect((result as any).methods).toBeDefined();
    } finally {
      (globalThis as any).__mockSession = originalSession;
    }
  });
});
