/**
 * Tests for path-layout.ts - bridge directory structure
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { BridgePathLayout } from './path-layout';

const TEST_ROOT = '/tmp/bridge-paths-test-' + Math.random().toString(36).slice(2);

describe('BridgePathLayout', () => {
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

  describe('root', () => {
    test('should return the root directory', () => {
      expect(paths.root).toBe(TEST_ROOT);
    });
  });

  describe('commands directory', () => {
    test('should return commands directory path', () => {
      const cmdDir = paths.commandsDir();
      expect(cmdDir).toBe(join(TEST_ROOT, 'commands'));
    });

    test('should return command file path', () => {
      const cmdFile = paths.commandFilePath(1, 'configIos');
      expect(cmdFile).toContain('commands');
      expect(cmdFile).toContain('.json');
    });

    test('should generate sequence-based filenames', () => {
      const cmdFile = paths.commandFilePath(42, 'configIos');
      expect(cmdFile).toContain('000000000042');
      expect(cmdFile).toContain('configIos');
    });
  });

  describe('results directory', () => {
    test('should return results directory path', () => {
      const resDir = paths.resultsDir();
      expect(resDir).toBe(join(TEST_ROOT, 'results'));
    });

    test('should return result file path', () => {
      const resFile = paths.resultFilePath('result-456');
      expect(resFile).toBe(join(TEST_ROOT, 'results', 'result-456.json'));
    });

    test('should return dead letter directory', () => {
      const deadLetter = paths.deadLetterDir();
      expect(deadLetter).toBe(join(TEST_ROOT, 'dead-letter'));
    });

    test('should return dead letter file path', () => {
      const dlFile = paths.deadLetterFile('bad-file.json');
      expect(dlFile).toContain('dead-letter');
      expect(dlFile).toContain('bad-file');
    });
  });

  describe('logs directory', () => {
    test('should return logs directory path', () => {
      const logsDir = paths.logsDir();
      expect(logsDir).toBe(join(TEST_ROOT, 'logs'));
    });

    test('should return current events file path', () => {
      const eventsFile = paths.currentEventsFile();
      expect(eventsFile).toBe(join(TEST_ROOT, 'logs', 'events.current.ndjson'));
    });

    test('should return rotation manifest path', () => {
      const manifest = paths.rotationManifestFile();
      expect(manifest).toBe(join(TEST_ROOT, 'logs', 'rotation-manifest.json'));
    });
  });

  describe('state files', () => {
    test('should return consumer checkpoint file path', () => {
      const state = paths.consumerCheckpointFile('consumer-1');
      expect(state).toContain('consumer-state');
      expect(state).toContain('consumer-1.json');
    });

    test('should return sequence store path', () => {
      const seq = paths.sequenceStoreFile();
      expect(seq).toBe(join(TEST_ROOT, 'protocol.seq.json'));
    });

    test('should return lease file path', () => {
      const lease = paths.leaseFile();
      expect(lease).toContain('bridge-lease.json');
    });
  });

  describe('admin and state', () => {
    test('should return gc state file path', () => {
      const gc = paths.gcStateFile();
      expect(gc).toContain('gc-state.json');
    });

    test('should return state file path', () => {
      const state = paths.stateFile();
      expect(state).toBe(join(TEST_ROOT, 'state.json'));
    });
  });

  describe('path consistency', () => {
    test('should use consistent directory names', () => {
      expect(paths.commandsDir()).toContain('commands');
      expect(paths.resultsDir()).toContain('results');
      expect(paths.logsDir()).toContain('logs');
    });

    test('should namespace consumer checkpoint files', () => {
      const state1 = paths.consumerCheckpointFile('consumer-1');
      const state2 = paths.consumerCheckpointFile('consumer-2');
      
      expect(state1).not.toBe(state2);
      expect(dirname(state1)).toBe(dirname(state2));
    });

    test('should have proper file extensions', () => {
      expect(paths.commandFilePath(1, 'test')).toEndWith('.json');
      expect(paths.resultFilePath('id')).toEndWith('.json');
      expect(paths.consumerCheckpointFile('id')).toEndWith('.json');
      expect(paths.currentEventsFile()).toEndWith('.ndjson');
      expect(paths.sequenceStoreFile()).toEndWith('.json');
      expect(paths.leaseFile()).toContain('.json');
    });
  });

  describe('isolation', () => {
    test('should use separate roots for different instances', () => {
      const root1 = '/tmp/bridge-1';
      const root2 = '/tmp/bridge-2';
      const paths1 = new BridgePathLayout(root1);
      const paths2 = new BridgePathLayout(root2);

      expect(paths1.commandsDir()).not.toBe(paths2.commandsDir());
      expect(paths1.root).not.toBe(paths2.root);
    });
  });
});
