import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { RuntimeGenerator } from './index';

describe('Fase 7 - RuntimeGenerator', () => {
  test('generate, validate, deploy y build funcionan con semántica separada', async () => {
    const root = mkdtempSync(join(tmpdir(), 'pt-runtime-'));
    const outputDir = join(root, 'generated');
    const devDir = join(root, 'pt-dev');
    const generator = new RuntimeGenerator({ outputDir, devDir });

    const generated = await generator.generate();
    expect(generated.main.length).toBeGreaterThan(0);
    expect(generated.runtime.length).toBeGreaterThan(0);
    expect(existsSync(join(outputDir, 'main.js'))).toBe(true);
    expect(existsSync(join(outputDir, 'runtime.js'))).toBe(true);

    await generator.validateGenerated();

    await generator.deploy();
    expect(existsSync(join(devDir, 'main.js'))).toBe(true);
    expect(existsSync(join(devDir, 'runtime.js'))).toBe(true);
    expect(existsSync(join(devDir, 'manifest.json'))).toBe(true);

    await generator.build();
    expect(existsSync(join(outputDir, 'manifest.json'))).toBe(true);

    rmSync(root, { recursive: true, force: true });
  }, 30000);

  test('manifest incluye metadata de versión y checksum', async () => {
    const root = mkdtempSync(join(tmpdir(), 'pt-runtime-manifest-'));
    const generator = new RuntimeGenerator({ outputDir: join(root, 'generated'), devDir: join(root, 'pt-dev') });

    const main = generator.generateMain();
    const catalog = generator.generateCatalog();
    const runtime = generator.generateRuntime();
    await generator.writeManifest(main, catalog, runtime, join(root, 'generated'));

    const manifest = JSON.parse(readFileSync(join(root, 'generated', 'manifest.json'), 'utf-8'));
    expect(manifest.cliVersion).toBe('0.3.0');
    expect(manifest.protocolVersion).toBe(3);
    expect(manifest.mainChecksum).toBeDefined();
    expect(manifest.runtimeChecksum).toBeDefined();

    rmSync(root, { recursive: true, force: true });
  }, 30000);
});
