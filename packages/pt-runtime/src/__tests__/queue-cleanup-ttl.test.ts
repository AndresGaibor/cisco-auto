import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createQueueCleanup } from "../pt/kernel/queue-cleanup";
import { createQueueIndex } from "../pt/kernel/queue-index";
import { createQueueDiscovery } from "../pt/kernel/queue-discovery";
import { createDeadLetter } from "../pt/kernel/dead-letter";

let TEST_ROOT = "";
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
    TEST_ROOT = mkdtempSync(join(tmpdir(), "queue-cleanup-ttl-test-"));
    (globalThis as any).fm = buildFm();
    (globalThis as any).dprint = () => {};
  });

  afterEach(() => {
    (globalThis as any).fm = originalFm;
    (globalThis as any).dprint = originalDprint;
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test("preserva commands stale y limpia in-flight stale", () => {
    const commandsDir = join(TEST_ROOT, "commands");
    const inFlightDir = join(TEST_ROOT, "in-flight");
    mkdirSync(commandsDir, { recursive: true });
    mkdirSync(inFlightDir, { recursive: true });

    const queuePath = join(commandsDir, "_queue.json");
    const staleCommand = "000000005306-execIos.json";
    const freshCommand = "000000008020-showVersion.json";
    const staleInFlight = "000000005307-execIos.json";

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

    expect(existsSync(join(commandsDir, staleCommand))).toBe(true);
    expect(existsSync(join(inFlightDir, staleInFlight))).toBe(false);
    expect(existsSync(join(commandsDir, freshCommand))).toBe(true);
    expect(existsSync(queuePath)).toBe(true);

    const queue = JSON.parse(readFileSync(queuePath, "utf8"));
    expect(queue).toContain(freshCommand);
    expect(queue).toContain(staleCommand);
    expect(queue).not.toContain(staleInFlight);
  });
});

