import { describe, expect, test } from 'bun:test';
import { getRegisteredCommandIds } from '../src/commands/command-registry';

describe('Fase 7 - Completion registry', () => {
  test('usa comandos públicos registrados', () => {
    const commands = getRegisteredCommandIds();

    expect(commands).toEqual([
      "app",
      "bench",
      "bridge",
      "build",
      "cmd",
      "collab",
      "completion",
      "device",
      "doctor",
      "e2e",
      "link",
      "logs",
      "mcp",
      "omni",
      "project",
      "runtime",
      "set",
      "verify",
    ]);
  });
});
