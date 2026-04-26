import { describe, expect, it } from "bun:test";
import {
  checkPtDevDirectory,
  checkLogDirectory,
  checkHistoryDirectory,
  checkResultsDirectory,
  checkRuntimeFiles,
  checkBridgeQueues,
  runDoctorFsChecks,
  runAllDoctorChecks,
} from "./doctor-use-cases";
import type { DoctorPaths } from "./doctor-types";

describe("doctor-use-cases", () => {
  it("exporta checkPtDevDirectory como función", () => {
    expect(typeof checkPtDevDirectory).toBe("function");
  });

  it("exporta checkLogDirectory como función", () => {
    expect(typeof checkLogDirectory).toBe("function");
  });

  it("exporta checkHistoryDirectory como función", () => {
    expect(typeof checkHistoryDirectory).toBe("function");
  });

  it("exporta checkResultsDirectory como función", () => {
    expect(typeof checkResultsDirectory).toBe("function");
  });

  it("exporta checkRuntimeFiles como función", () => {
    expect(typeof checkRuntimeFiles).toBe("function");
  });

  it("exporta checkBridgeQueues como función", () => {
    expect(typeof checkBridgeQueues).toBe("function");
  });

  it("exporta runDoctorFsChecks como función", () => {
    expect(typeof runDoctorFsChecks).toBe("function");
  });

  it("exporta runAllDoctorChecks como función async", () => {
    expect(typeof runAllDoctorChecks).toBe("function");
  });

  it("runDoctorFsChecks retorna array de DoctorCheckResult", () => {
    const paths: DoctorPaths = {
      ptDevDir: "/tmp/nonexistent-pt-dev",
      logsDir: "/tmp/nonexistent-logs",
      historyDir: "/tmp/nonexistent-history",
      resultsDir: "/tmp/nonexistent-results",
    };
    const results = runDoctorFsChecks(paths, false);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("checkPtDevDirectory retorna estructura de resultado conocida", () => {
    const result = checkPtDevDirectory("/tmp/nonexistent-pt-dev", false);
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("severity");
    expect(result).toHaveProperty("message");
  });
});
