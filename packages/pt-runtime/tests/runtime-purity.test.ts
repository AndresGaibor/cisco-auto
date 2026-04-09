/**
 * Phase 3 Tests - Generated runtime purity verification
 */

import { describe, it, expect } from "bun:test";
import { composeRuntime } from "../src/compose.js";
import { generateRuntimeCode } from "../src/runtime-generator.js";

describe("Phase 3 - Generated Runtime Purity", () => {
  it("generated runtime stays pure (no queue/recovery/lease references)", () => {
    const code = generateRuntimeCode();
    expect(code).not.toContain("bridge-lease");
    expect(code).not.toContain("commands/");
    expect(code).not.toContain("in-flight/");
    expect(code).not.toContain("recoverInFlightOnStartup");
    expect(code).not.toContain("migrateLegacyCommand");
    expect(code).not.toContain("COMMAND_FILE");
  });

  it("generated runtime contains handlers and dispatcher", () => {
    const code = generateRuntimeCode();
    expect(code).toContain("configIos");
    expect(code).toContain("execIos");
    expect(code).toContain("__pollDeferred");
    expect(code).toContain("INVALID_PAYLOAD");
    expect(code).toContain("MISSING_TYPE");
    expect(code).toContain("UNKNOWN_HANDLER");
    expect(code).toContain("HANDLER_EXCEPTION");
  });

  it("composeRuntime returns valid string", () => {
    const code = composeRuntime();
    expect(typeof code).toBe("string");
    expect(code.length).toBeGreaterThan(1000);
  });

  it("generated runtime does not contain show running-config parser", () => {
    const code = generateRuntimeCode();
    expect(code).not.toContain("show running-config");
  });

  it("generated runtime contains lightweight parsers", () => {
    const code = generateRuntimeCode();
    expect(code).toContain("show ip interface brief");
    expect(code).toContain("show vlan brief");
  });
});
