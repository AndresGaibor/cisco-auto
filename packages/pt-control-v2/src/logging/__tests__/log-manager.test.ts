/**
 * Tests for LogManager
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { LogManager, getLogManager, resetLogManager } from '../log-manager.js';
import type { LogEntry } from '../types.js';

const TEST_LOG_DIR = '.sisyphus/logs-test';

describe('LogManager', () => {
  let manager: LogManager;

  beforeEach(async () => {
    // Create fresh manager for each test
    resetLogManager();
    manager = new LogManager({
      logDir: TEST_LOG_DIR,
      retentionDays: 7,
      prefix: 'test-pt-control',
    });

    // Clean up test directory
    if (existsSync(TEST_LOG_DIR)) {
      await rm(TEST_LOG_DIR, { recursive: true });
    }
  });

  afterEach(async () => {
    // Clean up test directory
    if (existsSync(TEST_LOG_DIR)) {
      await rm(TEST_LOG_DIR, { recursive: true });
    }
  });

  describe('log()', () => {
    test('should create log entry in NDJSON file', async () => {
      const entry: LogEntry = {
        session_id: 'ses_123',
        correlation_id: 'cor_456',
        timestamp: new Date().toISOString(),
        action: 'device list',
        outcome: 'success',
        duration_ms: 150,
      };

      await manager.log(entry);

      // Verify file was created
      const today = new Date().toISOString().split('T')[0];
      const expectedFile = join(TEST_LOG_DIR, `test-pt-control-${today}.ndjson`);
      expect(existsSync(expectedFile)).toBe(true);

      // Verify content
      const content = await Bun.file(expectedFile).text();
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(1);

      const parsed = JSON.parse(lines[0]);
      expect(parsed.session_id).toBe('ses_123');
      expect(parsed.action).toBe('device list');
      expect(parsed.outcome).toBe('success');
    });

    test('should append multiple entries to same file', async () => {
      const entry1: LogEntry = {
        session_id: 'ses_123',
        correlation_id: 'cor_456',
        timestamp: new Date().toISOString(),
        action: 'device list',
        outcome: 'success',
      };

      const entry2: LogEntry = {
        session_id: 'ses_123',
        correlation_id: 'cor_457',
        timestamp: new Date().toISOString(),
        action: 'device reset',
        target_device: 'R1',
        outcome: 'cancelled',
      };

      await manager.log(entry1);
      await manager.log(entry2);

      const today = new Date().toISOString().split('T')[0];
      const expectedFile = join(TEST_LOG_DIR, `test-pt-control-${today}.ndjson`);
      const content = await Bun.file(expectedFile).text();
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(2);
    });

    test('should handle entries with context', async () => {
      const entry: LogEntry = {
        session_id: 'ses_123',
        correlation_id: 'cor_456',
        timestamp: new Date().toISOString(),
        action: 'device config',
        outcome: 'success',
        context: {
          interface: 'GigabitEthernet0/0',
          ip_address: '192.168.1.1',
        },
      };

      await manager.log(entry);

      const today = new Date().toISOString().split('T')[0];
      const expectedFile = join(TEST_LOG_DIR, `test-pt-control-${today}.ndjson`);
      const content = await Bun.file(expectedFile).text();
      const parsed = JSON.parse(content);

      expect(parsed.context).toBeDefined();
      expect(parsed.context?.interface).toBe('GigabitEthernet0/0');
    });
  });

  describe('session management', () => {
    test('should start and track session', () => {
      manager.startSession('ses_test');
      expect(manager.getCurrentSessionId()).toBe('ses_test');
    });

    test('should end session', () => {
      manager.startSession('ses_test');
      manager.endSession();
      expect(manager.getCurrentSessionId()).toBeNull();
    });
  });

  describe('getSession()', () => {
    test('should retrieve all entries for a session', async () => {
      const sessionId = 'ses_retrieve_test';

      // Create entries for the session
      const entry1: LogEntry = {
        session_id: sessionId,
        correlation_id: 'cor_001',
        timestamp: new Date().toISOString(),
        action: 'device list',
        outcome: 'success',
      };

      const entry2: LogEntry = {
        session_id: sessionId,
        correlation_id: 'cor_002',
        timestamp: new Date().toISOString(),
        action: 'device get',
        target_device: 'R1',
        outcome: 'success',
      };

      // Create entry for different session
      const entry3: LogEntry = {
        session_id: 'ses_other',
        correlation_id: 'cor_003',
        timestamp: new Date().toISOString(),
        action: 'device list',
        outcome: 'error',
      };

      await manager.log(entry1);
      await manager.log(entry2);
      await manager.log(entry3);

      const sessionEntries = await manager.getSession(sessionId);

      expect(sessionEntries.length).toBe(2);
      expect(sessionEntries.every(e => e.session_id === sessionId)).toBe(true);
    });

    test('should return empty array for non-existent session', async () => {
      const entries = await manager.getSession('non_existent');
      expect([...entries.entries]).toHaveLength(0);
    });
  });

  describe('query()', () => {
    test('should filter by outcome', async () => {
      const entries: LogEntry[] = [
        { session_id: 's1', correlation_id: 'c1', timestamp: new Date().toISOString(), action: 'test', outcome: 'success' },
         { session_id: 's1', correlation_id: 'c2', timestamp: new Date().toISOString(), action: 'test', outcome: 'error' },
        { session_id: 's1', correlation_id: 'c3', timestamp: new Date().toISOString(), action: 'test', outcome: 'success' },
      ];

      for (const entry of entries) {
        await manager.log(entry);
      }

      const successEntries = await manager.query({ outcome: 'success' });
      expect(successEntries.length).toBe(2);
    });

    test('should filter by action', async () => {
      const entries: LogEntry[] = [
        { session_id: 's1', correlation_id: 'c1', timestamp: new Date().toISOString(), action: 'device list', outcome: 'success' },
        { session_id: 's1', correlation_id: 'c2', timestamp: new Date().toISOString(), action: 'device reset', outcome: 'success' },
        { session_id: 's1', correlation_id: 'c3', timestamp: new Date().toISOString(), action: 'device list', outcome: 'success' },
      ];

      for (const entry of entries) {
        await manager.log(entry);
      }

      const listEntries = await manager.query({ action: 'device list' });
      expect(listEntries.length).toBe(2);
    });

    test('should respect limit', async () => {
      for (let i = 0; i < 10; i++) {
        const entry: LogEntry = {
          session_id: 's1',
          correlation_id: `c${i}`,
          timestamp: new Date().toISOString(),
          action: 'test',
          outcome: 'success',
        };
        await manager.log(entry);
      }

      const limited = await manager.query({ limit: 5 });
      expect(limited.length).toBe(5);
    });
  });

  describe('rotate()', () => {
    test('should delete files older than retention period', async () => {
      // Create an old log file (manually create with past date in name)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      const oldDateStr = oldDate.toISOString().split('T')[0];
      const oldFile = join(TEST_LOG_DIR, `test-pt-control-${oldDateStr}.ndjson`);

      await mkdir(TEST_LOG_DIR, { recursive: true });
      await Bun.write(oldFile, '{"test": "old"}\n');

      // Create a recent log file
      const today = new Date().toISOString().split('T')[0];
      const todayFile = join(TEST_LOG_DIR, `test-pt-control-${today}.ndjson`);
      await Bun.write(todayFile, '{"test": "today"}\n');

      const deleted = await manager.rotate();

      expect(deleted).toBe(1);
      expect(existsSync(oldFile)).toBe(false);
      expect(existsSync(todayFile)).toBe(true);
    });
  });

  describe('getStats()', () => {
    test('should return correct statistics', async () => {
      const entry: LogEntry = {
        session_id: 's1',
        correlation_id: 'c1',
        timestamp: new Date().toISOString(),
        action: 'test',
        outcome: 'success',
      };

      await manager.log(entry);
      await manager.log(entry);

      const stats = await manager.getStats();

      expect(stats.fileCount).toBe(1);
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });

  describe('logAction()', () => {
    test('should create entry with convenience method', async () => {
      await manager.logAction('ses_123', 'cor_456', 'device list', 'success', {
        duration_ms: 100,
      });

      const entries = await manager.getSession('ses_123');
      expect(entries.length).toBe(1);
      expect(entries[0].action).toBe('device list');
      expect(entries[0].duration_ms).toBe(100);
    });
  });

  describe('ID generation', () => {
    test('should generate unique correlation IDs', () => {
      const id1 = LogManager.generateCorrelationId();
      const id2 = LogManager.generateCorrelationId();
      expect(id1).not.toBe(id2);
      expect(id1.startsWith('cor_')).toBe(true);
    });

    test('should generate unique session IDs', () => {
      const id1 = LogManager.generateSessionId();
      const id2 = LogManager.generateSessionId();
      expect(id1).not.toBe(id2);
      expect(id1.startsWith('ses_')).toBe(true);
    });
  });

  describe('singleton', () => {
    test('getLogManager should return same instance', () => {
      const m1 = getLogManager();
      const m2 = getLogManager();
      expect(m1).toBe(m2);
    });

    test('resetLogManager should create new instance', () => {
      const m1 = getLogManager();
      resetLogManager();
      const m2 = getLogManager();
      expect(m1).not.toBe(m2);
    });
  });
});
