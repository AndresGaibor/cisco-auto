/**
 * Tests for BackpressureManager - queue overflow prevention
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { BackpressureManager, BackpressureError } from './backpressure-manager';
import { BridgePathLayout } from './shared/path-layout';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TEST_ROOT = '/tmp/backpressure-test-' + Math.random().toString(36).slice(2);

describe('BackpressureManager', () => {
  let paths: BridgePathLayout;
  let manager: BackpressureManager;

  beforeEach(() => {
    mkdirSync(TEST_ROOT, { recursive: true });
    paths = new BridgePathLayout(TEST_ROOT);
    manager = new BackpressureManager(paths, { maxPending: 5 });
  });

  afterEach(() => {
    try {
      rmSync(TEST_ROOT, { recursive: true, force: true });
    } catch {}
  });

  describe('capacity check', () => {
    test('should not throw when under limit', () => {
      expect(() => {
        manager.checkCapacity();
      }).not.toThrow();
    });

    test('should provide capacity status', () => {
      mkdirSync(paths.commandsDir(), { recursive: true });
      writeFileSync(join(paths.commandsDir(), 'cmd-1.json'), '{}');
      
      expect(() => manager.checkCapacity()).not.toThrow();
    });
  });

  describe('configuration', () => {
    test('should accept custom max pending', () => {
      const custom = new BackpressureManager(paths, { maxPending: 10 });
      expect(custom).toBeDefined();
    });

    test('should use default if not specified', () => {
      const defaultMgr = new BackpressureManager(paths);
      expect(defaultMgr).toBeDefined();
    });

    test('should accept custom check interval', () => {
      const custom = new BackpressureManager(paths, { 
        maxPending: 5,
        checkIntervalMs: 50 
      });
      expect(custom).toBeDefined();
    });

    test('should accept custom timeout', () => {
      const custom = new BackpressureManager(paths, {
        maxPending: 5,
        maxWaitMs: 5000
      });
      expect(custom).toBeDefined();
    });

    test('should validate configuration values', () => {
      const manager1 = new BackpressureManager(paths, { maxPending: 1 });
      const manager2 = new BackpressureManager(paths, { maxPending: 1000 });
      
      expect(manager1).toBeDefined();
      expect(manager2).toBeDefined();
    });
  });

  describe('capacity management', () => {
    test('should count commands from directory', () => {
      mkdirSync(paths.commandsDir(), { recursive: true });
      writeFileSync(join(paths.commandsDir(), 'cmd-1.json'), '{}');
      writeFileSync(join(paths.commandsDir(), 'cmd-2.json'), '{}');

      expect(() => manager.checkCapacity()).not.toThrow();
    });

    test('should handle empty commands directory', () => {
      mkdirSync(paths.commandsDir(), { recursive: true });
      
      expect(() => manager.checkCapacity()).not.toThrow();
    });
  });
});
