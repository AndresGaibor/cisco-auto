import { describe, expect, test, vi } from "bun:test";
import { createSuccessResult } from "../contracts/cli-result.js";
import { runCommand } from "./run-command.js";

// Mock modules
vi.mock("./controller-provider.js", () => ({
  createDefaultPTController: () => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    getBridgeStatus: () => ({ ready: true, warnings: [] }),
    getHeartbeatHealth: () => ({ state: "ok" }),
    drainCommandTrace: () => [],
  }),
}));

const inspectContextMock = vi.fn().mockResolvedValue({
  bridgeReady: true,
  topologyMaterialized: true,
  deviceCount: 1,
  linkCount: 0,
  heartbeat: { state: "ok" },
  bridge: { ready: true, warnings: [] },
  warnings: [],
  notes: [],
});

vi.mock("./context-inspector.js", () => ({
  inspectCommandContext: inspectContextMock,
}));

const collectContextStatusMock = vi.fn().mockResolvedValue({
  bridge: { ready: true },
  topology: { health: "ok" },
  warnings: [],
  notes: [],
});

vi.mock("./context-supervisor.js", () => ({
  collectContextStatus: collectContextStatusMock,
  writeContextStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../telemetry/session-log-store.js", () => ({
  sessionLogStore: {
    append: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../telemetry/history-store.js", () => ({
  historyStore: {
    append: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../telemetry/bundle-writer.js", () => ({
  bundleWriter: {
    writeBundle: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("./memory-persistence.js", () => ({
  persistHistoryEntryToMemory: vi.fn(),
}));

vi.mock("./contextual-suggestions.js", () => ({
  getContextualSuggestions: () => [],
}));

test("runCommand attaches cli timings to result metadata", async () => {
  const result = await runCommand({
    action: "test.action",
    meta: {
      id: "test.action",
      summary: "test",
      examples: [],
      related: [],
      tags: [],
      supportsJson: true,
      supportsPlan: false,
      supportsVerify: false,
      supportsExplain: false,
    },
    flags: {
      json: true,
      jq: null,
      output: "text",
      verbose: false,
      quiet: false,
      trace: false,
      tracePayload: false,
      traceResult: false,
      traceDir: null,
      traceBundle: false,
      traceBundlePath: null,
      sessionId: null,
      examples: false,
      schema: false,
      explain: false,
      plan: false,
      verify: false,
      timeout: null,
      noTimeout: false,
      table: false,
      raw: false,
      yes: false,
      noInput: true,
      noColor: false,
      lightweightContext: true, // json mode activa lightweight automáticamente
    },
    execute: async () => createSuccessResult("test.action", { ok: true }),
  });

  const timings = (result.meta as any)?.timings?.cli;

  expect(result.ok).toBe(true);
  expect(timings).toBeDefined();
  expect(timings.controllerCreateMs).toEqual(expect.any(Number));
  expect(timings.controllerStartMs).toEqual(expect.any(Number));
  expect(timings.executeMs).toEqual(expect.any(Number));
  expect(timings.runCommandTotalMs).toEqual(expect.any(Number));
});

test("runCommand skips deep context when lightweightContext is true", async () => {
  // Reset mocks
  inspectContextMock.mockClear();
  collectContextStatusMock.mockClear();

  const result = await runCommand({
    action: "test.action",
    meta: {
      id: "test.action",
      summary: "test",
      examples: [],
      related: [],
      tags: [],
      supportsJson: true,
      supportsPlan: false,
      supportsVerify: false,
      supportsExplain: false,
    },
    flags: {
      json: false,
      jq: null,
      output: "text",
      verbose: false,
      quiet: false,
      trace: false,
      tracePayload: false,
      traceResult: false,
      traceDir: null,
      traceBundle: false,
      traceBundlePath: null,
      sessionId: null,
      examples: false,
      schema: false,
      explain: false,
      plan: false,
      verify: false,
      timeout: null,
      noTimeout: false,
      table: false,
      raw: false,
      yes: false,
      noInput: false,
      noColor: false,
      lightweightContext: true,
    },
    execute: async () => createSuccessResult("test.action", { ok: true }),
  });

  expect(result.ok).toBe(true);
  // inspectCommandContext should NOT have been called with deep inspection
  expect(inspectContextMock).not.toHaveBeenCalled();
  // collectContextStatus should NOT have been called
  expect(collectContextStatusMock).not.toHaveBeenCalled();
});
