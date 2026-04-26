import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  checkPtDevDirectory,
  checkLogDirectory,
  checkHistoryDirectory,
  checkResultsDirectory,
  checkRuntimeFiles,
  checkBridgeQueues,
  runDoctorFsChecks,
  runAllDoctorChecks,
  type DoctorPaths,
} from "../application/doctor/index.js";

describe("doctor use cases", () => {
  const testDir = join(import.meta.dir, "__test-tmp__");

  beforeAll(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe("checkPtDevDirectory", () => {
    test("returns critical when directory does not exist", () => {
      const result = checkPtDevDirectory("/nonexistent/path/pt-dev", false);
      expect(result.ok).toBe(false);
      expect(result.severity).toBe("critical");
      expect(result.name).toBe("pt-dev-accessible");
      expect(result.message).toContain("no existe");
    });

    test("returns info when directory exists", () => {
      const result = checkPtDevDirectory(testDir, false);
      expect(result.ok).toBe(true);
      expect(result.severity).toBe("info");
      expect(result.name).toBe("pt-dev-accessible");
      expect(result.message).toContain(testDir);
    });
  });

  describe("checkLogDirectory", () => {
    test("creates directory if missing and returns warning", () => {
      const missingDir = join(testDir, "missing-logs");
      const result = checkLogDirectory(missingDir, false);
      expect(result.ok).toBe(true);
      expect(result.severity).toBe("warning");
      expect(result.name).toBe("logs-writable");
      expect(result.message).toContain("creado");
    });

    test("returns info when directory exists", () => {
      const result = checkLogDirectory(testDir, false);
      expect(result.ok).toBe(true);
      expect(result.severity).toBe("info");
      expect(result.name).toBe("logs-writable");
      expect(result.message).toContain("logs");
    });
  });

  describe("checkHistoryDirectory", () => {
    test("creates directory if missing and returns warning", () => {
      const missingDir = join(testDir, "missing-history");
      const result = checkHistoryDirectory(missingDir, false);
      expect(result.ok).toBe(true);
      expect(result.severity).toBe("warning");
      expect(result.name).toBe("history-writable");
      expect(result.message).toContain("creado");
    });

    test("returns info when directory exists", () => {
      const result = checkHistoryDirectory(testDir, false);
      expect(result.ok).toBe(true);
      expect(result.severity).toBe("info");
      expect(result.name).toBe("history-writable");
      expect(result.message).toContain("historial");
    });
  });

  describe("checkResultsDirectory", () => {
    test("creates directory if missing and returns warning", () => {
      const missingDir = join(testDir, "missing-results");
      const result = checkResultsDirectory(missingDir, false);
      expect(result.ok).toBe(true);
      expect(result.severity).toBe("warning");
      expect(result.name).toBe("results-writable");
      expect(result.message).toContain("creado");
    });

    test("returns info when directory exists", () => {
      const result = checkResultsDirectory(testDir, false);
      expect(result.ok).toBe(true);
      expect(result.severity).toBe("info");
      expect(result.name).toBe("results-writable");
      expect(result.message).toContain("resultados");
    });
  });

  describe("checkRuntimeFiles", () => {
    test("returns critical when no runtime files exist", () => {
      const result = checkRuntimeFiles("/nonexistent/pt-dev", false);
      expect(result.ok).toBe(false);
      expect(result.severity).toBe("critical");
      expect(result.name).toBe("runtime-present");
      expect(result.message).toContain("no encontrados");
    });

    test("returns warning when only one runtime file exists", () => {
      const partialDir = join(testDir, "partial-runtime");
      mkdirSync(partialDir, { recursive: true });
      writeFileSync(join(partialDir, "main.js"), "// just a placeholder");

      const result = checkRuntimeFiles(partialDir, false);
      expect(result.ok).toBe(false);
      expect(result.severity).toBe("warning");
      expect(result.message).toContain("parcial");
    });

    test("returns info when both runtime files exist", () => {
      const fullDir = join(testDir, "full-runtime");
      mkdirSync(fullDir, { recursive: true });
      writeFileSync(join(fullDir, "main.js"), "// main");
      writeFileSync(join(fullDir, "runtime.js"), "// runtime");

      const result = checkRuntimeFiles(fullDir, false);
      expect(result.ok).toBe(true);
      expect(result.severity).toBe("info");
      expect(result.name).toBe("runtime-present");
      expect(result.message).toContain("main.js");
      expect(result.message).toContain("runtime.js");
    });
  });

  describe("checkBridgeQueues", () => {
    test("returns info when queues are empty", () => {
      const result = checkBridgeQueues(testDir, false);
      expect(result.ok).toBe(true);
      expect(result.severity).toBe("info");
      expect(result.name).toBe("bridge-queues");
    });

    test("returns critical when dead-letter has items", () => {
      const dlDir = join(testDir, "dead-letter");
      mkdirSync(dlDir, { recursive: true });
      writeFileSync(join(dlDir, "cmd-1.json"), "{}");

      const result = checkBridgeQueues(testDir, false);
      expect(result.ok).toBe(false);
      expect(result.severity).toBe("critical");

      rmSync(join(dlDir, "cmd-1.json"));
    });

    test("returns warning when in-flight exceeds 5", () => {
      const inFlightDir = join(testDir, "in-flight");
      mkdirSync(inFlightDir, { recursive: true });
      for (let i = 0; i < 6; i++) {
        writeFileSync(join(inFlightDir, `cmd-${i}.json`), "{}");
      }

      const result = checkBridgeQueues(testDir, false);
      expect(result.ok).toBe(true); // 6 < 10 so ok=true, but severity=warning
      expect(result.severity).toBe("warning");
      expect(result.message).toContain("in-flight");

      for (let i = 0; i < 6; i++) {
        rmSync(join(inFlightDir, `cmd-${i}.json`));
      }
    });
  });

  describe("runDoctorFsChecks", () => {
    test("returns array of check results", () => {
      const paths: DoctorPaths = {
        ptDevDir: testDir,
        logsDir: testDir,
        historyDir: testDir,
        resultsDir: testDir,
      };

      const results = runDoctorFsChecks(paths, false);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => "name" in r && "ok" in r && "severity" in r)).toBe(true);
    });
  });

  describe("runAllDoctorChecks", () => {
    test("returns array of results including controller health checks", async () => {
      const paths: DoctorPaths = {
        ptDevDir: testDir,
        logsDir: testDir,
        historyDir: testDir,
        resultsDir: testDir,
      };

      const mockController = {
        getHeartbeat: () => ({ ts: Date.now() }),
        getHeartbeatHealth: () => ({ state: "ok" as const, ageMs: 100 }),
        getSystemContext: () => ({
          bridgeReady: true,
          topologyMaterialized: true,
          deviceCount: 5,
          linkCount: 4,
          heartbeat: { state: "ok" as const },
          warnings: [],
        }),
      };

      const results = await runAllDoctorChecks(mockController, paths, false);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(6); // fs checks + health checks
    });

    test("handles controller errors gracefully", async () => {
      const paths: DoctorPaths = {
        ptDevDir: testDir,
        logsDir: testDir,
        historyDir: testDir,
        resultsDir: testDir,
      };

      const failingController = {
        getHeartbeat: () => {
          throw new Error("Connection failed");
        },
        getHeartbeatHealth: () => ({ state: "unknown" as const }),
        getSystemContext: () => ({
          bridgeReady: false,
          topologyMaterialized: false,
          deviceCount: 0,
          linkCount: 0,
          heartbeat: { state: "unknown" as const },
          warnings: ["Connection failed"],
        }),
      };

      const results = await runAllDoctorChecks(failingController, paths, false);
      expect(Array.isArray(results)).toBe(true);
      // Should still have fs checks + bridge-connect error
      const bridgeConnectCheck = results.find((r) => r.name === "bridge-connect");
      expect(bridgeConnectCheck).toBeDefined();
      expect(bridgeConnectCheck!.ok).toBe(false);
    });
  });
});