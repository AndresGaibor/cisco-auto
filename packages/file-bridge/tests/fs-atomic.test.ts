import { test, expect, afterEach, beforeEach } from "bun:test";
import {
  atomicWriteFile,
  appendLine,
  ensureDir,
  ensureFile,
} from "../src/shared/fs-atomic.js";
import {
  readFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const TEST_DIR = "/tmp/bridge-v2-test";

beforeEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

test("atomicWriteFile writes content correctly", () => {
  const file = join(TEST_DIR, "atomic.txt");
  atomicWriteFile(file, "hello world");

  expect(readFileSync(file, "utf8")).toBe("hello world");
});

test("atomicWriteFile creates parent directories", () => {
  const file = join(TEST_DIR, "nested/deep/file.txt");
  atomicWriteFile(file, "nested content");

  expect(existsSync(file)).toBe(true);
  expect(readFileSync(file, "utf8")).toBe("nested content");
});

test("atomicWriteFile never leaves partial files", () => {
  const file = join(TEST_DIR, "partial.txt");
  const tmp = `${file}.tmp`;

  // Write something to tmp first
  writeFileSync(tmp, "partial content", "utf8");

  // Now atomic write
  atomicWriteFile(file, "full content");

  // Tmp should be gone
  expect(existsSync(tmp)).toBe(false);
  // File should have full content
  expect(readFileSync(file, "utf8")).toBe("full content");
});

test("atomicWriteFile overwrites existing files atomically", () => {
  const file = join(TEST_DIR, "overwrite.txt");
  atomicWriteFile(file, "first");
  atomicWriteFile(file, "second");

  expect(readFileSync(file, "utf8")).toBe("second");
});

test("appendLine appends a single line with newline", () => {
  const file = join(TEST_DIR, "append.txt");
  ensureFile(file, "");

  appendLine(file, "line1");
  appendLine(file, "line2");

  expect(readFileSync(file, "utf8")).toBe("line1\nline2\n");
});

test("appendLine does not double newlines if already present", () => {
  const file = join(TEST_DIR, "append2.txt");
  ensureFile(file, "");

  // Input already ends with newline - should NOT add another
  appendLine(file, "line with newline\n");

  expect(readFileSync(file, "utf8")).toBe("line with newline\n");
});

test("ensureDir creates directory recursively", () => {
  const dir = join(TEST_DIR, "a/b/c/d");
  ensureDir(dir);

  expect(existsSync(dir)).toBe(true);
});

test("ensureDir is idempotent", () => {
  const dir = join(TEST_DIR, "idem");
  ensureDir(dir);
  ensureDir(dir);

  expect(existsSync(dir)).toBe(true);
});

test("ensureFile creates file with initial content", () => {
  const file = join(TEST_DIR, "ensure.txt");
  ensureFile(file, "initial");

  expect(readFileSync(file, "utf8")).toBe("initial");
});

test("ensureFile does not overwrite existing file", () => {
  const file = join(TEST_DIR, "existing.txt");
  writeFileSync(file, "pre-existing", "utf8");

  ensureFile(file, "new content");

  expect(readFileSync(file, "utf8")).toBe("pre-existing");
});

test("ensureFile creates empty file when no initial provided", () => {
  const file = join(TEST_DIR, "empty.txt");
  ensureFile(file);

  expect(existsSync(file)).toBe(true);
  expect(readFileSync(file, "utf8")).toBe("");
});
