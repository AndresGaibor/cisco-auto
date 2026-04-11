/**
 * Tests for main/runtime boundary in new kernel architecture
 * Verifies: main = kernel only, runtime = business logic
 */

import { describe, expect, test } from "bun:test";
import { renderMainSource, renderRuntimeSource } from "../src/index.js";
import { validateMainJs, validateRuntimeJs } from "../src/runtime-validator.js";

// Functions that exist in the old template system (for backward compatibility check)
const runtimeLegacyFunctions = [
  "handleAddDevice",
  "handleConfigHost",
  "handleConfigIos",
  "handleExecIos",
  "handleInspect",
  "handleSnapshot",
];

// Kernel functions that should be in main
const mainKernelFunctions = [
  "function main()",
  "pollCommandQueue",
  "claimNextCommand",
  "executeActiveCommand",
  "writeResultEnvelope",
  "loadRuntime",
  "cleanUp",
  "pollDeferredJobs",
  "createJob",
  "getJobState",
  "createRuntimeApi",
  "reloadRuntimeIfNeeded",
];

// State that should be in main kernel
const mainKernelState = [
  "ACTIVE_JOBS",
  "DEVICE_SESSIONS",
];

describe("main/runtime boundary (kernel architecture)", () => {
  test("main validates and contains kernel functions", () => {
    const main = renderMainSource("/tmp/pt-dev");
    const validation = validateMainJs(main);

    expect(validation.ok).toBe(true);

    // Verify kernel functions exist
    for (const fn of mainKernelFunctions) {
      expect(main).toContain(fn);
    }

    // Verify kernel state exists
    for (const state of mainKernelState) {
      expect(main).toContain(state);
    }
  });

  test("runtime validates and contains handlers", () => {
    const runtime = renderRuntimeSource();
    const validation = validateRuntimeJs(runtime);

    expect(validation.ok).toBe(true);

    // Verify runtime contains handler functions (legacy template)
    for (const symbol of runtimeLegacyFunctions) {
      expect(runtime).toContain(symbol);
    }
  });

  test("main does NOT contain handler implementations", () => {
    const main = renderMainSource("/tmp/pt-dev");

    // Main should not have handler implementations
    expect(main).not.toContain("function handleConfigHost");
    expect(main).not.toContain("function handleConfigIos");
    expect(main).not.toContain("function handleExecIos");
    expect(main).not.toContain("function handleAddDevice");
  });

  test("runtime has IOS job management", () => {
    const runtime = renderRuntimeSource();

    // Runtime should have IOS job system
    expect(runtime).toContain("IOS_JOBS");
    expect(runtime).toContain("createIosJob");
  });
});