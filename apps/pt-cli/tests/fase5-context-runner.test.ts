import { expect, test, describe } from 'bun:test';
import { runCommand } from '../src/application/run-command.js';
import type { CliResult } from '../src/contracts/cli-result.js';
import type { CommandMeta } from '../src/contracts/command-meta.js';

const meta: CommandMeta = {
  id: 'config-host',
  summary: 'Configurar host',
  examples: [],
  related: [],
  requiresPT: true,
  requiresContext: true,
  supportsAutonomousUse: false,
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
