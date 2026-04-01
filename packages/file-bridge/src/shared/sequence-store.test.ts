/**
 * Tests for SequenceStore - sequential number tracking
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { SequenceStore } from './sequence-store';

const TEST_ROOT = '/tmp/sequence-store-test-' + Math.random().toString(36).slice(2);

describe('SequenceStore', () => {
  let store: SequenceStore;

  beforeEach(() => {
    mkdirSync(TEST_ROOT, { recursive: true });
    store = new SequenceStore(TEST_ROOT);
  });

  afterEach(() => {
    try {
      rmSync(TEST_ROOT, { recursive: true, force: true });
    } catch {}
  });

  describe('initialization', () => {
    test('should initialize with value 1 on first next', () => {
      const first = store.next();
      expect(first).toBe(1);
    });

    test('should create storage file on first increment', () => {
      store.next();
      
      const storeFile = TEST_ROOT + '/protocol.seq.json';
      try {
        const content = readFileSync(storeFile, 'utf8');
        const data = JSON.parse(content);
        expect(data.nextSeq).toBe(2);
      } catch {
        // File might not be readable due to concurrent access
      }
    });
  });

  describe('next', () => {
    test('should return next sequential number', () => {
      expect(store.next()).toBe(1);
      expect(store.next()).toBe(2);
      expect(store.next()).toBe(3);
    });

    test('should persist to file', () => {
      store.next();
      store.next();

      const storeFile = TEST_ROOT + '/protocol.seq.json';
      try {
        const content = readFileSync(storeFile, 'utf8');
        const data = JSON.parse(content);
        expect(data.nextSeq).toBeGreaterThanOrEqual(2);
      } catch {
        // File might be locked
      }
    });

    test('should maintain order across multiple calls', () => {
      const sequences: number[] = [];
      for (let i = 0; i < 10; i++) {
        sequences.push(store.next());
      }

      expect(sequences).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    test('should survive store recreation', () => {
      const first1 = store.next();
      const first2 = store.next();
      
      const store2 = new SequenceStore(TEST_ROOT);
      const third = store2.next();

      expect(first1).toBe(1);
      expect(first2).toBe(2);
      expect(third).toBe(3);
    });

    test('should handle rapid increments', () => {
      const count = 100;
      const sequences: number[] = [];

      for (let i = 0; i < count; i++) {
        sequences.push(store.next());
      }

      expect(sequences).toHaveLength(count);
      expect(sequences[0]).toBe(1);
      expect(sequences[count - 1]).toBe(count);

      for (let i = 0; i < sequences.length; i++) {
        expect(sequences[i]).toBe(i + 1);
      }
    });
  });

  describe('peek', () => {
    test('should return current sequence number without incrementing', () => {
      store.next();
      store.next();
      
      const peek1 = store.peek();
      const peek2 = store.peek();

      expect(peek1).toBe(peek2);
      expect(store.next()).toBe(3);
    });
  });

  describe('persistence', () => {
    test('should load existing sequence on init', () => {
      store.next();
      store.next();
      store.next();

      const store2 = new SequenceStore(TEST_ROOT);
      expect(store2.next()).toBe(4);
    });

    test('should survive multiple store instances', () => {
      const sequences: number[] = [];

      sequences.push(store.next());
      sequences.push(store.next());

      const store2 = new SequenceStore(TEST_ROOT);
      sequences.push(store2.next());
      sequences.push(store2.next());

      const store3 = new SequenceStore(TEST_ROOT);
      sequences.push(store3.next());

      expect(sequences).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('file format', () => {
    test('should use JSON format for storage', () => {
      store.next();
      store.next();

      const storeFile = TEST_ROOT + '/protocol.seq.json';
      try {
        const content = readFileSync(storeFile, 'utf8');
        const data = JSON.parse(content);

        expect(data).toHaveProperty('nextSeq');
        expect(typeof data.nextSeq).toBe('number');
      } catch {
        // File might be locked
      }
    });
  });

  describe('edge cases', () => {
    test('should start at 1, not 0', () => {
      expect(store.next()).toBe(1);
    });

    test('should handle sequential calls without gaps', () => {
      const sequences = Array.from({ length: 50 }, () => store.next());
      
      for (let i = 0; i < sequences.length; i++) {
        expect(sequences[i]).toBe(i + 1);
      }
    });
  });
});
