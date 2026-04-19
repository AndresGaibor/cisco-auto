import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { createQueueCleanup } from "../pt/kernel/queue-cleanup";
import { createQueueIndex } from "../pt/kernel/queue-index";

const TEST_ROOT = "/tmp/queue-cleanup-ttl-test-" + Math.random().toString(36).slice(2);
const HOUR_MS = 60 * 60 * 1000;

function buildFm() {
  return {
    fileExists(path: string) {
      return existsSync(path);
    },
    directoryExists(path: string) {
      return existsSync(path);
    },
    getFileContents(path: string) {
      return readFileSync(path, "utf8");
    },
    writePlainTextToFile(path: string, content: string) {
      mkdirSync(join(path, ".."), { recursive: true });
      writeFileSync(path, content, "utf8");
    },
    makeDirectory(path: string) {
      mkdirSync(path, { recursive: true });
      return true;
    },
    getFilesInDirectory(path: string) {
      return existsSync(path) ? readdirSync(path) : [];
    },
    removeFile(path: string) {
      try {
        rmSync(path, { force: true });
        return true;
      } catch {
        return false;
      }
    },
    moveSrcFileToDestFile(src: string, dest: string) {
      const content = readFileSync(src, "utf8");
      mkdirSync(join(dest, ".."), { recursive: true });
      writeFileSync(dest, content, "utf8");
      rmSync(src, { force: true });
      return true;
    },
    getFileModificationTime(path: string) {
      return statSync(path).mtimeMs;
    },
  };
}

describe("Queue cleanup TTL", () => {
  const originalFm = (globalThis as any).fm;
  const originalDprint = (globalThis as any).dprint;

  beforeEach(() => {
    mkdirSync(TEST_ROOT, { recursive: true });
    (globalThis as any).fm = buildFm();
    (globalThis as any).dprint = () => {};
  });

  afterEach(() => {
    (globalThis as any).fm = originalFm;
    (globalThis as any).dprint = originalDprint;
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test("borra residuos viejos y conserva archivos recientes", () => {
    const commandsDir = join(TEST_ROOT, "commands");
    const inFlightDir = join(TEST_ROOT, "in-flight");
    mkdirSync(commandsDir, { recursive: true });
    mkdirSync(inFlightDir, { recursive: true });

    const queuePath = join(commandsDir, "_queue.json");
    const staleCommand = "000000005306-__evaluate.json";
    const freshCommand = "000000008020-__ping.json";
    const staleInFlight = "000000005307-__evaluate.json";

    writeFileSync(queuePath, JSON.stringify([staleCommand, freshCommand, staleInFlight], null, 2));
    writeFileSync(join(commandsDir, staleCommand), JSON.stringify({ id: staleCommand }, null, 2));
    writeFileSync(join(commandsDir, freshCommand), JSON.stringify({ id: freshCommand }, null, 2));
    writeFileSync(join(inFlightDir, staleInFlight), JSON.stringify({ id: staleInFlight }, null, 2));

    const staleTime = new Date(Date.now() - 2 * HOUR_MS);
    utimesSync(join(commandsDir, staleCommand), staleTime, staleTime);
    utimesSync(join(inFlightDir, staleInFlight), staleTime, staleTime);

    const queueIndex = createQueueIndex(commandsDir);
    const cleanup = createQueueCleanup(commandsDir, inFlightDir, queueIndex);

    cleanup.cleanup("000000009999-__ping.json");

    expect(existsSync(join(commandsDir, staleCommand))).toBe(false);
    expect(existsSync(join(inFlightDir, staleInFlight))).toBe(false);
    expect(existsSync(join(commandsDir, freshCommand))).toBe(true);
    expect(existsSync(queuePath)).toBe(true);

    const queue = JSON.parse(readFileSync(queuePath, "utf8"));
    expect(queue).toContain(freshCommand);
    expect(queue).not.toContain(staleCommand);
    expect(queue).not.toContain(staleInFlight);
  });
});
