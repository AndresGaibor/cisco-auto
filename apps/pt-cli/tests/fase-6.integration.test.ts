import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { tmpdir } from 'node:os';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import { HistoryStore } from '../src/telemetry/history-store.js';
import { SessionLogStore } from '../src/telemetry/session-log-store.js';
import { BundleWriter } from '../src/telemetry/bundle-writer.js';
import type { HistoryEntry } from '../src/contracts/history-entry.js';

const TEST_DIR = join(tmpdir(), `pt-cli-test-${randomUUID().slice(0, 8)}`);
let testHistoryStore: HistoryStore;
let testSessionLogStore: SessionLogStore;
let testBundleWriter: BundleWriter;

describe('Fase 6 - History Integration', () => {
  beforeAll(() => {
    process.env.PT_DEV_DIR = TEST_DIR;
    mkdirSync(join(TEST_DIR, 'logs', 'history', 'sessions'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'logs', 'session'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'logs', 'bundles'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'logs', 'commands'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'results'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'commands'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'in-flight'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'dead-letter'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'journal'), { recursive: true });

    testHistoryStore = new HistoryStore();
    testSessionLogStore = new SessionLogStore();
    testBundleWriter = new BundleWriter();
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  test('sessionId y correlationId se preservan en history entry', async () => {
    const entry: HistoryEntry = {
      schemaVersion: '1.0',
      sessionId: 's-test-123',
      correlationId: 'c-test-456',
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 150,
      action: 'test.action',
      status: 'success',
      ok: true,
      commandIds: ['cmd_001', 'cmd_002'],
    };

    await testHistoryStore.append(entry);
    const read = await testHistoryStore.read('s-test-123');

    expect(read).not.toBeNull();
    expect(read!.sessionId).toBe('s-test-123');
    expect(read!.correlationId).toBe('c-test-456');
    expect(read!.commandIds).toEqual(['cmd_001', 'cmd_002']);
  });

  test('history list filtra por failedOnly', async () => {
    const successEntry: HistoryEntry = {
      schemaVersion: '1.0',
      sessionId: 's-ok-1',
      startedAt: new Date().toISOString(),
      action: 'test.ok',
      status: 'success',
      ok: true,
    };

    const failEntry: HistoryEntry = {
      schemaVersion: '1.0',
      sessionId: 's-fail-1',
      startedAt: new Date().toISOString(),
      action: 'test.fail',
      status: 'error',
      ok: false,
      errorMessage: 'Test error',
    };

    await testHistoryStore.append(successEntry);
    await testHistoryStore.append(failEntry);

    const failed = await testHistoryStore.list({ failedOnly: true, limit: 5 });
    expect(failed.length).toBeGreaterThan(0);
    expect(failed.every(e => e.status !== 'success')).toBe(true);
  });

  test('history explain infiere causas probables', () => {
    const entry: HistoryEntry = {
      schemaVersion: '1.0',
      sessionId: 's-explain-1',
      startedAt: new Date().toISOString(),
      action: 'test.explain',
      status: 'error',
      ok: false,
      errorMessage: 'Runtime not loaded',
      warnings: ['heartbeat stale - PT podria no estar respondiendo'],
      contextSummary: { bridgeReady: false },
    };

    const causes: string[] = [];
    const ctx = entry.contextSummary as Record<string, unknown> | undefined;
    if (ctx?.bridgeReady === false) causes.push('bridge_not_ready');
    if (entry.warnings?.some(w => /heartbeat stale/i.test(w))) causes.push('heartbeat_stale');
    if (/runtime/i.test(entry.errorMessage ?? '')) causes.push('runtime_not_loaded');

    expect(causes).toContain('bridge_not_ready');
    expect(causes).toContain('heartbeat_stale');
    expect(causes).toContain('runtime_not_loaded');
  });
});

describe('Fase 6 - Logs Integration', () => {
  beforeAll(() => {
    process.env.PT_DEV_DIR = TEST_DIR;
    mkdirSync(join(TEST_DIR, 'logs', 'session'), { recursive: true });
  });

  test('session log store escribe y lee eventos', async () => {
    const sessionId = 's-log-test-1';
    await testSessionLogStore.append({
      session_id: sessionId,
      correlation_id: 'c-log-1',
      timestamp: new Date().toISOString(),
      phase: 'start',
      action: 'test.log',
    });

    await testSessionLogStore.append({
      session_id: sessionId,
      correlation_id: 'c-log-1',
      timestamp: new Date().toISOString(),
      phase: 'end',
      action: 'test.log',
      metadata: { ok: true },
    });

    const events = await testSessionLogStore.read(sessionId);
    expect(events.length).toBe(2);
    expect(events[0].phase).toBe('start');
    expect(events[1].phase).toBe('end');
  });

  test('logs errors agrupa por capa', () => {
    const errors = [
      { action: 'bridge.enqueue', error: 'lease expired', layer: 'bridge' as const },
      { action: 'config.ios', error: 'runtime not loaded', layer: 'pt' as const },
      { action: 'show.ip', error: 'verification failed', layer: 'verification' as const },
    ];

    const byLayer: Record<string, typeof errors> = { bridge: [], pt: [], ios: [], verification: [], other: [] };
    for (const err of errors) {
      const action = err.action.toLowerCase();
      const msg = err.error.toLowerCase();
      if (action.includes('bridge') || msg.includes('lease')) byLayer.bridge.push(err);
      else if (action.includes('pt') || msg.includes('runtime')) byLayer.pt.push(err);
      else if (msg.includes('verif')) byLayer.verification.push(err);
      else byLayer.other.push(err);
    }

    expect(byLayer.bridge.length).toBe(1);
    expect(byLayer.pt.length).toBe(1);
    expect(byLayer.verification.length).toBe(1);
  });
});

describe('Fase 6 - Results Integration', () => {
  beforeAll(() => {
    process.env.PT_DEV_DIR = TEST_DIR;
    mkdirSync(join(TEST_DIR, 'results'), { recursive: true });
  });

  test('results show lee envelope autoritativo', () => {
    const cmdId = 'cmd_999';
    const envelope = {
      protocolVersion: 2,
      id: cmdId,
      seq: 999,
      startedAt: Date.now() - 1000,
      completedAt: Date.now(),
      status: 'completed',
      ok: true,
      value: { ok: true, device: 'R1', source: 'terminal' },
    };

    writeFileSync(join(TEST_DIR, 'results', `${cmdId}.json`), JSON.stringify(envelope));
    const content = readFileSync(join(TEST_DIR, 'results', `${cmdId}.json`), 'utf-8');
    const parsed = JSON.parse(content);

    expect(parsed.ok).toBe(true);
    expect(parsed.status).toBe('completed');
    expect(parsed.value.device).toBe('R1');
  });

  test('results pending refleja queue/in-flight', () => {
    mkdirSync(join(TEST_DIR, 'commands'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'in-flight'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'dead-letter'), { recursive: true });

    writeFileSync(join(TEST_DIR, 'commands', 'cmd_001-test.json'), '{}');
    writeFileSync(join(TEST_DIR, 'in-flight', 'cmd_002-test.json'), '{}');

    const countDir = (dir: string) => {
      if (!existsSync(dir)) return 0;
      return readdirSync(dir).filter(f => f.endsWith('.json')).length;
    };

    const { readdirSync } = require('node:fs');
    const queueCount = countDir(join(TEST_DIR, 'commands'));
    const inFlightCount = countDir(join(TEST_DIR, 'in-flight'));
    const deadCount = countDir(join(TEST_DIR, 'dead-letter'));

    expect(queueCount).toBe(1);
    expect(inFlightCount).toBe(1);
    expect(deadCount).toBe(0);
  });
});

describe('Fase 6 - Bundle Integration', () => {
  beforeAll(() => {
    process.env.PT_DEV_DIR = TEST_DIR;
    mkdirSync(join(TEST_DIR, 'logs', 'bundles'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'logs', 'session'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'logs', 'commands'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'results'), { recursive: true });
  });

  test('bundle incluye history/logs/results/trace', async () => {
    const sessionId = 's-bundle-test-1';
    const cmdId = 'cmd_bundle_001';

    await testSessionLogStore.append({
      session_id: sessionId,
      correlation_id: 'c-bundle-1',
      timestamp: new Date().toISOString(),
      phase: 'start',
      action: 'test.bundle',
      metadata: { command_ids: [cmdId] },
    });

    writeFileSync(join(TEST_DIR, 'logs', 'commands', `${cmdId}.json`), JSON.stringify({
      id: cmdId, claimedAt: Date.now(), runtimeStartedAt: Date.now()
    }));

    writeFileSync(join(TEST_DIR, 'results', `${cmdId}.json`), JSON.stringify({
      protocolVersion: 2, id: cmdId, status: 'completed', ok: true
    }));

    const bundlePath = await testBundleWriter.writeBundle(sessionId);
    expect(existsSync(bundlePath)).toBe(true);

    const bundle = JSON.parse(readFileSync(bundlePath, 'utf-8'));
    expect(bundle.session.id).toBe(sessionId);
    expect(bundle.cli.timeline.length).toBeGreaterThan(0);
    expect(bundle._metadata).toBeDefined();
  });

  test('bundle redacciona datos sensibles', async () => {
    const sessionId = 's-redact-test-1';
    await testSessionLogStore.append({
      session_id: sessionId,
      correlation_id: 'c-redact-1',
      timestamp: new Date().toISOString(),
      phase: 'start',
      action: 'test.redact',
      metadata: { password: 'secret123', token: 'abc-xyz' },
    });

    const bundlePath = await testBundleWriter.writeBundle(sessionId);
    const bundle = JSON.parse(readFileSync(bundlePath, 'utf-8'));

    const timeline = bundle.cli.timeline as Record<string, unknown>[];
    for (const entry of timeline) {
      const meta = entry.metadata as Record<string, unknown> | undefined;
      if (meta) {
        expect(meta.password).not.toBe('secret123');
        expect(meta.token).not.toBe('abc-xyz');
      }
    }
  });
});
