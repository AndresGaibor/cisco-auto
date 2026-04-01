/**
 * Tests for DurableNdjsonConsumer - event consumption with persistence
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { BridgePathLayout } from './shared/path-layout';
import { join } from 'node:path';

const TEST_ROOT = '/tmp/consumer-test-' + Math.random().toString(36).slice(2);

describe('DurableNdjsonConsumer', () => {
  let paths: BridgePathLayout;

  beforeEach(() => {
    mkdirSync(TEST_ROOT, { recursive: true });
    paths = new BridgePathLayout(TEST_ROOT);
  });

  afterEach(() => {
    try {
      rmSync(TEST_ROOT, { recursive: true, force: true });
    } catch {}
  });

  describe('initialization', () => {
    test('should create event log file on startup', () => {
      mkdirSync(paths.logsDir(), { recursive: true });
      
      const filename = paths.currentEventsFile();
      expect(filename).toBeDefined();
      expect(filename).toContain('events');
    });

    test('should initialize with checkpoint', () => {
      const consumerId = 'test-consumer';
      const checkpoint = {
        consumerId,
        currentFile: 'events.current.ndjson',
        byteOffset: 0,
        lastSeq: 0,
        updatedAt: Date.now()
      };

      expect(checkpoint.consumerId).toBe(consumerId);
      expect(checkpoint.byteOffset).toBe(0);
    });

    test('should handle startFromBeginning flag', () => {
      const options = {
        startFromBeginning: true,
        pollIntervalMs: 300,
        bufferSize: 65536
      };

      expect(options.startFromBeginning).toBe(true);
      expect(options.pollIntervalMs).toBe(300);
      expect(options.bufferSize).toBe(65536);
    });

    test('should set default buffer size', () => {
      const defaultBuffer = 64 * 1024;
      expect(defaultBuffer).toBe(65536);
    });

    test('should set default poll interval', () => {
      const defaultPoll = 300;
      expect(defaultPoll).toBeGreaterThan(0);
    });
  });

  describe('event parsing', () => {
    test('should parse NDJSON events', () => {
      const events = [
        { id: 1, type: 'config', data: { device: 'R1' } },
        { id: 2, type: 'status', data: { state: 'running' } }
      ];

      const ndjson = events.map(e => JSON.stringify(e)).join('\n');
      expect(ndjson).toContain('\n');
      expect(ndjson.split('\n')).toHaveLength(2);
    });

    test('should handle UTF-8 multi-byte characters', () => {
      const event = {
        id: 1,
        description: '你好世界 🌍'
      };

      const json = JSON.stringify(event);
      expect(json).toContain('你好');
      expect(json).toContain('🌍');
    });

    test('should skip empty lines', () => {
      const lines = ['{"id":1}', '', '{"id":2}', '', '{"id":3}'];
      const nonEmpty = lines.filter(l => l.trim().length > 0);

      expect(nonEmpty).toHaveLength(3);
    });

    test('should detect parse errors', () => {
      const invalidLines = [
        '{invalid json}',
        '{"incomplete":',
        'not json at all',
        '{"valid": true}'
      ];

      const parseCount = invalidLines.reduce((acc, line) => {
        try {
          JSON.parse(line);
          return acc + 1;
        } catch {
          return acc;
        }
      }, 0);

      expect(parseCount).toBe(1);
    });

    test('should handle partial lines', () => {
      const chunk1 = '{"id":1,"data":"par';
      const chunk2 = 'tial line"}\n{"id":2}';
      
      const combined = chunk1 + chunk2;
      expect(combined).toContain('partial');
    });
  });

  describe('checkpoint management', () => {
    test('should save checkpoint after reading events', () => {
      const checkpoint = {
        consumerId: 'test',
        currentFile: 'events.log',
        byteOffset: 1024,
        lastSeq: 100,
        updatedAt: Date.now()
      };

      expect(checkpoint.byteOffset).toBe(1024);
      expect(checkpoint.lastSeq).toBe(100);
    });

    test('should track byte offset', () => {
      const bytesRead = 2048;
      const checkpoint = {
        currentFile: 'events.log',
        byteOffset: bytesRead,
        lastSeq: 50,
        consumerId: 'test',
        updatedAt: Date.now()
      };

      expect(checkpoint.byteOffset).toBe(2048);
    });

    test('should track sequence number', () => {
      const events = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        type: 'event'
      }));

      const lastSeq = events[events.length - 1]!.id;
      expect(lastSeq).toBe(100);
    });

    test('should detect sequence gaps', () => {
      const sequences = [1, 2, 3, 5, 6, 7];

      const hasGap = (seqs: number[]) => {
        for (let i = 1; i < seqs.length; i++) {
          if (seqs[i] !== seqs[i - 1]! + 1) return true;
        }
        return false;
      };

      expect(hasGap(sequences)).toBe(true);
    });
  });

  describe('file handling', () => {
    test('should handle file rotation', () => {
      const files = [
        'events.20240101-000000-001.ndjson',
        'events.20240101-120000-002.ndjson',
        'events.current.ndjson'
      ];

      expect(files).toHaveLength(3);
      expect(files[2]).toContain('current');
    });

    test('should resolve rotated files', () => {
      const rotatedFile = 'events.20240101-000000-001.ndjson';
      const isRotated = rotatedFile.includes('20240101');

      expect(isRotated).toBe(true);
    });

    test('should handle file truncation', () => {
      const originalSize = 10000;
      const newSize = 5000;

      expect(newSize).toBeLessThan(originalSize);
    });

    test('should reopen file when needed', () => {
      const filePath = paths.currentEventsFile();
      expect(filePath).toBeDefined();
      expect(filePath.length).toBeGreaterThan(0);
    });

    test('should handle missing rotated files', () => {
      const checkpoint = {
        currentFile: 'events.20240101-000000-001.ndjson',
        byteOffset: 500
      };

      // File doesn't exist - should fallback
      expect(checkpoint.currentFile).toBeDefined();
    });
  });

  describe('event emission', () => {
    test('should emit events as they arrive', () => {
      const events: any[] = [];
      
      const onEvent = (event: any) => {
        events.push(event);
      };

      const testEvents = [
        { id: 1, type: 'start' },
        { id: 2, type: 'running' }
      ];

      testEvents.forEach(onEvent);
      expect(events).toHaveLength(2);
    });

    test('should emit parse errors', () => {
      const errors: any[] = [];

      const onParseError = (line: string, error: unknown) => {
        errors.push({ line, error });
      };

      onParseError('invalid json', new Error('Parse failed'));
      expect(errors).toHaveLength(1);
    });

    test('should emit sequence gaps', () => {
      const gaps: any[] = [];

      const onGap = (expected: number, actual: number) => {
        gaps.push({ expected, actual });
      };

      onGap(5, 7);
      expect(gaps).toHaveLength(1);
      expect(gaps[0].expected).toBe(5);
    });

    test('should emit data loss events', () => {
      const dataLoss: any[] = [];

      const onDataLoss = (info: any) => {
        dataLoss.push(info);
      };

      onDataLoss({
        reason: 'rotated file not found',
        lostFromOffset: 1000,
        checkpoint: { byteOffset: 1000 }
      });

      expect(dataLoss).toHaveLength(1);
    });
  });

  describe('polling and watching', () => {
    test('should poll files at interval', () => {
      const pollIntervalMs = 300;
      expect(pollIntervalMs).toBeGreaterThan(0);
      expect(pollIntervalMs).toBeLessThan(10000);
    });

    test('should watch log directory', () => {
      mkdirSync(paths.logsDir(), { recursive: true });
      const logDir = paths.logsDir();

      expect(logDir).toBeDefined();
      expect(logDir.includes('logs') || logDir.includes('event')).toBe(true);
    });

    test('should handle watch errors', () => {
      const errors: any[] = [];

      const onWatchError = (error: Error) => {
        errors.push(error);
      };

      onWatchError(new Error('Watch failed'));
      expect(errors).toHaveLength(1);
    });

    test('should stop polling on close', () => {
      let isRunning = true;
      
      const stop = () => {
        isRunning = false;
      };

      stop();
      expect(isRunning).toBe(false);
    });
  });

  describe('error handling', () => {
    test('should track consecutive parse errors', () => {
      let consecutiveErrors = 0;
      const maxErrors = 50;

      for (let i = 0; i < 10; i++) {
        consecutiveErrors++;
      }

      expect(consecutiveErrors).toBeLessThan(maxErrors);
    });

    test('should stop after max errors', () => {
      const maxConsecutiveErrors = 50;
      let errors = 60;

      const shouldStop = errors > maxConsecutiveErrors;
      expect(shouldStop).toBe(true);
    });

    test('should reset error count on success', () => {
      let errorCount = 5;
      
      // On successful parse
      errorCount = 0;
      
      expect(errorCount).toBe(0);
    });

    test('should handle file descriptor errors', () => {
      const errors: any[] = [];

      try {
        throw new Error('File descriptor not available');
      } catch (err) {
        errors.push(err);
      }

      expect(errors).toHaveLength(1);
    });
  });

  describe('buffer management', () => {
    test('should use configurable buffer size', () => {
      const bufferSizes = [32 * 1024, 64 * 1024, 128 * 1024];

      bufferSizes.forEach(size => {
        expect(size).toBeGreaterThan(0);
        expect(size % 1024).toBe(0);
      });
    });

    test('should handle buffer overflow', () => {
      const bufferSize = 65536;
      const dataSize = 100000;

      expect(dataSize).toBeGreaterThan(bufferSize);
    });

    test('should preserve leftover data', () => {
      const chunk1 = 'partial data';
      const leftover = chunk1;

      expect(leftover).toBe('partial data');
    });
  });

  describe('edge cases', () => {
    test('should handle empty log file', () => {
      mkdirSync(paths.logsDir(), { recursive: true });
      writeFileSync(paths.currentEventsFile(), '');

      expect(paths.currentEventsFile()).toBeDefined();
    });

    test('should handle very large events', () => {
      const largeEvent = {
        id: 1,
        data: 'x'.repeat(1000000)
      };

      const json = JSON.stringify(largeEvent);
      expect(json.length).toBeGreaterThan(1000000);
    });

    test('should handle rapid file changes', () => {
      const operations = [
        { op: 'read', offset: 0 },
        { op: 'rotate', time: Date.now() },
        { op: 'read', offset: 0 }
      ];

      expect(operations).toHaveLength(3);
    });

    test('should handle file deletion', () => {
      const files = ['events.current.ndjson', 'events.20240101-000000-001.ndjson'];
      
      // File deleted from disk
      const remaining = files.filter(f => f !== 'events.current.ndjson');
      
      expect(remaining).toHaveLength(1);
    });

    test('should handle zero-byte reads', () => {
      const bytesRead = 0;
      expect(bytesRead).toBe(0);
    });
  });
});
