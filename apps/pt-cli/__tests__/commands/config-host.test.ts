import { test, expect } from 'bun:test';
import { CONFIG_HOST_META } from '../../src/commands/config-host/meta.ts';

test('CONFIG_HOST_META tiene la estructura correcta', () => {
  expect(CONFIG_HOST_META.id).toBe('config-host');
  expect(CONFIG_HOST_META.summary).toContain('Configurar');
  expect(typeof CONFIG_HOST_META.supportsVerify).toBe('boolean');
  expect(typeof CONFIG_HOST_META.supportsJson).toBe('boolean');
  expect(typeof CONFIG_HOST_META.supportsPlan).toBe('boolean');
  expect(typeof CONFIG_HOST_META.supportsExplain).toBe('boolean');
});

test('CONFIG_HOST_META incluye ejemplos relevantes', () => {
  expect(CONFIG_HOST_META.examples.length).toBeGreaterThan(0);

  const exampleCommands = CONFIG_HOST_META.examples.map((e) => e.command);
  expect(exampleCommands).toContain('pt config-host R1 192.168.1.1 255.255.255.0');
  expect(exampleCommands).toContain('pt config-host PC1 --dhcp');
});

test('CONFIG_HOST_META soporta flags de informacion', () => {
  expect(CONFIG_HOST_META.supportsVerify).toBe(true);
  expect(CONFIG_HOST_META.supportsJson).toBe(true);
  expect(CONFIG_HOST_META.supportsPlan).toBe(true);
  expect(CONFIG_HOST_META.supportsExplain).toBe(true);
});

test('CONFIG_HOST_META tiene tags apropiados', () => {
  expect(CONFIG_HOST_META.tags).toContain('network');
  expect(CONFIG_HOST_META.tags).toContain('ip');
  expect(CONFIG_HOST_META.tags).toContain('dhcp');
});

test('CONFIG_HOST_META tiene related commands', () => {
  expect(CONFIG_HOST_META.related).toContain('device get');
  expect(CONFIG_HOST_META.related).toContain('show ip interface brief');
});

test('CONFIG_HOST_META tiene nextSteps', () => {
  expect(CONFIG_HOST_META.nextSteps.length).toBeGreaterThan(0);
  expect(CONFIG_HOST_META.nextSteps).toContain('pt device get <device>');
});