describe("queue cleanup — no-loss invariants", () => {
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

  test("NO borra command que existe en commands/ aunque no esté en _queue.json", () => {
    const commandsDir = join(TEST_ROOT, "commands");
    const inFlightDir = join(TEST_ROOT, "in-flight");
    mkdirSync(commandsDir, { recursive: true });
    mkdirSync(inFlightDir, { recursive: true });

    const orphanCommand = "000000005306-execIos.json";
    writeFileSync(join(commandsDir, orphanCommand), JSON.stringify({ id: orphanCommand }, null, 2));

    const queueIndex = createQueueIndex(commandsDir);
    const queueDiscovery = createQueueDiscovery(commandsDir);
    const deadLetter = createDeadLetter(join(TEST_ROOT, "dead-letter"));
    const cleanup = createQueueCleanup(commandsDir, inFlightDir, queueIndex);

    cleanup.cleanup("nonexistent-cmd.json");

    expect(existsSync(join(commandsDir, orphanCommand))).toBe(true);
  });

  test("reindexa entradas faltantes en _queue.json", () => {
    const commandsDir = join(TEST_ROOT, "commands");
    const inFlightDir = join(TEST_ROOT, "in-flight");
    mkdirSync(commandsDir, { recursive: true });
    mkdirSync(inFlightDir, { recursive: true });

    const queuePath = join(commandsDir, "_queue.json");
    const missingCommand = "000000005306-execIos.json";
    writeFileSync(queuePath, JSON.stringify([], null, 2));
    writeFileSync(join(commandsDir, missingCommand), JSON.stringify({ id: missingCommand }, null, 2));

    const queueIndex = createQueueIndex(commandsDir);
    const cleanup = createQueueCleanup(commandsDir, inFlightDir, queueIndex);

    cleanup.reconcileIndex();

    const queue = JSON.parse(readFileSync(queuePath, "utf8"));
    expect(queue).toContain(missingCommand);
  });

  test("si _queue.json está corrupto, read() devuelve [] y no lanza", () => {
    const commandsDir = join(TEST_ROOT, "commands");
    mkdirSync(commandsDir, { recursive: true });

    writeFileSync(join(commandsDir, "_queue.json"), "{ invalid json {{{");

    const queueIndex = createQueueIndex(commandsDir);

    expect(() => queueIndex.read()).not.toThrow();
    expect(queueIndex.read()).toEqual([]);
  });

  test("stale in-flight se limpia, stale command se preserva, pero command sano no", () => {
    const commandsDir = join(TEST_ROOT, "commands");
    const inFlightDir = join(TEST_ROOT, "in-flight");
    mkdirSync(commandsDir, { recursive: true });
    mkdirSync(inFlightDir, { recursive: true });

    const staleCommand = "000000005306-execIos.json";
    const staleInFlight = "000000005307-execIos.json";
    const healthyCommand = "000000008020-showVersion.json";

    writeFileSync(join(commandsDir, staleCommand), JSON.stringify({ id: staleCommand }, null, 2));
    writeFileSync(join(commandsDir, healthyCommand), JSON.stringify({ id: healthyCommand }, null, 2));
    writeFileSync(join(inFlightDir, staleInFlight), JSON.stringify({ id: staleInFlight }, null, 2));

    const staleTime = new Date(Date.now() - 2 * HOUR_MS);
    utimesSync(join(commandsDir, staleCommand), staleTime, staleTime);
    utimesSync(join(inFlightDir, staleInFlight), staleTime, staleTime);

    const queueIndex = createQueueIndex(commandsDir);
    const cleanup = createQueueCleanup(commandsDir, inFlightDir, queueIndex);

    cleanup.reconcileIndex();

    expect(existsSync(join(commandsDir, staleCommand))).toBe(true);
    expect(existsSync(join(inFlightDir, staleInFlight))).toBe(false);
    expect(existsSync(join(commandsDir, healthyCommand))).toBe(true);
  });

  test("reconcileIndex no elimina __pollDeferred pendiente en commands", () => {
    const commandsDir = join(TEST_ROOT, "commands");
    const inFlightDir = join(TEST_ROOT, "in-flight");
    mkdirSync(commandsDir, { recursive: true });
    mkdirSync(inFlightDir, { recursive: true });

    const filename = "000000000123-__pollDeferred.json";
    const commandPath = join(commandsDir, filename);

    writeFileSync(
      commandPath,
      JSON.stringify({
        protocolVersion: 2,
        id: "cmd_000000000123",
        seq: 123,
        type: "__pollDeferred",
        payload: { type: "__pollDeferred", ticket: "ticket-1" },
        createdAt: Date.now() - 60_000,
      }),
      "utf8",
    );

    const staleTime = new Date(Date.now() - 2 * HOUR_MS);
    utimesSync(commandPath, staleTime, staleTime);

    const queueIndex = createQueueIndex(commandsDir);
    queueIndex.add(filename);

    const cleanup = createQueueCleanup(commandsDir, inFlightDir, queueIndex);
    cleanup.reconcileIndex();

    expect(existsSync(commandPath)).toBe(true);
    expect(queueIndex.read()).toContain(filename);
  });

  test("reconcileIndex no elimina comandos control pending", () => {
    const commandsDir = join(TEST_ROOT, "commands");
    const inFlightDir = join(TEST_ROOT, "in-flight");
    mkdirSync(commandsDir, { recursive: true });
    mkdirSync(inFlightDir, { recursive: true });

    const filename = "000000000124-inspectDeviceFast.json";
    const commandPath = join(commandsDir, filename);

    writeFileSync(
      commandPath,
      JSON.stringify({
        protocolVersion: 2,
        id: "cmd_000000000124",
        seq: 124,
        type: "inspectDeviceFast",
        payload: { type: "inspectDeviceFast", device: "SW-SRV-DIST" },
        createdAt: Date.now() - 60_000,
      }),
      "utf8",
    );

    const staleTime = new Date(Date.now() - 2 * HOUR_MS);
    utimesSync(commandPath, staleTime, staleTime);

    const queueIndex = createQueueIndex(commandsDir);
    queueIndex.add(filename);

    const cleanup = createQueueCleanup(commandsDir, inFlightDir, queueIndex);
    cleanup.reconcileIndex();

    expect(existsSync(commandPath)).toBe(true);
    expect(queueIndex.read()).toContain(filename);
  });

  test("reconcileIndex preserva terminal.plan.run pendiente aunque parezca stale", () => {
    const commandsDir = join(TEST_ROOT, "commands");
    const inFlightDir = join(TEST_ROOT, "in-flight");
    mkdirSync(commandsDir, { recursive: true });
    mkdirSync(inFlightDir, { recursive: true });

    const filename = "000000099001-terminal.plan.run.json";
    const commandPath = join(commandsDir, filename);

    writeFileSync(
      commandPath,
      JSON.stringify({
        protocolVersion: 2,
        id: "cmd-terminal-plan",
        seq: 99001,
        type: "terminal.plan.run",
        payload: {
          type: "terminal.plan.run",
          plan: {
            id: "cmd-terminal-plan",
            device: "SW-SRV-DIST",
            steps: [{ kind: "command", command: "show running-config" }],
          },
        },
        createdAt: Date.now() - 2 * 60 * 60 * 1000,
      }),
      "utf8",
    );

    // Hacer que el archivo parezca stale a nivel de filesystem
    const staleTime = new Date(Date.now() - 2 * HOUR_MS);
    utimesSync(commandPath, staleTime, staleTime);

    const queueIndex = createQueueIndex(commandsDir);
    queueIndex.add(filename);

    const cleanup = createQueueCleanup(commandsDir, inFlightDir, queueIndex);
    cleanup.reconcileIndex();

    expect(existsSync(commandPath)).toBe(true);
    expect(queueIndex.read()).toContain(filename);
  });

  test("reconcileIndex preserva terminal.native.exec pendiente aunque parezca stale", () => {
    const commandsDir = join(TEST_ROOT, "commands");
    const inFlightDir = join(TEST_ROOT, "in-flight");
    mkdirSync(commandsDir, { recursive: true });
    mkdirSync(inFlightDir, { recursive: true });

    const filename = "000000099002-terminal.native.exec.json";
    const commandPath = join(commandsDir, filename);

    writeFileSync(
      commandPath,
      JSON.stringify({
        protocolVersion: 2,
        id: "cmd-native-exec",
        seq: 99002,
        type: "terminal.native.exec",
        payload: {
          type: "terminal.native.exec",
          device: "SW-SRV-DIST",
          command: "show version",
        },
        createdAt: Date.now() - 2 * 60 * 60 * 1000,
      }),
      "utf8",
    );

    const staleTime = new Date(Date.now() - 2 * HOUR_MS);
    utimesSync(commandPath, staleTime, staleTime);

    const queueIndex = createQueueIndex(commandsDir);
    queueIndex.add(filename);

    const cleanup = createQueueCleanup(commandsDir, inFlightDir, queueIndex);
    cleanup.reconcileIndex();

    expect(existsSync(commandPath)).toBe(true);
    expect(queueIndex.read()).toContain(filename);
  });

  test("reconcileIndex no elimina comandos pendientes genericos desde commands", () => {
    const commandsDir = join(TEST_ROOT, "commands");
    const inFlightDir = join(TEST_ROOT, "in-flight");
    mkdirSync(commandsDir, { recursive: true });
    mkdirSync(inFlightDir, { recursive: true });

    const filename = "000000099003-listDevices.json";
    const commandPath = join(commandsDir, filename);

    writeFileSync(
      commandPath,
      JSON.stringify({
        protocolVersion: 2,
        id: "cmd-list-devices",
        seq: 99003,
        type: "listDevices",
        payload: { type: "listDevices" },
        createdAt: Date.now() - 2 * 60 * 60 * 1000,
      }),
      "utf8",
    );

    const staleTime = new Date(Date.now() - 2 * HOUR_MS);
    utimesSync(commandPath, staleTime, staleTime);

    const queueIndex = createQueueIndex(commandsDir);
    queueIndex.add(filename);

    const cleanup = createQueueCleanup(commandsDir, inFlightDir, queueIndex);
    cleanup.reconcileIndex();

    expect(existsSync(commandPath)).toBe(true);
    expect(queueIndex.read()).toContain(filename);
  });
});
