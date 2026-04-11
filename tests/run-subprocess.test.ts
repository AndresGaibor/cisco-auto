import { describe, it, expect } from 'bun:test';
import { runSubprocess } from '../apps/pt-cli/src/system/run-subprocess.ts';

describe('runSubprocess', () => {
  it('captura stdout y stderr en una ejecución exitosa', async () => {
    const bunBin = Bun.which('bun') ?? 'bun';

    const result = await runSubprocess({
      cmd: [bunBin, '-e', "console.log('salida'); console.error('error');"],
      timeoutMs: 5000,
    });

    expect(result.ok).toBe(true);
    expect(result.success).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(0);
    expect(result.signalCode).toBeNull();
    expect(result.stdout).toContain('salida');
    expect(result.stderr).toContain('error');
  });

  it('marca timeout explícito cuando el proceso excede el límite', async () => {
    const bunBin = Bun.which('bun') ?? 'bun';

    const result = await runSubprocess({
      cmd: [bunBin, '-e', 'await Bun.sleep(2000);'],
      timeoutMs: 100,
    });

    expect(result.ok).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.errorKind).toBe('timeout');
    expect(result.errorMessage).toContain('timeout');
  });

  it('marca abort cuando se interrumpe con AbortSignal', async () => {
    const bunBin = Bun.which('bun') ?? 'bun';
    const controller = new AbortController();

    const execution = runSubprocess({
      cmd: [bunBin, '-e', 'await Bun.sleep(2000);'],
      timeoutMs: 5000,
      signal: controller.signal,
    });

    setTimeout(() => controller.abort(), 50);

    const result = await execution;

    expect(result.ok).toBe(false);
    expect(result.timedOut).toBe(false);
    expect(result.errorKind).toBe('abort');
  });

  it('timeoutMs null desactiva el timer y permite ejecución sin timeout', async () => {
    const bunBin = Bun.which('bun') ?? 'bun';

    const result = await runSubprocess({
      cmd: [bunBin, '-e', 'await Bun.sleep(50); console.log("done");'],
      timeoutMs: null,
    });

    expect(result.ok).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('done');
  });
});
