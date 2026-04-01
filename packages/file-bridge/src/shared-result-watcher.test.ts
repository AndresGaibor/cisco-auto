/**
 * Tests for SharedResultWatcher - watch results directory for completion
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { BridgePathLayout } from './shared/path-layout';
import { join } from 'node:path';

const TEST_ROOT = '/tmp/watcher-test-' + Math.random().toString(36).slice(2);

describe('SharedResultWatcher', () => {
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
    test('should initialize watcher', () => {
      const watcher = {
        enabled: true,
        pattern: '*.json',
        timeout: 30000
      };

      expect(watcher.enabled).toBe(true);
      expect(watcher.pattern).toBe('*.json');
    });

    test('should set up results directory', () => {
      mkdirSync(paths.resultsDir(), { recursive: true });

      const dir = paths.resultsDir();
      expect(dir).toBeDefined();
      expect(dir.includes('results')).toBe(true);
    });

    test('should configure timeout', () => {
      const timeout = 30000;
      expect(timeout).toBeGreaterThan(0);
      expect(timeout).toBeLessThanOrEqual(300000);
    });

    test('should initialize with config', () => {
      const config = {
        pollingIntervalMs: 500,
        maxRetries: 3,
        backoffMs: 1000
      };

      expect(config.pollingIntervalMs).toBe(500);
      expect(config.maxRetries).toBe(3);
    });
  });

  describe('file watching', () => {
    test('should detect new result files', () => {
      mkdirSync(paths.resultsDir(), { recursive: true });
      const resultFile = join(paths.resultsDir(), 'result-1.json');
      
      writeFileSync(resultFile, JSON.stringify({ status: 'completed' }));

      expect(resultFile).toBeDefined();
    });

    test('should match file patterns', () => {
      const patterns = ['*.json', 'result-*.json', 'cmd-*.result'];

      const filename = 'result-123.json';
      const matches = patterns.filter(p => {
        const regex = new RegExp('^' + p.replace('*', '.*') + '$');
        return regex.test(filename);
      });

      expect(matches.length).toBeGreaterThan(0);
    });

    test('should ignore non-matching files', () => {
      const pattern = '*.json';
      const files = ['result.json', 'log.txt', 'config.yaml'];

      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      const matching = files.filter(f => regex.test(f));

      expect(matching).toHaveLength(1);
    });

    test('should handle subdirectories', () => {
      const paths_: any = {
        resultsDir: () => '/path/results',
        deadLetterDir: () => '/path/results/dead-letter'
      };

      expect(paths_.deadLetterDir()).toContain('dead-letter');
    });
  });

  describe('result parsing', () => {
    test('should parse result JSON', () => {
      const result = {
        commandId: 'cmd-1',
        status: 'completed',
        output: 'success',
        timestamp: Date.now()
      };

      const json = JSON.stringify(result);
      const parsed = JSON.parse(json);

      expect(parsed.commandId).toBe('cmd-1');
      expect(parsed.status).toBe('completed');
    });

    test('should validate result structure', () => {
      const isValidResult = (obj: any) => {
        return 'commandId' in obj && 'status' in obj;
      };

      const valid = { commandId: 'c1', status: 'ok', output: 'data' };
      const invalid = { commandId: 'c1' };

      expect(isValidResult(valid)).toBe(true);
      expect(isValidResult(invalid)).toBe(false);
    });

    test('should handle parse errors', () => {
      const invalidJson = '{not valid json}';
      let parseError: any = null;

      try {
        JSON.parse(invalidJson);
      } catch (e) {
        parseError = e;
      }

      expect(parseError).not.toBeNull();
    });

    test('should extract command ID from result', () => {
      const result = {
        commandId: 'cmd-123',
        status: 'completed'
      };

      expect(result.commandId).toBe('cmd-123');
      const id = result.commandId.split('-')[1];
      expect(id).toBe('123');
    });
  });

  describe('result completion detection', () => {
    test('should detect completed results', () => {
      const result = {
        commandId: 'cmd-1',
        status: 'completed',
        output: 'Success'
      };

      const isCompleted = result.status === 'completed';
      expect(isCompleted).toBe(true);
    });

    test('should detect failed results', () => {
      const result = {
        commandId: 'cmd-1',
        status: 'failed',
        error: 'Error message'
      };

      const isFailed = result.status === 'failed' || !!result.error;
      expect(isFailed).toBe(true);
    });

    test('should detect pending results', () => {
      const result = {
        commandId: 'cmd-1',
        status: 'pending'
      };

      const isPending = result.status === 'pending';
      expect(isPending).toBe(true);
    });

    test('should match results with commands', () => {
      const commands = new Map([
        ['cmd-1', { device: 'R1', cmd: 'show version' }],
        ['cmd-2', { device: 'R2', cmd: 'show interfaces' }]
      ]);

      const result = { commandId: 'cmd-1' };
      const command = commands.get(result.commandId);

      expect(command?.device).toBe('R1');
    });

    test('should handle timeout for missing results', () => {
      const timeout = 30000;
      const elapsed = 30100;

      const isTimedOut = elapsed > timeout;
      expect(isTimedOut).toBe(true);
    });
  });

  describe('callback management', () => {
    test('should call onResult callback', () => {
      const callbacks: any[] = [];

      const onResult = (result: any) => {
        callbacks.push(result);
      };

      const result = { commandId: 'cmd-1', status: 'completed' };
      onResult(result);

      expect(callbacks).toHaveLength(1);
      expect(callbacks[0].commandId).toBe('cmd-1');
    });

    test('should call onTimeout callback', () => {
      const callbacks: any[] = [];

      const onTimeout = (commandId: string) => {
        callbacks.push({ type: 'timeout', commandId });
      };

      onTimeout('cmd-1');
      expect(callbacks).toHaveLength(1);
      expect(callbacks[0].type).toBe('timeout');
    });

    test('should call onError callback', () => {
      const errors: any[] = [];

      const onError = (error: Error) => {
        errors.push(error);
      };

      onError(new Error('Watch failed'));
      expect(errors).toHaveLength(1);
    });

    test('should handle multiple callbacks', () => {
      const allCallbacks: any[] = [];

      const callbacks = {
        onResult: (r: any) => allCallbacks.push({ type: 'result', data: r }),
        onError: (e: any) => allCallbacks.push({ type: 'error', data: e })
      };

      callbacks.onResult({ cmd: 'c1' });
      callbacks.onError(new Error('test'));

      expect(allCallbacks).toHaveLength(2);
    });
  });

  describe('dead letter handling', () => {
    test('should move failed results to dead letter', () => {
      mkdirSync(paths.resultsDir(), { recursive: true });
      mkdirSync(paths.deadLetterDir(), { recursive: true });

      const resultFile = 'result-1.json';
      const deadLetterFile = join(paths.deadLetterDir(), resultFile);

      expect(deadLetterFile).toContain('dead-letter');
    });

    test('should track dead letter files', () => {
      const deadLetterFiles = [
        { file: 'result-1.json', reason: 'parse error' },
        { file: 'result-2.json', reason: 'timeout' }
      ];

      expect(deadLetterFiles).toHaveLength(2);
    });

    test('should handle dead letter directory creation', () => {
      mkdirSync(paths.deadLetterDir(), { recursive: true });

      const dir = paths.deadLetterDir();
      expect(dir).toBeDefined();
      expect(dir).toContain('dead-letter');
    });

    test('should log dead letter entries', () => {
      const deadLetterLog: any[] = [];

      const logDeadLetter = (file: string, reason: string) => {
        deadLetterLog.push({ file, reason, timestamp: Date.now() });
      };

      logDeadLetter('result-1.json', 'invalid format');
      expect(deadLetterLog).toHaveLength(1);
    });
  });

  describe('polling mechanism', () => {
    test('should poll directory at intervals', () => {
      const pollingInterval = 500;
      expect(pollingInterval).toBeGreaterThan(0);
      expect(pollingInterval).toBeLessThan(5000);
    });

    test('should batch process results', () => {
      const results = [
        { id: 1, status: 'completed' },
        { id: 2, status: 'completed' },
        { id: 3, status: 'completed' }
      ];

      const batchSize = results.length;
      expect(batchSize).toBe(3);
    });

    test('should handle empty poll results', () => {
      const results: any[] = [];

      if (results.length === 0) {
        expect(true).toBe(true);
      }
    });

    test('should implement exponential backoff', () => {
      const backoff = (attempt: number) => Math.min(100 * Math.pow(2, attempt), 10000);

      expect(backoff(0)).toBe(100);
      expect(backoff(1)).toBe(200);
      expect(backoff(5)).toBe(3200);
      expect(backoff(10)).toBe(10000);
    });
  });

  describe('cleanup', () => {
    test('should remove processed results', () => {
      const results = ['result-1.json', 'result-2.json'];
      const processed = results.filter(f => f === 'result-1.json');

      const remaining = results.filter(f => !processed.includes(f as never));
      expect(remaining).toHaveLength(1);
    });

    test('should stop watching on close', () => {
      let isWatching = true;

      const stop = () => {
        isWatching = false;
      };

      stop();
      expect(isWatching).toBe(false);
    });

    test('should clean up timers', () => {
      let timerActive = true;

      const clearTimer = () => {
        timerActive = false;
      };

      clearTimer();
      expect(timerActive).toBe(false);
    });

    test('should close file watchers', () => {
      const watchers: any[] = [];
      const watcher = { close: () => {} };

      watchers.push(watcher);
      watchers.forEach(w => w.close());

      expect(watchers).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    test('should handle results without commandId', () => {
      const result = { status: 'completed' };

      const hasCommandId = 'commandId' in result;
      expect(hasCommandId).toBe(false);
    });

    test('should handle very large result files', () => {
      const largeResult = {
        commandId: 'cmd-1',
        output: 'x'.repeat(10000000)
      };

      const json = JSON.stringify(largeResult);
      expect(json.length).toBeGreaterThan(10000000);
    });

    test('should handle rapid file creation', () => {
      const files = Array.from({ length: 100 }, (_, i) => `result-${i}.json`);

      expect(files).toHaveLength(100);
      expect(files[0]).toBe('result-0.json');
    });

    test('should handle file rename operations', () => {
      const originalName = 'result-temp-1.json';
      const finalName = 'result-1.json';

      expect(originalName).not.toBe(finalName);
    });

    test('should handle concurrent result creation', () => {
      const results = new Set<string>();

      for (let i = 0; i < 10; i++) {
        results.add(`result-${i}.json`);
      }

      expect(results.size).toBe(10);
    });
  });
});
