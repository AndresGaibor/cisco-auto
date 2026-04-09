import { expect, test, describe } from 'bun:test';
import { COMMAND_CATALOG } from '../src/commands/command-catalog.js';
import { renderCliResultText } from '../src/ux/renderers.js';

describe('Fase 5 help and renderers', () => {
  test('catalog includes status and help metadata is present', () => {
    expect(COMMAND_CATALOG.status.summary).toContain('estado');
    expect(COMMAND_CATALOG.help.summary).toContain('Ayuda');
  });

  test('renderer prints context and verification', () => {
    const output = renderCliResultText({
      schemaVersion: '1.0',
      ok: true,
      action: 'config-ios',
      data: { device: 'R1', executed: 1 },
      verification: {
        executed: true,
        verified: false,
        partiallyVerified: true,
        verificationSource: ['show ip interface brief'],
        checks: [{ name: 'show ip interface brief', ok: true, details: { rawPreview: 'ok' } }],
      },
      warnings: ['warning-1'],
      advice: ['next-step'],
      meta: {
        durationMs: 15,
        sessionId: 's1',
        correlationId: 'c1',
        context: {
          bridgeReady: true,
          topologyMaterialized: true,
          deviceCount: 1,
          linkCount: 0,
          heartbeat: { state: 'ok' },
          bridge: { ready: true },
        },
        confidence: 'partially_verified',
      },
    });

    expect(output).toContain('Contexto');
    expect(output).toContain('Verificación');
    expect(output).toContain('Confianza: partially_verified');
  });
});
