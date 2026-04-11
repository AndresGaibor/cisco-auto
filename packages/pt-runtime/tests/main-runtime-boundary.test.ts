import { describe, expect, test } from "bun:test";
import { renderMainSource, renderRuntimeSource } from "../src/index.js";
import { validateMainJs, validateRuntimeJs } from "../src/runtime-validator.js";

const pureRuntimeHandlers = [
  "handleAddDevice",
  "handleRemoveDevice",
  "handleListDevices",
  "handleRenameDevice",
  "handleAddLink",
  "handleRemoveLink",
  "handleConfigHost",
  "handleConfigIos",
  "handleExecIos",
  "handleExecInteractive",
  "handleSnapshot",
  "handleInspect",
  "handleAddModule",
  "handleRemoveModule",
  "handleListCanvasRects",
  "handleGetRect",
  "handleDevicesInRect",
]

const mainLifecycleSymbols = [
  "function main()",
  "activateRuntimeAfterLease",
  "pollCommandQueue",
  "pollDeferredCommands",
  "cleanupStaleInFlightOnStartup",
  "loadRuntime",
  "writeHeartbeat",
  "setupFileWatcher",
  "startLeaseHealthMonitor",
  "cleanUp",
];

function countHits(source: string, symbols: string[]): number {
  return symbols.reduce((count, symbol) => (source.includes(symbol) ? count + 1 : count), 0);
}

describe("main/runtime boundary", () => {
  test("main validates and stays on lifecycle/orchestration concerns", () => {
    const main = renderMainSource("/tmp/pt-dev");
    const validation = validateMainJs(main);

    expect(validation.ok).toBe(true);
    expect(main).toContain("function main()");
    expect(main).toContain("loadRuntime");
    expect(main).toContain("pollCommandQueue");
    expect(main).toContain("pollDeferredCommands");
    expect(main).toContain("cleanupStaleInFlightOnStartup");
    expect(main).toContain("writeHeartbeat");
    expect(main).toContain("setupFileWatcher");

    for (const symbol of pureRuntimeHandlers) {
      expect(main).not.toContain(symbol);
    }
  });

  test("runtime validates and stays on pure handler concerns", () => {
    const runtime = renderRuntimeSource();
    const validation = validateRuntimeJs(runtime);

    expect(validation.ok).toBe(true);
    expect(runtime).toContain("IOS_JOBS");
    expect(runtime).toContain("handlePollDeferred");
    expect(runtime).toContain("__pollDeferred");

    for (const symbol of pureRuntimeHandlers) {
      expect(runtime).toContain(`function ${symbol}(`);
    }

    for (const symbol of mainLifecycleSymbols) {
      if (symbol === "function main()") continue;
      expect(runtime).not.toContain(symbol);
    }
  });

  test("runtime owns more handler surface than main", () => {
    const main = renderMainSource("/tmp/pt-dev");
    const runtime = renderRuntimeSource();

    const mainHandlerHits = countHits(main, pureRuntimeHandlers);
    const runtimeHandlerHits = countHits(runtime, pureRuntimeHandlers);
    const mainLifecycleHits = countHits(main, mainLifecycleSymbols);

    expect(mainHandlerHits).toBe(0);
    expect(mainLifecycleHits).toBeGreaterThan(4);
    expect(runtimeHandlerHits).toBeGreaterThan(mainLifecycleHits);
  });
});
