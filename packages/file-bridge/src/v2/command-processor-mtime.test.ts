/**
 * Tests de locking optimista basado en mtime para CommandProcessor.
 *
 * Cubre:
 *  - ReaddirCache tracking de mtimeMs del directorio
 *  - Skip rápido en pickNextCommand cuando mtime no cambió
 *  - forceFresh para forzar re-lectura
 *  - Métricas nuevas
 *  - Concurrencia
 *  - Invalidación de cache tras claim
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  mkdirSync,
  rmSync,
  writeFileSync,
  utimesSync,
  mkdtempSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BridgePathLayout } from "../shared/path-layout.js";
import { EventLogWriter } from "../event-log-writer.js";
import { SequenceStore } from "../shared/sequence-store.js";
import { CommandProcessor } from "./command-processor.js";
import { ReaddirCache } from "../shared/readdir-cache.js";
import { FileBridgeMetrics } from "../file-bridge-metrics.js";

function makeTestRoot(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

function commandEnvelope(seq: number, type: string, payload: Record<string, unknown> = {}) {
  return {
    protocolVersion: 2,
    id: `cmd_${String(seq).padStart(12, "0")}`,
    seq,
    createdAt: Date.now(),
    type,
    payload: { type, ...payload },
    attempt: 1,
  };
}

function touchDirFuture(dir: string, offsetMs = 2000): void {
  const future = new Date(Date.now() + offsetMs);
  utimesSync(dir, future, future);
}

describe("ReaddirCache mtime tracking", () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTestRoot("mtime-cache-");
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("getDirectoryMtime retorna null antes del primer read", () => {
    const cache = new ReaddirCache({ ttlMs: 1000 });
    expect(cache.getDirectoryMtime(dir)).toBeNull();
  });

  test("getDirectoryMtime se actualiza después de list()", () => {
    const cache = new ReaddirCache({ ttlMs: 1000 });
    writeFileSync(join(dir, "a.json"), "{}");
    cache.list(dir);
    const mtime = cache.getDirectoryMtime(dir);
    expect(mtime).not.toBeNull();
    expect(typeof mtime).toBe("number");
  });

  test("cache detecta cambio de mtime tras modificar el directorio", async () => {
    let readCount = 0;
    const cache = new ReaddirCache({
      ttlMs: 30,
      reader: () => {
        readCount++;
        return [];
      },
    });

    cache.list(dir);
    expect(readCount).toBe(1);

    // Esperar a que TTL expire Y forzar cambio de mtime
    await new Promise((r) => setTimeout(r, 60));
    touchDirFuture(dir);

    // TTL expiró Y mtime cambió → re-lectura obligatoria
    cache.list(dir);
    expect(readCount).toBe(2);
  });
});

describe("CommandProcessor optimistic locking by mtime", () => {
  let TEST_ROOT: string;
  let paths: BridgePathLayout;
  let seq: SequenceStore;
  let writer: EventLogWriter;
  let processor: CommandProcessor;
  let metrics: FileBridgeMetrics;

  beforeEach(() => {
    TEST_ROOT = makeTestRoot("processor-mtime-");
    mkdirSync(TEST_ROOT, { recursive: true });
    paths = new BridgePathLayout(TEST_ROOT);
    seq = new SequenceStore(TEST_ROOT);
    writer = new EventLogWriter(paths, { rotateAtBytes: 1024 * 1024 });
    metrics = new FileBridgeMetrics();
    processor = new CommandProcessor(paths, writer, seq, 100, metrics);
    mkdirSync(paths.commandsDir(), { recursive: true });
    mkdirSync(paths.resultsDir(), { recursive: true });
    mkdirSync(paths.inFlightDir(), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test("pickNextCommand retorna null cuando mtime no cambió y no hubo claim previo", () => {
    writeFileSync(
      join(paths.commandsDir(), "000000000001-listDevices.json"),
      JSON.stringify(commandEnvelope(1, "listDevices"), null, 2),
    );

    // Primer call: reclama el comando
    const first = processor.pickNextCommand();
    expect(first?.id).toBe("cmd_000000000001");

    // Segundo call: cola vacía, mtime no cambió → skip rápido
    const second = processor.pickNextCommand();
    expect(second).toBeNull();
  });

  test("pickNextCommand con forceFresh=true siempre lee del disco", () => {
    writeFileSync(
      join(paths.commandsDir(), "000000000001-listDevices.json"),
      JSON.stringify(commandEnvelope(1, "listDevices"), null, 2),
    );

    const first = processor.pickNextCommand();
    expect(first?.id).toBe("cmd_000000000001");

    // Crear un nuevo archivo después del primer claim
    writeFileSync(
      join(paths.commandsDir(), "000000000002-listDevices.json"),
      JSON.stringify(commandEnvelope(2, "listDevices"), null, 2),
    );

    // forceFresh=true ignora el skip por mtime
    const second = processor.pickNextCommand({ forceFresh: true });
    expect(second?.id).toBe("cmd_000000000002");
  });

  test("modificar el directorio (touch) actualiza mtime y permite detectar nuevo archivo", () => {
    writeFileSync(
      join(paths.commandsDir(), "000000000001-listDevices.json"),
      JSON.stringify(commandEnvelope(1, "listDevices"), null, 2),
    );

    const first = processor.pickNextCommand();
    expect(first).not.toBeNull();

    // Force mtime change futuro
    touchDirFuture(paths.commandsDir());

    // Añadir nuevo archivo
    writeFileSync(
      join(paths.commandsDir(), "000000000002-listDevices.json"),
      JSON.stringify(commandEnvelope(2, "listDevices"), null, 2),
    );

    const second = processor.pickNextCommand();
    expect(second?.id).toBe("cmd_000000000002");
  });

  test("métricas registran skips por mtime correctamente", () => {
    writeFileSync(
      join(paths.commandsDir(), "000000000001-listDevices.json"),
      JSON.stringify(commandEnvelope(1, "listDevices"), null, 2),
    );

    // Call 1: claim (no skip — primer read)
    processor.pickNextCommand();
    // Call 2: re-list vacío (no skip — veníamos de un claim)
    processor.pickNextCommand();
    // Call 3: skip (mtime no cambió y no hubo claim en la última)
    processor.pickNextCommand();
    // Call 4: skip
    processor.pickNextCommand();

    const snap = metrics.getSnapshot();
    expect(snap.pickNextCommandCalls).toBe(4);
    expect(snap.pickNextCommandSkippedByMtime).toBe(2);
  });

  test("concurrencia: múltiples llamadas en sucesión solo permiten un claim", () => {
    writeFileSync(
      join(paths.commandsDir(), "000000000001-listDevices.json"),
      JSON.stringify(commandEnvelope(1, "listDevices"), null, 2),
    );

    // Múltiples calls en sucesión rápida (simula múltiples workers)
    const results = [
      processor.pickNextCommand(),
      processor.pickNextCommand(),
      processor.pickNextCommand(),
    ];

    const claimed = results.filter((r) => r !== null);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.id).toBe("cmd_000000000001");
  });

  test("cache invalida explícitamente tras un claim exitoso", () => {
    writeFileSync(
      join(paths.commandsDir(), "000000000001-listDevices.json"),
      JSON.stringify(commandEnvelope(1, "listDevices"), null, 2),
    );

    const first = processor.pickNextCommand();
    expect(first?.id).toBe("cmd_000000000001");

    // Tras claim exitoso, el cache del dir commands/ debe estar invalidado
    const cache = (processor as unknown as { readdirCache: ReaddirCache }).readdirCache;
    expect(cache.hasFreshEntry(paths.commandsDir())).toBe(false);
  });

  test("forceFresh=true registra cache hit cuando list() sirve archivos cacheados", () => {
    // Dir vacío: primer call es miss, no files, no claim.
    processor.pickNextCommand();

    // Segundo call con forceFresh=true: el mtime no cambió, el TTL no expiró,
    // y no hubo claim previo → list() retorna el cache (cache hit).
    processor.pickNextCommand({ forceFresh: true });

    const snap = metrics.getSnapshot();
    expect(snap.pickNextCommandCalls).toBe(2);
    expect(snap.pickNextCommandByCacheHit).toBe(1);
  });
});
