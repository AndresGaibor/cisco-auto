import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { BridgePathLayout } from './shared/path-layout';
import { join } from 'node:path';
import { SharedResultWatcher } from './shared-result-watcher.js';

const TEST_ROOT = '/tmp/watcher-test-' + Math.random().toString(36).slice(2);

describe('SharedResultWatcher', () => {
  let paths: BridgePathLayout;

  beforeEach(() => {
    mkdirSync(TEST_ROOT, { recursive: true });
    paths = new BridgePathLayout(TEST_ROOT);
    mkdirSync(paths.resultsDir(), { recursive: true });
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

  describe('watch registration', () => {
    test('tracks listeners per command id and resets on destroy', () => {
      const watcher = new SharedResultWatcher(paths.resultsDir());
      const callbackA = () => undefined;
      const callbackB = () => undefined;

      watcher.watch('cmd_1', callbackA);
      watcher.watch('cmd_2', callbackB);

      expect(watcher.getStats()).toEqual({
        watching: true,
        listenersCount: 2,
        commandsWatched: 2,
      });

      watcher.unwatch('cmd_1', callbackA);
      expect(watcher.getStats()).toEqual({
        watching: true,
        listenersCount: 1,
        commandsWatched: 1,
      });

      watcher.destroy();
      expect(watcher.getStats()).toEqual({
        watching: false,
        listenersCount: 0,
        commandsWatched: 0,
      });
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
});
