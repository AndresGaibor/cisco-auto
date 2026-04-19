import { describe, expect, test } from "bun:test";

import {
  formatDebugLogMessage,
  parseRuntimeLogMessage,
  shouldRenderDebugLogEntry,
} from "../../src/telemetry/debug-log-view.js";

describe("debug-log-view", () => {
  test("parse runtime structured message", () => {
    const parsed = parseRuntimeLogMessage(
      '[runtime] {"ts":"2026-04-17T05:41:26.000Z","level":"info","logger":"runtime","msg":"PT Runtime initialized","data":{"version":"1.0.0"}}',
    );

    expect(parsed?.logger).toBe("runtime");
    expect(parsed?.level).toBe("info");
    expect(parsed?.msg).toBe("PT Runtime initialized");
  });

  test("formats runtime structured message compactly", () => {
    const line = formatDebugLogMessage({
      seq: 1,
      timestamp: "2026-04-17T05:41:26.000Z",
      scope: "runtime",
      level: "debug",
      message:
        '[runtime] {"ts":"2026-04-17T05:41:26.000Z","level":"info","logger":"runtime","msg":"PT Runtime initialized","data":{"version":"1.0.0"}}',
    });

    expect(line).toContain("runtime info PT Runtime initialized");
    expect(line).toContain("version=1.0.0");
  });

  test("hides noisy kernel debug by default", () => {
    const show = shouldRenderDebugLogEntry(
      {
        seq: 1,
        timestamp: "2026-04-17T05:41:26.000Z",
        scope: "kernel",
        level: "debug",
        message: "poll tick: isRunning=true isShuttingDown=false active=null",
      },
      { verbose: false },
    );

    expect(show).toBe(false);
  });

  test("keeps important kernel transitions visible", () => {
    const show = shouldRenderDebugLogEntry(
      {
        seq: 1,
        timestamp: "2026-04-17T05:41:26.000Z",
        scope: "kernel",
        level: "info",
        message: "=== KERNEL BOOT COMPLETE === isRunning=true",
      },
      { verbose: false },
    );

    expect(show).toBe(true);
  });

  test("hides loader bootstrap noise by default", () => {
    const show = shouldRenderDebugLogEntry(
      {
        seq: 1,
        timestamp: "2026-04-17T06:01:42.000Z",
        scope: "loader",
        level: "debug",
        message: "[loader] Evaluating runtime code (187267 bytes)...",
      },
      { verbose: false },
    );

    expect(show).toBe(false);
  });

  test("hides queue claim parsed noise by default", () => {
    const show = shouldRenderDebugLogEntry(
      {
        seq: 1,
        timestamp: "2026-04-17T06:01:42.000Z",
        scope: "kernel",
        level: "debug",
        message: "[queue-claim] parsed: 000000008035-__ping.json",
      },
      { verbose: false },
    );

    expect(show).toBe(false);
  });

  test("keeps loader success visible", () => {
    const show = shouldRenderDebugLogEntry(
      {
        seq: 1,
        timestamp: "2026-04-17T06:01:42.000Z",
        scope: "loader",
        level: "debug",
        message: "[loader] SUCCESS: runtime.js loaded (mtime=1776423703)",
      },
      { verbose: false },
    );

    expect(show).toBe(true);
  });

  test("hides main bootstrap noise by default", () => {
    const show = shouldRenderDebugLogEntry(
      {
        seq: 1,
        timestamp: "2026-04-17T06:05:32.000Z",
        scope: "kernel",
        level: "info",
        message: "[main] PT-SCRIPT v2 active (build: 2026-04-17T11:05:20.302Z)",
      },
      { verbose: false },
    );

    expect(show).toBe(false);
  });

  test("hides kernel IIFE noise by default", () => {
    const show = shouldRenderDebugLogEntry(
      {
        seq: 1,
        timestamp: "2026-04-17T06:05:32.000Z",
        scope: "kernel",
        level: "debug",
        message: "[KERNEL-IIFE] createKernel published OK",
      },
      { verbose: false },
    );

    expect(show).toBe(false);
  });
});
