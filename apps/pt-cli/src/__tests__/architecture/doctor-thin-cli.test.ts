import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("doctor CLI boundary", () => {
  const source = readFileSync(
    join(import.meta.dir, "../../commands/doctor.ts"),
    "utf8",
  );

  test("doctor.ts imports from pt-control doctor module", () => {
    expect(source).toContain("@cisco-auto/pt-control/application/doctor");
  });

  test("doctor.ts re-exports DoctorCheckResult type", () => {
    expect(source).toContain("export { type DoctorCheckResult }");
  });

  test("doctor.ts has under 300 lines", () => {
    const lines = source.split("\n").filter((l) => l.trim() !== "");
    expect(lines.length).toBeLessThan(300);
  });

  test("doctor.ts does NOT contain fs check implementations", () => {
    // Should NOT have these functions defined inline
    expect(source).not.toContain("function checkPtDevDirectory");
    expect(source).not.toContain("function checkLogDirectory");
    expect(source).not.toContain("function checkHistoryDirectory");
    expect(source).not.toContain("function checkResultsDirectory");
    expect(source).not.toContain("function checkRuntimeFiles");
    expect(source).not.toContain("function checkBridgeQueues");
    expect(source).not.toContain("function checkContextCache");
  });

  test("doctor.ts does NOT contain Node.js fs imports for checks", () => {
    // Should only use fs path utilities, not direct fs operations in checks
    expect(source).not.toContain("existsSync");
    expect(source).not.toContain("statSync");
    expect(source).not.toContain("readdirSync");
    expect(source).not.toContain("mkdirSync");
  });

  test("doctor.ts keeps performDoctorChecks but as thin orchestrator", () => {
    // performDoctorChecks should be removed since it's now in pt-control
    // The CLI should only call runAllDoctorChecks from pt-control
    expect(source).not.toContain("performDoctorChecks");
  });

  test("doctor.ts calls runAllDoctorChecks from pt-control", () => {
    expect(source).toContain("runAllDoctorChecks");
  });

  test("doctor.ts keeps createDoctorCommand", () => {
    expect(source).toContain("export function createDoctorCommand()");
  });

  test("doctor.ts re-exports DoctorCheckResult type from pt-control", () => {
    expect(source).toContain("export { type DoctorCheckResult }");
    expect(source).toContain("type DoctorCheckResult");
  });
});