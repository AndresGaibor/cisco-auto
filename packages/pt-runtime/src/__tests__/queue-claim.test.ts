import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { createQueueClaim } from "../pt/kernel/queue-claim";
import { createQueueIndex } from "../pt/kernel/queue-index";
import { createQueueDiscovery } from "../pt/kernel/queue-discovery";
import { createDeadLetter } from "../pt/kernel/dead-letter";

const TEST_ROOT = "/tmp/queue-claim-test-" + Math.random().toString(36).slice(2);

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
      return Date.now();
    },
  };
}

describe("queue-claim", () => {
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

  test("envelope sin id|seq|type|payload va a dead-letter", () => {
    const commandsDir = join(TEST_ROOT, "commands");
    const inFlightDir = join(TEST_ROOT, "in-flight");
    const deadLetterDir = join(TEST_ROOT, "dead-letter");
    mkdirSync(commandsDir, { recursive: true });
    mkdirSync(inFlightDir, { recursive: true });
    mkdirSync(deadLetterDir, { recursive: true });

    const invalidEnvelope = "000000005306-__evaluate.json";
    writeFileSync(join(commandsDir, invalidEnvelope), JSON.stringify({ foo: "bar" }, null, 2));

    const queueIndex = createQueueIndex(commandsDir);
    const queueDiscovery = createQueueDiscovery(commandsDir);
    const deadLetter = createDeadLetter(deadLetterDir);
    const claim = createQueueClaim(commandsDir, inFlightDir, queueIndex, queueDiscovery, deadLetter);

    const result = claim.poll();

    expect(result).toBeNull();
  });

  test("archivo vacío va a dead-letter", () => {
    const commandsDir = join(TEST_ROOT, "commands");
    const inFlightDir = join(TEST_ROOT, "in-flight");
    const deadLetterDir = join(TEST_ROOT, "dead-letter");
    mkdirSync(commandsDir, { recursive: true });
    mkdirSync(inFlightDir, { recursive: true });
    mkdirSync(deadLetterDir, { recursive: true });

    const emptyFile = "000000005306-__evaluate.json";
    writeFileSync(join(commandsDir, emptyFile), "");

    const queueIndex = createQueueIndex(commandsDir);
    const queueDiscovery = createQueueDiscovery(commandsDir);
    const deadLetter = createDeadLetter(deadLetterDir);
    const claim = createQueueClaim(commandsDir, inFlightDir, queueIndex, queueDiscovery, deadLetter);

    const result = claim.poll();

    expect(result).toBeNull();
  });

  test("listCandidates combina índice y scan sin duplicados", () => {
    const commandsDir = join(TEST_ROOT, "commands");
    const inFlightDir = join(TEST_ROOT, "in-flight");
    const deadLetterDir = join(TEST_ROOT, "dead-letter");
    mkdirSync(commandsDir, { recursive: true });
    mkdirSync(inFlightDir, { recursive: true });
    mkdirSync(deadLetterDir, { recursive: true });

    const cmd1 = "000000005306-__evaluate.json";
    const cmd2 = "000000005307-__ping.json";
    const queuePath = join(commandsDir, "_queue.json");

    writeFileSync(join(commandsDir, cmd1), JSON.stringify({ id: cmd1, seq: 5306, type: "__evaluate", payload: {} }, null, 2));
    writeFileSync(queuePath, JSON.stringify([cmd1, cmd2], null, 2));

    const queueIndex = createQueueIndex(commandsDir);
    const queueDiscovery = createQueueDiscovery(commandsDir);
    const deadLetter = createDeadLetter(deadLetterDir);
    const claim = createQueueClaim(commandsDir, inFlightDir, queueIndex, queueDiscovery, deadLetter);

    const candidates = claim.count();

    expect(candidates).toBeGreaterThan(0);
  });

  test("poll devuelve null cuando no hay comandos", () => {
    const commandsDir = join(TEST_ROOT, "commands");
    const inFlightDir = join(TEST_ROOT, "in-flight");
    const deadLetterDir = join(TEST_ROOT, "dead-letter");
    mkdirSync(commandsDir, { recursive: true });
    mkdirSync(inFlightDir, { recursive: true });
    mkdirSync(deadLetterDir, { recursive: true });

    const queueIndex = createQueueIndex(commandsDir);
    const queueDiscovery = createQueueDiscovery(commandsDir);
    const deadLetter = createDeadLetter(deadLetterDir);
    const claim = createQueueClaim(commandsDir, inFlightDir, queueIndex, queueDiscovery, deadLetter);

    const result = claim.poll();

    expect(result).toBeNull();
  });
});