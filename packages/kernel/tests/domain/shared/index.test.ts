import { describe, test, expect } from 'bun:test';

describe('Kernel Package Structure', () => {
  test('kernel exports are defined', async () => {
    const kernel = await import('@cisco-auto/kernel');
    expect(kernel).toBeDefined();
  });

  test('domain exports are defined', async () => {
    const domain = await import('@cisco-auto/kernel/domain');
    expect(domain).toBeDefined();
  });

  test('application exports are defined', async () => {
    const app = await import('@cisco-auto/kernel/application');
    expect(app).toBeDefined();
  });

  test('plugin-api exports are defined', async () => {
    const plugin = await import('@cisco-auto/kernel/plugin-api');
    expect(plugin).toBeDefined();
  });
});