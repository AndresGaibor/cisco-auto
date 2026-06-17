import { describe, expect, test } from 'bun:test';
import { getRegisteredCommandIds } from '../src/commands/command-registry';

describe('Fase 7 - Completion registry', () => {
  test('usa comandos públicos registrados', () => {
    const commands = getRegisteredCommandIds();

    expect(commands).toEqual([
      "agent",
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
      "inspect",
      "link",
      "logs",
      "mcp",
      "omni",
      "project",
      "runtime",
      "save",
      "set",
      "verify",
    ]);
  });
});
