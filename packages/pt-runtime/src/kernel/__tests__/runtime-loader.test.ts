import { describe, expect, test } from 'bun:test';
import { createRuntimeLoader, type RuntimeLoaderConfig } from '../runtime-loader';

describe('runtime-loader', () => {
  describe('createRuntimeLoader', () => {
    test('crea loader con config basica', () => {
      const config: RuntimeLoaderConfig = {
        runtimeFile: '/tmp/pt-dev/runtime.js',
      };

      const loader = createRuntimeLoader(config);
      expect(loader).toBeDefined();
      expect(typeof loader.load).toBe('function');
      expect(typeof loader.reloadIfNeeded).toBe('function');
      expect(typeof loader.validateRuntimeBeforeLoad).toBe('function');
      expect(typeof loader.getLoadedRuntimeMetadata).toBe('function');
      expect(typeof loader.isRuntimeLoaded).toBe('function');
      expect(typeof loader.unload).toBe('function');
    });

    test('load retorna success con metadata', () => {
      const config: RuntimeLoaderConfig = {
        runtimeFile: '/tmp/pt-dev/runtime.js',
      };

      const loader = createRuntimeLoader(config);
      const result = loader.load();

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.loadCount).toBe(1);
      expect(result.metadata?.version).toBe('1.0.0');
    });

    test('isRuntimeLoaded retorna true despues de load', () => {
      const config: RuntimeLoaderConfig = {
        runtimeFile: '/tmp/pt-dev/runtime.js',
      };

      const loader = createRuntimeLoader(config);
      expect(loader.isRuntimeLoaded()).toBe(false);

      loader.load();
      expect(loader.isRuntimeLoaded()).toBe(true);
    });

    test('reloadIfNeeded retorna false si no esta cargado', () => {
      const config: RuntimeLoaderConfig = {
        runtimeFile: '/tmp/pt-dev/runtime.js',
      };

      const loader = createRuntimeLoader(config);
      const result = loader.reloadIfNeeded(() => false);
      expect(result).toBe(false);
    });

    test('validateRuntimeBeforeLoad retorna true sin validator', () => {
      const config: RuntimeLoaderConfig = {
        runtimeFile: '/tmp/pt-dev/runtime.js',
      };

      const loader = createRuntimeLoader(config);
      expect(loader.validateRuntimeBeforeLoad('some code')).toBe(true);
    });

    test('validateRuntimeBeforeLoad usa validator cuando existe', () => {
      const config: RuntimeLoaderConfig = {
        runtimeFile: '/tmp/pt-dev/runtime.js',
        validator: (code: string) => code.includes('VALID_MARKER'),
      };

      const loader = createRuntimeLoader(config);
      expect(loader.validateRuntimeBeforeLoad('code with VALID_MARKER inside')).toBe(true);
      expect(loader.validateRuntimeBeforeLoad('code without marker')).toBe(false);
    });

    test('getLoadedRuntimeMetadata retorna null inicialmente', () => {
      const config: RuntimeLoaderConfig = {
        runtimeFile: '/tmp/pt-dev/runtime.js',
      };

      const loader = createRuntimeLoader(config);
      expect(loader.getLoadedRuntimeMetadata()).toBeNull();
    });

    test('getLoadedRuntimeMetadata retorna metadata despues de load', () => {
      const config: RuntimeLoaderConfig = {
        runtimeFile: '/tmp/pt-dev/runtime.js',
      };

      const loader = createRuntimeLoader(config);
      loader.load();

      const metadata = loader.getLoadedRuntimeMetadata();
      expect(metadata).not.toBeNull();
      expect(metadata?.loadCount).toBe(1);
    });

    test('unload limpia estado', () => {
      const config: RuntimeLoaderConfig = {
        runtimeFile: '/tmp/pt-dev/runtime.js',
      };

      const loader = createRuntimeLoader(config);
      loader.load();
      expect(loader.isRuntimeLoaded()).toBe(true);

      loader.unload();
      expect(loader.isRuntimeLoaded()).toBe(false);
      expect(loader.getLoadedRuntimeMetadata()).toBeNull();
    });

    test('loadCount se incrementa en cada load', () => {
      const config: RuntimeLoaderConfig = {
        runtimeFile: '/tmp/pt-dev/runtime.js',
      };

      const loader = createRuntimeLoader(config);
      loader.load();
      loader.load();
      loader.load();

      const metadata = loader.getLoadedRuntimeMetadata();
      expect(metadata?.loadCount).toBe(3);
    });
  });
});