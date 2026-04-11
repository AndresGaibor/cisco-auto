import { describe, expect, test } from "bun:test";
import { composeRuntime } from "../compose.ts";
import { renderRuntimeSource } from "../index.ts";
import { validateRuntimeJs } from "../runtime-validator.ts";
import { RUNTIME_JS_TEMPLATE } from "../templates/runtime.ts";

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

const mainLifecycleSymbols = [
  "activateRuntimeAfterLease",
  "pollCommandQueue",
  "pollDeferredCommands",
  "cleanupStaleInFlightOnStartup",
  "loadRuntime",
  "writeHeartbeat",
  "setupFileWatcher",
  "startLeaseHealthMonitor",
  "leaseHealthInterval",
  "heartbeatInterval",
  "commandPollInterval",
  "deferredPollInterval",
  "commands/",
  "in-flight/",
  "dead-letter/",
];

describe("runtime contract", () => {
  test("composeRuntime stays aligned with the exported runtime template", () => {
    expect(composeRuntime()).toBe(RUNTIME_JS_TEMPLATE);
  });

  test("runtime stays focused on pure handlers and validates cleanly", () => {
    const runtime = renderRuntimeSource();
    const validation = validateRuntimeJs(runtime);

    expect(validation.ok).toBe(true);
    expect(runtime).toContain("IOS_JOBS");
    expect(runtime).toContain("__pollDeferred");
    expect(runtime).toContain("handlePollDeferred");

    for (const symbol of pureHandlerSymbols) {
      expect(runtime).toContain(`function ${symbol}(`);
    }

    for (const symbol of mainLifecycleSymbols) {
      expect(runtime).not.toContain(symbol);
    }
  });
});
