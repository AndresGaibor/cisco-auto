import { expect, test, describe, vi } from 'bun:test';
import { runCommand } from '../src/application/run-command.js';
import type { CliResult } from '../src/contracts/cli-result.js';
import type { CommandMeta } from '../src/contracts/command-meta.js';

vi.mock("../src/application/controller-provider.js", () => ({
  createDefaultPTController: () => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    getBridgeStatus: () => ({ ready: true, warnings: [] }),
    getHeartbeatHealth: () => ({ state: "ok" }),
    getSystemContext: () => ({
      bridgeReady: true,
      topologyMaterialized: true,
      deviceCount: 1,
      linkCount: 0,
      heartbeat: { state: "ok" },
      warnings: [],
    }),
    getCachedSnapshot: () => ({
      devices: {
        R1: { name: "R1" },
      },
      links: {},
    }),
    drainCommandTrace: () => [],
  }),
}));

vi.mock("../src/application/context-inspector.js", () => ({
  inspectCommandContext: vi.fn().mockResolvedValue({
    bridgeReady: true,
    topologyMaterialized: true,
    deviceCount: 1,
    linkCount: 0,
    heartbeat: { state: "ok" },
    bridge: { ready: true, warnings: [] },
    warnings: [],
    notes: [],
  }),
}));

vi.mock("../src/application/context-supervisor.js", () => ({
  collectContextStatus: vi.fn().mockResolvedValue({
    schemaVersion: "1.0",
    updatedAt: new Date().toISOString(),
    mode: "active",
    gracePeriod: {
      active: false,
      startedAt: new Date().toISOString(),
      endsAt: new Date().toISOString(),
      remainingMs: 0,
    },
    heartbeat: { state: "ok" },
    bridge: { ready: true, queuedCount: 0, inFlightCount: 0, warnings: [] },
    topology: { materialized: true, deviceCount: 1, linkCount: 0, health: "ok" },
    warnings: [],
    notes: [],
  }),
  writeContextStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/telemetry/session-log-store.js", () => ({
  sessionLogStore: {
    append: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../src/telemetry/history-store.js", () => ({
  historyStore: {
    append: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../src/telemetry/bundle-writer.js", () => ({
  bundleWriter: {
    writeBundle: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../src/application/memory-persistence.js", () => ({
  persistHistoryEntryToMemory: vi.fn(),
}));

vi.mock("../src/application/contextual-suggestions.js", () => ({
  getContextualSuggestions: () => [],
}));

const meta: CommandMeta = {
  id: 'config-host',
  summary: 'Configurar host',
  examples: [],
  related: [],
  requiresPT: true,
  requiresContext: true,
};

describe('Fase 5 runCommand context', () => {
  test('persists context and warnings into meta', async () => {
    const result = await runCommand<{ ok: true }>({
      action: 'test-action',
      meta,
      flags: {
        json: false,
        jq: null,
        output: 'text',
        verbose: false,
        quiet: true,
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
        lightweightContext: false,
      },
      execute: async () => ({
        schemaVersion: '1.0',
        ok: true,
        action: 'test-action',
        data: { ok: true },
        warnings: ['warning-from-result'],
        verification: {
          executed: true,
          verified: true,
          verificationSource: ['show ip interface brief'],
          warnings: ['warning-from-verification'],
          checks: [{ name: 'check', ok: true }],
        },
      } as CliResult<{ ok: true }>),
    });

    expect(result.meta?.sessionId).toBeDefined();
    expect(result.meta?.correlationId).toBeDefined();
    expect(result.meta?.context?.bridgeReady).toBeTypeOf('boolean');
    expect(result.warnings).toContain('warning-from-result');
    expect(result.warnings).toContain('warning-from-verification');
  });
});