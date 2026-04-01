/**
 * Tests for fs-atomic.ts - atomic file operations
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { atomicWriteFile, appendLine, ensureDir, ensureFile } from './fs-atomic';

const TEST_DIR = '/tmp/fs-atomic-test-' + Math.random().toString(36).slice(2);

describe('fs-atomic utilities', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {}
  });

  describe('ensureDir', () => {
    test('should create directory if it does not exist', () => {
      const dir = join(TEST_DIR, 'new-dir');
      expect(existsSync(dir)).toBe(false);

      ensureDir(dir);

      expect(existsSync(dir)).toBe(true);
    });

    test('should create nested directories', () => {
      const dir = join(TEST_DIR, 'a', 'b', 'c', 'd');
      
      ensureDir(dir);

      expect(existsSync(dir)).toBe(true);
    });

    test('should not fail if directory already exists', () => {
      const dir = join(TEST_DIR, 'existing');
      ensureDir(dir);
      
      expect(() => ensureDir(dir)).not.toThrow();
    });
  });

  describe('atomicWriteFile', () => {
    test('should write content to file', () => {
      const file = join(TEST_DIR, 'file.txt');
      const content = 'Hello, World!';

      atomicWriteFile(file, content);

      expect(existsSync(file)).toBe(true);
      expect(readFileSync(file, 'utf8')).toBe(content);
    });

    test('should create parent directories', () => {
      const file = join(TEST_DIR, 'nested', 'path', 'file.txt');
      const content = 'nested content';

      atomicWriteFile(file, content);

      expect(readFileSync(file, 'utf8')).toBe(content);
    });

    test('should overwrite existing file', () => {
      const file = join(TEST_DIR, 'overwrite.txt');
      atomicWriteFile(file, 'old content');
      
      atomicWriteFile(file, 'new content');

      expect(readFileSync(file, 'utf8')).toBe('new content');
    });

    test('should handle empty content', () => {
      const file = join(TEST_DIR, 'empty.txt');

      atomicWriteFile(file, '');

      expect(readFileSync(file, 'utf8')).toBe('');
    });

    test('should handle large content', () => {
      const file = join(TEST_DIR, 'large.txt');
      const content = 'x'.repeat(1024 * 1024); // 1MB

      atomicWriteFile(file, content);

      expect(readFileSync(file, 'utf8')).toBe(content);
    });

    test('should handle special characters', () => {
      const file = join(TEST_DIR, 'special.txt');
      const content = '{"key": "value", "emoji": "🚀", "newline": "\\n"}';

      atomicWriteFile(file, content);

      expect(readFileSync(file, 'utf8')).toBe(content);
    });

    test('should not leave temp files on success', () => {
      const file = join(TEST_DIR, 'file.txt');
      
      atomicWriteFile(file, 'content');
      
      const files = readdirSync(TEST_DIR);
      expect(files).toEqual(['file.txt']);
    });
  });

  describe('ensureFile', () => {
    test('should create file if it does not exist', () => {
      const file = join(TEST_DIR, 'new-file.txt');
      
      ensureFile(file);

      expect(existsSync(file)).toBe(true);
    });

    test('should initialize with content', () => {
      const file = join(TEST_DIR, 'initialized.txt');
      const initial = 'initial content';

      ensureFile(file, initial);

      expect(readFileSync(file, 'utf8')).toBe(initial);
    });

    test('should not overwrite existing file', () => {
      const file = join(TEST_DIR, 'existing.txt');
      atomicWriteFile(file, 'original');

      ensureFile(file, 'new content');

      expect(readFileSync(file, 'utf8')).toBe('original');
    });

    test('should create with empty content by default', () => {
      const file = join(TEST_DIR, 'empty.txt');

      ensureFile(file);

      expect(readFileSync(file, 'utf8')).toBe('');
    });

    test('should create parent directories', () => {
      const file = join(TEST_DIR, 'nested', 'path', 'file.txt');

      ensureFile(file, 'content');

      expect(existsSync(file)).toBe(true);
      expect(readFileSync(file, 'utf8')).toBe('content');
    });
  });

  describe('appendLine', () => {
    test('should append line to file', () => {
      const file = join(TEST_DIR, 'lines.txt');
      atomicWriteFile(file, 'first line\n');

      appendLine(file, 'second line');

      const content = readFileSync(file, 'utf8');
      expect(content).toBe('first line\nsecond line\n');
    });

    test('should create file if does not exist', () => {
      const file = join(TEST_DIR, 'new-lines.txt');

      appendLine(file, 'first line');

      expect(readFileSync(file, 'utf8')).toBe('first line\n');
    });

    test('should not double newlines if line has trailing newline', () => {
      const file = join(TEST_DIR, 'no-double-newline.txt');

      appendLine(file, 'line with newline\n');

      expect(readFileSync(file, 'utf8')).toBe('line with newline\n');
    });

    test('should append multiple lines', () => {
      const file = join(TEST_DIR, 'multi-lines.txt');

      appendLine(file, 'line 1');
      appendLine(file, 'line 2');
      appendLine(file, 'line 3');

      const content = readFileSync(file, 'utf8');
      expect(content).toBe('line 1\nline 2\nline 3\n');
    });

    test('should create parent directories', () => {
      const file = join(TEST_DIR, 'nested', 'lines.txt');

      appendLine(file, 'content');

      expect(existsSync(file)).toBe(true);
    });

    test('should handle empty lines', () => {
      const file = join(TEST_DIR, 'empty-lines.txt');

      appendLine(file, '');
      appendLine(file, 'content');
      appendLine(file, '');

      const content = readFileSync(file, 'utf8');
      expect(content).toBe('\ncontent\n\n');
    });

    test('should handle JSON lines', () => {
      const file = join(TEST_DIR, 'ndjson.txt');
      const obj1 = JSON.stringify({ id: 1, msg: 'first' });
      const obj2 = JSON.stringify({ id: 2, msg: 'second' });

      appendLine(file, obj1);
      appendLine(file, obj2);

      const lines = readFileSync(file, 'utf8').trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]!)).toEqual({ id: 1, msg: 'first' });
      expect(JSON.parse(lines[1]!)).toEqual({ id: 2, msg: 'second' });
    });
  });
});
