import { describe, expect, test } from 'bun:test';
import { getRegisteredCommandIds } from '../src/commands/command-registry';

describe('Fase 7 - Completion registry', () => {
  test('usa comandos públicos registrados', () => {
    const commands = getRegisteredCommandIds();

    expect(commands).toEqual([
      'cmd',
      'completion',
      'device',
      'doctor',
      'link',
      'omni',
      'runtime',
      'set',
      'verify',
    ]);
  });
});
