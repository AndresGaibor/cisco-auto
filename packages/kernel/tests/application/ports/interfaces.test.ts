import { describe, expect, test } from 'bun:test';
import * as applicationPortsModule from '../../../src/application/ports/index.js';
import type { BackendPort, LoggerPort, PersistencePort } from '../../../src/application/ports/index.js';

describe('application ports', () => {
  test('exports only driven ports from the barrel', async () => {
    const source = await Bun.file(new URL('../../../src/application/ports/index.ts', import.meta.url)).text();

    expect(source.trim()).toBe("export * from './driven/index.js';");
  });

  test('exports the module', () => {
    expect(applicationPortsModule).toBeDefined();
  });

  test('accept simple backend port implementations', async () => {
    const backend: BackendPort = {
      async connect() {},
      async disconnect() {},
      isConnected() {
        return true;
      },
    };

    await backend.connect({ host: 'localhost' });
    expect(backend.isConnected()).toBe(true);
  });

  test('accept simple persistence port implementations', async () => {
    const persistence: PersistencePort<{ id: string; name: string }> = {
      async findById(id) {
        return id === '1' ? { id: '1', name: 'Switch' } : null;
      },
      async save() {},
      async delete() {},
    };

    expect(await persistence.findById('1')).toEqual({ id: '1', name: 'Switch' });
  });

  test('accept simple logger implementations', () => {
    const logger: LoggerPort = {
      debug() {},
      info() {},
      warn() {},
      error() {},
    };

    logger.info('listo', { modulo: 'kernel' });
    expect(logger).toBeDefined();
  });
});
