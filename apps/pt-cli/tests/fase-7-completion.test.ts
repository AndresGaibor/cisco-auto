import { describe, expect, test } from 'bun:test';
import { getRegisteredCommandIds } from '../src/commands/command-registry';

describe('Fase 7 - Completion registry', () => {
  test('usa comandos reales registrados', () => {
    const commands = getRegisteredCommandIds();

    expect(commands).toContain('build');
    expect(commands).toContain('history');
    expect(commands).toContain('setup');
    expect(commands).toContain('runtime');
    expect(commands).toContain('status');
  });
});
