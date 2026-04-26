import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { PTController } from '@cisco-auto/pt-control/controller';

describe('Fase 10 - CLI integration', () => {
  let testDir: string;
  let controller: PTController;

  beforeEach(() => {
    testDir = join(tmpdir(), `pt-cli-wave10-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    controller = new PTController({ devDir: testDir });
  });

  afterEach(async () => {
    try {
      await controller.stop();
    } catch {
      // ignorar errores de apagado en tests aislados
    }

    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignorar errores de limpieza
    }
  });

  it('expone estado básico de control y contexto', () => {
    expect(controller.getBridge()).toBeDefined();
    expect(controller.readState()).toBeNull();
    expect(controller.getSystemContext().bridgeReady).toBeTypeOf('boolean');
  });
});
