/**
 * Tests for CheckpointManager - consumer state persistence
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { BridgePathLayout } from './shared/path-layout';
import { CheckpointManager } from './consumer-checkpoint';
import { join } from 'node:path';

const TEST_ROOT = '/tmp/checkpoint-test-' + Math.random().toString(36).slice(2);

describe('CheckpointManager', () => {
  let paths: BridgePathLayout;
  let manager: CheckpointManager;
  const consumerId = 'test-consumer';

  beforeEach(() => {
    mkdirSync(TEST_ROOT, { recursive: true });
    paths = new BridgePathLayout(TEST_ROOT);
  });

  afterEach(() => {
    try {
      rmSync(TEST_ROOT, { recursive: true, force: true });
    } catch {}
  });

  describe('read', () => {
    test('should create fresh checkpoint if none exists', () => {
      manager = new CheckpointManager(paths, consumerId, true);
      const checkpoint = manager.read();

      expect(checkpoint.consumerId).toBe(consumerId);
      expect(checkpoint.byteOffset).toBe(0);
      expect(checkpoint.lastSeq).toBe(0);
      expect(checkpoint.currentFile).toBeDefined();
    });

    test('should read existing checkpoint from disk', () => {
      mkdirSync(paths.consumerStateDir(), { recursive: true });
      const stateFile = paths.consumerCheckpointFile(consumerId);
      const checkpoint = {
        consumerId,
        currentFile: 'events.log',
        byteOffset: 1024,
        lastSeq: 42,
        updatedAt: Date.now(),
      };
      writeFileSync(stateFile, JSON.stringify(checkpoint));

      manager = new CheckpointManager(paths, consumerId, false);
      const read = manager.read();

      expect(read.byteOffset).toBe(1024);
      expect(read.lastSeq).toBe(42);
    });

    test('should handle startFromBeginning flag', () => {
      mkdirSync(paths.logsDir(), { recursive: true });
      writeFileSync(paths.currentEventsFile(), 'test content');

      manager = new CheckpointManager(paths, consumerId, true);
      const checkpoint = manager.read();

      expect(checkpoint.byteOffset).toBe(0);
    });

    test('should recover from corrupt checkpoint file', () => {
      mkdirSync(paths.consumerStateDir(), { recursive: true });
      const stateFile = paths.consumerCheckpointFile(consumerId);
      writeFileSync(stateFile, 'invalid json {{{');

      manager = new CheckpointManager(paths, consumerId, false);
      const checkpoint = manager.read();

      expect(checkpoint.byteOffset).toBe(0);
      expect(checkpoint.lastSeq).toBe(0);
    });

    test('should return copy, not reference', () => {
      manager = new CheckpointManager(paths, consumerId, true);
      const cp1 = manager.read();
      const cp2 = manager.read();

      cp1.byteOffset = 999;
      expect(cp2.byteOffset).not.toBe(999);
    });
  });

  describe('write', () => {
    beforeEach(() => {
      manager = new CheckpointManager(paths, consumerId, true);
    });

    test('should write checkpoint to disk', () => {
      const checkpoint = {
        consumerId,
        currentFile: 'events.log',
        byteOffset: 512,
        lastSeq: 10,
        updatedAt: Date.now(),
      };

      manager.write(checkpoint);

      const stateFile = paths.consumerCheckpointFile(consumerId);
      const content = readFileSync(stateFile, 'utf8');
      const saved = JSON.parse(content);

      expect(saved.byteOffset).toBe(512);
      expect(saved.lastSeq).toBe(10);
    });

    test('should skip redundant writes', () => {
      mkdirSync(paths.consumerStateDir(), { recursive: true });
      const stateFile = paths.consumerCheckpointFile(consumerId);
      
      const checkpoint = {
        consumerId,
        currentFile: 'events.log',
        byteOffset: 256,
        lastSeq: 5,
        updatedAt: Date.now(),
      };

      manager.write(checkpoint);
      const mtime1 = readFileSync(stateFile).toString();
      
      manager.write(checkpoint);
      const mtime2 = readFileSync(stateFile).toString();

      expect(mtime1).toBe(mtime2);
    });

    test('should write when byteOffset changes', () => {
      mkdirSync(paths.consumerStateDir(), { recursive: true });
      
      const checkpoint1 = {
        consumerId,
        currentFile: 'events.log',
        byteOffset: 100,
        lastSeq: 1,
        updatedAt: Date.now(),
      };

      manager.write(checkpoint1);

      const checkpoint2 = {
        ...checkpoint1,
        byteOffset: 200,
      };

      manager.write(checkpoint2);

      const stateFile = paths.consumerCheckpointFile(consumerId);
      const saved = JSON.parse(readFileSync(stateFile, 'utf8'));
      expect(saved.byteOffset).toBe(200);
    });

    test('should write when lastSeq changes', () => {
      mkdirSync(paths.consumerStateDir(), { recursive: true });
      
      const checkpoint1 = {
        consumerId,
        currentFile: 'events.log',
        byteOffset: 100,
        lastSeq: 5,
        updatedAt: Date.now(),
      };

      manager.write(checkpoint1);

      const checkpoint2 = {
        ...checkpoint1,
        lastSeq: 15,
      };

      manager.write(checkpoint2);

      const stateFile = paths.consumerCheckpointFile(consumerId);
      const saved = JSON.parse(readFileSync(stateFile, 'utf8'));
      expect(saved.lastSeq).toBe(15);
    });

    test('should write when currentFile changes', () => {
      mkdirSync(paths.consumerStateDir(), { recursive: true });
      
      const checkpoint1 = {
        consumerId,
        currentFile: 'events.log.1',
        byteOffset: 100,
        lastSeq: 5,
        updatedAt: Date.now(),
      };

      manager.write(checkpoint1);

      const checkpoint2 = {
        ...checkpoint1,
        currentFile: 'events.log.2',
      };

      manager.write(checkpoint2);

      const stateFile = paths.consumerCheckpointFile(consumerId);
      const saved = JSON.parse(readFileSync(stateFile, 'utf8'));
      expect(saved.currentFile).toBe('events.log.2');
    });
  });

  describe('fresh', () => {
    test('should create fresh checkpoint with startFromBeginning=true', () => {
      manager = new CheckpointManager(paths, consumerId, true);
      const checkpoint = manager.fresh();

      expect(checkpoint.byteOffset).toBe(0);
      expect(checkpoint.lastSeq).toBe(0);
      expect(checkpoint.consumerId).toBe(consumerId);
    });

    test('should create fresh checkpoint with startFromBeginning=false', () => {
      mkdirSync(paths.logsDir(), { recursive: true });
      writeFileSync(paths.currentEventsFile(), 'x'.repeat(1000));

      manager = new CheckpointManager(paths, consumerId, false);
      const checkpoint = manager.fresh();

      expect(checkpoint.byteOffset).toBe(1000);
    });

    test('should include currentFile in checkpoint', () => {
      manager = new CheckpointManager(paths, consumerId, true);
      const checkpoint = manager.fresh();

      expect(checkpoint.currentFile).toContain('events');
    });

    test('should set updatedAt timestamp', () => {
      manager = new CheckpointManager(paths, consumerId, true);
      const before = Date.now();
      const checkpoint = manager.fresh();
      const after = Date.now();

      expect(checkpoint.updatedAt).toBeGreaterThanOrEqual(before);
      expect(checkpoint.updatedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('cache behavior', () => {
    test('should cache checkpoint after read', () => {
      manager = new CheckpointManager(paths, consumerId, true);
      const cp1 = manager.read();
      const cp2 = manager.read();

      expect(cp1.lastSeq).toBe(cp2.lastSeq);
    });

    test('should update cache on write', () => {
      manager = new CheckpointManager(paths, consumerId, true);
      manager.read();

      const updated = {
        consumerId,
        currentFile: 'new.log',
        byteOffset: 999,
        lastSeq: 99,
        updatedAt: Date.now(),
      };

      manager.write(updated);
      const cp = manager.read();

      expect(cp.byteOffset).toBe(999);
    });
  });

  describe('edge cases', () => {
    test('should handle large byte offsets', () => {
      manager = new CheckpointManager(paths, consumerId, false);
      const checkpoint = {
        consumerId,
        currentFile: 'events.log',
        byteOffset: Number.MAX_SAFE_INTEGER,
        lastSeq: 1000000,
        updatedAt: Date.now(),
      };

      manager.write(checkpoint);
      const read = manager.read();

      expect(read.byteOffset).toBe(Number.MAX_SAFE_INTEGER);
    });

    test('should handle multiple consumer IDs', () => {
      const consumer1 = new CheckpointManager(paths, 'consumer-1', true);
      const consumer2 = new CheckpointManager(paths, 'consumer-2', true);

      const cp1 = { consumerId: 'consumer-1', currentFile: 'log1', byteOffset: 100, lastSeq: 1, updatedAt: Date.now() };
      const cp2 = { consumerId: 'consumer-2', currentFile: 'log2', byteOffset: 200, lastSeq: 2, updatedAt: Date.now() };

      consumer1.write(cp1);
      consumer2.write(cp2);

      const read1 = consumer1.read();
      const read2 = consumer2.read();

      expect(read1.byteOffset).toBe(100);
      expect(read2.byteOffset).toBe(200);
    });

    test('should handle empty currentFile', () => {
      manager = new CheckpointManager(paths, consumerId, true);
      const checkpoint = {
        consumerId,
        currentFile: '',
        byteOffset: 0,
        lastSeq: 0,
        updatedAt: Date.now(),
      };

      manager.write(checkpoint);
      const read = manager.read();

      expect(read.currentFile).toBe('');
    });
  });
});
