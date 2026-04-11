import { describe, expect, test } from "bun:test";
import { renderRuntimeSource } from "../index.ts";
import { validateRuntimeJs } from "../runtime-validator.ts";

const pureHandlerSymbols = [
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

// Symbols that belong to main.js lifecycle, NOT runtime
// These should NOT be present in the runtime bundle
const mainLifecycleSymbols = [
  "function main(",
  "pollCommandQueue",
  "claimNextCommand",
  "activateRuntimeAfterLease",
  "loadRuntime",
  "setupFileWatcher",
  "leaseHealthInterval",
  "heartbeatInterval",
  "commandPollInterval",
  "deferredPollInterval",
  "commands/",
  "in-flight/",
  "dead-letter/",
];

describe("runtime contract", () => {
  test("runtime validates cleanly", () => {
    const runtime = renderRuntimeSource();
    const validation = validateRuntimeJs(runtime);

    expect(validation.ok).toBe(true);
    expect(runtime).toContain("IOS_JOBS");
    expect(runtime).toContain("__pollDeferred");
    expect(runtime).toContain("handlePollDeferred");

    for (const symbol of pureHandlerSymbols) {
      expect(runtime).toContain(`function ${symbol}(`);
    }
  });

  test("runtime does not contain main lifecycle symbols", () => {
    const runtime = renderRuntimeSource();

    // These symbols belong to main.js, not runtime
    for (const symbol of mainLifecycleSymbols) {
      expect(runtime).not.toContain(symbol);
    }
  });
});
