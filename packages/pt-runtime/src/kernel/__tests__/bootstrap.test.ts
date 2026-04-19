import { describe, expect, test } from 'bun:test';
import { bootstrapKernel, isKernelBootstrapped, type BootstrapConfig } from '../bootstrap';

describe('bootstrap', () => {
  describe('bootstrapKernel', () => {
    test('bootstrap exitosa con config valida', () => {
      const config: BootstrapConfig = {
        version: '1.0.0',
        buildFingerprint: 'fp-test',
        devDir: '/tmp/pt-dev',
        runtimeFile: '/tmp/pt-dev/runtime.js',
        pollIntervalMs: 100,
        heartbeatIntervalMs: 5000,
      };

      const result = bootstrapKernel(config);

      expect(result.success).toBe(true);
      expect(result.state).toBeDefined();
      expect(result.state.version).toBe('1.0.0');
      expect(result.state.buildFingerprint).toBe('fp-test');
      expect(result.state.bootstrapped).toBe(true);
    });

    test('result contiene estado con valores inicializados', () => {
      const config: BootstrapConfig = {
        version: '2.0.0',
        buildFingerprint: 'fp-new',
        devDir: '/tmp/pt-dev',
        runtimeFile: '/tmp/pt-dev/runtime.js',
        pollIntervalMs: 200,
        heartbeatIntervalMs: 3000,
      };

      const result = bootstrapKernel(config);

      expect(result.state.bootstrapped).toBe(true);
      expect(result.state.runtimeLoaded).toBe(true);
      expect(result.state.heartbeatState.intervalMs).toBe(3000);
      expect(result.state.lastError).toBeNull();
    });

    test('bootstrap con config vacia still creates state', () => {
      const config: BootstrapConfig = {
        version: '',
        buildFingerprint: '',
        devDir: '',
        runtimeFile: '',
        pollIntervalMs: 0,
        heartbeatIntervalMs: 0,
      };

      const result = bootstrapKernel(config);
      expect(result.success).toBe(true);
      expect(result.state).toBeDefined();
    });
  });

  describe('isKernelBootstrapped', () => {
    test('retorna true cuando bootstrapped es true', () => {
      const config: BootstrapConfig = {
        version: '1.0.0',
        buildFingerprint: 'fp-test',
        devDir: '/tmp/pt-dev',
        runtimeFile: '/tmp/pt-dev/runtime.js',
        pollIntervalMs: 100,
        heartbeatIntervalMs: 5000,
      };

      const result = bootstrapKernel(config);
      expect(isKernelBootstrapped(result.state)).toBe(true);
    });
  });
});