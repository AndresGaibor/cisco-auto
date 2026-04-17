import { expect, test, describe } from "bun:test";
import { validateMainJs } from "../src/runtime-validator.ts";
import { validatePtSafe } from "../src/build/validate-pt-safe.ts";
import { renderMainSource, renderRuntimeSource } from "../src/index.js";

// Functions that should be in main kernel
const mainKernelFunctions = ["main", "cleanUp", "createJob", "getJobState", "createKernel("];

// Symbols that should be in runtime (legacy names from template)
const runtimeLegacyFunctions = [
  "handleConfigIos",
  "handleInspect",
  "handleDeferredPoll",
  "handleCommandLog",
];

describe("main/runtime boundary (kernel architecture)", () => {
  test("main validates and contains kernel functions", () => {
    const main = renderMainSource({ srcDir: "src", outputPath: "/tmp/main.js" });
    const validation = validateMainJs(main);

    if (!validation.ok) {
      console.log("Main validation failed:", validation.errors.join("\n"));
    }
    expect(validation.ok).toBe(true);

    // Verify kernel functions exist
    for (const fn of mainKernelFunctions) {
      expect(main).toContain(fn);
    }
  });

  test("runtime validates and contains handlers", () => {
    const runtime = renderRuntimeSource({ srcDir: "src", outputPath: "/tmp/runtime.js" });
    const validation = validatePtSafe(runtime);

    if (!validation.valid) {
      console.log(
        "Runtime validation failed:",
        validation.errors.map((err) => err.message).join("\n"),
      );
    }
    expect(validation.valid).toBe(true);

    // Verify runtime contains handler functions (legacy template)
    for (const symbol of runtimeLegacyFunctions) {
      expect(runtime).toContain(symbol);
    }
  });

  test("main does NOT contain handler implementations", () => {
    const main = renderMainSource({ srcDir: "src", outputPath: "/tmp/main.js" });
    for (const symbol of runtimeLegacyFunctions) {
      expect(main).not.toContain("function " + symbol);
    }
  });

  test("runtime has IOS job management", () => {
    const runtime = renderRuntimeSource({ srcDir: "src", outputPath: "/tmp/runtime.js" });
    expect(runtime).toContain("_ptDispatch");
    expect(runtime).toContain("runtimeDispatcher");
  });
});
