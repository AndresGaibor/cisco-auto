/**
 * Tests para el módulo de garbage collection de results/.
 *
 * Verifica:
 * - dry-run no borra nada
 * - no borra results recientes
 * - ignora sidecars correctamente
 * - reporta cantidad y bytes liberables
 * - nunca toca commands/ ni in-flight/
 */
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
  utimesSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ResultsGC, parseOlderThan, formatBytes } from "../src/gc.js";

describe("ResultsGC", () => {
  let tempDir: string;
  let gc: ResultsGC;
  let resultsDir: string;
  let commandsDir: string;
  let inFlightDir: string;
  let logsDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "results-gc-test-"));
    mkdirSync(join(tempDir, "results"), { recursive: true });
    mkdirSync(join(tempDir, "commands"), { recursive: true });
    mkdirSync(join(tempDir, "in-flight"), { recursive: true });
    mkdirSync(join(tempDir, "logs"), { recursive: true });

    resultsDir = join(tempDir, "results");
    commandsDir = join(tempDir, "commands");
    inFlightDir = join(tempDir, "in-flight");
    logsDir = join(tempDir, "logs");

    gc = new ResultsGC(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function createOldResult(id: string, ageMs: number = 8 * 24 * 60 * 60 * 1000): string {
    const filePath = join(resultsDir, `${id}.json`);
    writeFileSync(filePath, JSON.stringify({ id, status: "completed" }));
    const now = Date.now();
    const oldTime = now - ageMs;
    try {
      utimesSync(filePath, new Date(now), new Date(oldTime));
    } catch {
      // Ignore if utimes fails in some environments
    }
    return filePath;
  }

  function createRecentResult(id: string): string {
    return join(resultsDir, `${id}.json`);
  }

  describe("parseOlderThan", () => {
    test("parse days correctly", () => {
      expect(parseOlderThan("7d")).toBe(7 * 24 * 60 * 60 * 1000);
    });

    test("parse hours correctly", () => {
      expect(parseOlderThan("24h")).toBe(24 * 60 * 60 * 1000);
    });

    test("parse minutes correctly", () => {
      expect(parseOlderThan("60m")).toBe(60 * 60 * 1000);
    });

    test("parse seconds correctly", () => {
      expect(parseOlderThan("3600s")).toBe(3600 * 1000);
    });

    test("throw on invalid format", () => {
      expect(() => parseOlderThan("7")).toThrow();
      expect(() => parseOlderThan("xyz")).toThrow();
      expect(() => parseOlderThan("7x")).toThrow();
    });
  });

  describe("formatBytes", () => {
    test("format bytes", () => {
      expect(formatBytes(500)).toBe("500B");
    });

    test("format kilobytes", () => {
      expect(formatBytes(1536)).toBe("1.5KB");
    });

    test("format megabytes", () => {
      expect(formatBytes(1024 * 1024 * 2.5)).toBe("2.5MB");
    });

    test("format gigabytes", () => {
      expect(formatBytes(1024 * 1024 * 1024 * 1.5)).toBe("1.5GB");
    });
  });

  describe("dry-run mode", () => {
    test("no borra nada en dry-run", () => {
      const oldFile = createOldResult("cmd_000000000001", 8 * 24 * 60 * 60 * 1000);

      const result = gc.run({ olderThanMs: 7 * 24 * 60 * 60 * 1000, dryRun: true });

      expect(existsSync(oldFile)).toBe(true);
      expect(result.deletedFiles).toBe(0);
      expect(result.skippedFiles.length).toBeGreaterThan(0);
    });

    test("dry-run reporta bytes liberables sin borrar", () => {
      const oldFile = createOldResult("cmd_000000000001", 8 * 24 * 60 * 60 * 1000);
      const stat = statSync(oldFile);

      const result = gc.run({ olderThanMs: 7 * 24 * 60 * 60 * 1000, dryRun: true });

      expect(result.freedBytes).toBeGreaterThanOrEqual(stat.size);
      expect(existsSync(oldFile)).toBe(true);
    });
  });

  describe("protección de results recientes", () => {
    test("no borra results recientes (dentro del umbral)", () => {
      const recentFile = join(resultsDir, "cmd_000000000002.json");
      writeFileSync(recentFile, JSON.stringify({ id: "cmd_000000000002" }));

      const result = gc.run({ olderThanMs: 7 * 24 * 60 * 60 * 1000 });

      expect(existsSync(recentFile)).toBe(true);
      expect(result.candidatesForDeletion).toBe(0);
    });

    test("resultados exactamente en el umbral se protegen", () => {
      const file = join(resultsDir, "cmd_000000000003.json");
      writeFileSync(file, JSON.stringify({ id: "cmd_000000000003" }));

      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const result = gc.run({ olderThanMs: sevenDaysMs });

      expect(existsSync(file)).toBe(true);
    });
  });

  describe("ignora sidecars correctamente", () => {
    test("detecta y reporta sidecars", () => {
      writeFileSync(join(resultsDir, ".hidden"), "hidden");
      writeFileSync(join(resultsDir, "result.json.tmp"), "tmp");
      writeFileSync(join(resultsDir, "result.tmp.json"), "tmp");
      writeFileSync(join(resultsDir, "result.meta.json"), "meta");
      writeFileSync(join(resultsDir, "result.error.json"), "error");

      const report = gc.generateReport(0);

      expect(report.sidecarCount).toBe(5);
    });

    test("sidecars no se cuentan como candidates", () => {
      createOldResult("cmd_000000000010", 10 * 24 * 60 * 60 * 1000);
      writeFileSync(join(resultsDir, "cmd_000000000010.json.tmp"), "tmp");

      const report = gc.generateReport(7 * 24 * 60 * 60 * 1000);

      expect(report.candidatesCount).toBe(1);
      expect(report.sidecarCount).toBe(1);
    });
  });

  describe("reporta cantidad y bytes liberables", () => {
    test("genera reporte correcto con archivos antiguos", () => {
      createOldResult("cmd_000000000011", 10 * 24 * 60 * 60 * 1000);
      createOldResult("cmd_000000000012", 15 * 24 * 60 * 60 * 1000);

      const report = gc.generateReport(7 * 24 * 60 * 60 * 1000);

      expect(report.candidatesCount).toBe(2);
      expect(report.candidatesBytes).toBeGreaterThan(0);
      expect(report.dryRunFreedBytes).toBeGreaterThanOrEqual(report.candidatesBytes);
    });

    test("reporte incluye stats de archivos protegidos", () => {
      createOldResult("cmd_000000000013", 10 * 24 * 60 * 60 * 1000);
      const recentFile = join(resultsDir, "cmd_000000000014.json");
      writeFileSync(recentFile, JSON.stringify({ id: "cmd_000000000014" }));

      const report = gc.generateReport(7 * 24 * 60 * 60 * 1000);

      expect(report.totalResults).toBe(2);
      expect(report.candidatesCount).toBe(1);
      expect(report.recentCount).toBe(1);
    });
  });

  describe("nunca toca commands/ ni in-flight/", () => {
    test("commands/ no se afecta", () => {
      const cmdFile = join(commandsDir, "000000000001-test.json");
      writeFileSync(cmdFile, JSON.stringify({ seq: 1, type: "test" }));

      createOldResult("cmd_000000000015", 10 * 24 * 60 * 60 * 1000);

      gc.run({ olderThanMs: 0 });

      expect(existsSync(cmdFile)).toBe(true);
      expect(readdirSync(commandsDir).filter((f) => f.endsWith(".json")).length).toBe(1);
    });

    test("in-flight/ no se afecta", () => {
      const inFlightFile = join(inFlightDir, "000000000002-test.json");
      writeFileSync(inFlightFile, JSON.stringify({ seq: 2, type: "test" }));

      createOldResult("cmd_000000000016", 10 * 24 * 60 * 60 * 1000);

      gc.run({ olderThanMs: 0 });

      expect(existsSync(inFlightFile)).toBe(true);
      expect(readdirSync(inFlightDir).filter((f) => f.endsWith(".json")).length).toBe(1);
    });

    test("results referenciados se preservan", () => {
      const resultId = "cmd_000000000017";
      createOldResult(resultId, 10 * 24 * 60 * 60 * 1000);

      writeFileSync(join(logsDir, "events.rotated.ndjson"), JSON.stringify({
        type: "result",
        resultId: resultId,
      }) + "\n");

      const result = gc.run({ olderThanMs: 0 });

      expect(result.candidatesForDeletion).toBe(0);
      expect(existsSync(join(resultsDir, `${resultId}.json`))).toBe(true);
    });
  });

  describe("dead-letter se preserva", () => {
    test("archivo dead-letter no se borra", () => {
      const deadLetterDir = join(tempDir, "dead-letter");
      mkdirSync(deadLetterDir, { recursive: true });
      const deadLetterFile = join(deadLetterDir, "cmd_000000000018.json");
      writeFileSync(deadLetterFile, JSON.stringify({ id: "cmd_000000000018", error: "fail" }));

      gc.run({ olderThanMs: 0 });

      expect(existsSync(deadLetterFile)).toBe(true);
    });
  });

  describe("archive mode", () => {
    test("archiva en lugar de borrar", () => {
      const oldFile = createOldResult("cmd_000000000019", 10 * 24 * 60 * 60 * 1000);

      const archiveDir = join(tempDir, "archive");
      const result = gc.run({
        olderThanMs: 0,
        archive: true,
        archiveDir,
      });

      expect(existsSync(oldFile)).toBe(false);
      expect(existsSync(join(archiveDir, "cmd_000000000019.json"))).toBe(true);
      expect(result.archivedFiles).toBe(1);
    });

    test("dry-run con archive no hace nada", () => {
      const oldFile = createOldResult("cmd_000000000020", 10 * 24 * 60 * 60 * 1000);
      const archiveDir = join(tempDir, "archive");

      gc.run({ olderThanMs: 0, archive: true, dryRun: true, archiveDir });

      expect(existsSync(oldFile)).toBe(true);
      expect(existsSync(archiveDir)).toBe(false);
    });
  });

  describe("colección de IDs referenciados", () => {
    test("extrae resultIds de eventos en logs", () => {
      const resultId = "cmd_000000000042";
      writeFileSync(
        join(logsDir, "events.rotated.ndjson"),
        JSON.stringify({ type: "completed", resultId, value: { resultId } }) + "\n"
      );

      const referencedIds = gc.collectReferencedIds();

      expect(referencedIds.has(resultId)).toBe(true);
    });

    test("result referenciado no se borra", () => {
      const resultId = "cmd_000000000042";
      createOldResult(resultId, 10 * 24 * 60 * 60 * 1000);

      writeFileSync(
        join(logsDir, "events.rotated.ndjson"),
        JSON.stringify({ type: "completed", resultId }) + "\n"
      );

      const result = gc.run({ olderThanMs: 0 });

      expect(result.candidatesForDeletion).toBe(0);
      expect(result.referencedIds.has(resultId)).toBe(true);
    });
  });

  describe("edge cases", () => {
    test("directorio results vacío", () => {
      const result = gc.run();

      expect(result.scannedResults).toBe(0);
      expect(result.candidatesForDeletion).toBe(0);
      expect(result.freedBytes).toBe(0);
    });

    test("directorio results no existe", () => {
      rmSync(resultsDir, { recursive: true, force: true });

      const result = gc.run();

      expect(result.scannedResults).toBe(0);
      expect(result.errors.length).toBe(0);
    });

    test("maneja JSON inválido en logs", () => {
      writeFileSync(join(logsDir, "events.rotated.ndjson"), "not valid json\n");

      const referencedIds = gc.collectReferencedIds();

      expect(referencedIds.size).toBe(0);
    });

    test("llamados múltiples son seguros", () => {
      createOldResult("cmd_000000000050", 10 * 24 * 60 * 60 * 1000);

      const result1 = gc.run({ olderThanMs: 0 });
      const result2 = gc.run({ olderThanMs: 0 });

      expect(result1.scannedResults).toBe(1);
      expect(result2.scannedResults).toBe(0);
    });
  });
});
