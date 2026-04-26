import { describe, expect, test } from "bun:test";
import { evaluateOmniRawPolicy } from "../../commands/omni/policy.js";

describe("omni raw policy", () => {
  test("permite inspección simple", () => {
    const verdict = evaluateOmniRawPolicy("n.getDeviceCount()", "strict");
    expect(verdict.ok).toBe(true);
  });

  test("bloquea privileged en strict", () => {
    const verdict = evaluateOmniRawPolicy("privileged.getFileContents('/etc/hosts')", "strict");
    expect(verdict.ok).toBe(false);
    expect(verdict.requiresUnsafe).toBe(true);
    expect(verdict.blockedPatterns).toContain("privileged");
  });

  test("warn no bloquea pero avisa", () => {
    const verdict = evaluateOmniRawPolicy("privileged.getFileContents('/etc/hosts')", "warn");
    expect(verdict.ok).toBe(true);
    expect(verdict.warnings.length).toBeGreaterThan(0);
  });

  test("off no bloquea ni avisa", () => {
    const verdict = evaluateOmniRawPolicy("privileged.getFileContents('/etc/hosts')", "off");
    expect(verdict.ok).toBe(true);
  });

  test("detecta getFileContents", () => {
    const verdict = evaluateOmniRawPolicy("getFileContents('/path')", "strict");
    expect(verdict.ok).toBe(false);
    expect(verdict.blockedPatterns).toContain("getFileContents");
  });

  test("detecta writeFile", () => {
    const verdict = evaluateOmniRawPolicy("writeFile('/path', 'data')", "strict");
    expect(verdict.ok).toBe(false);
    expect(verdict.blockedPatterns).toContain("file write/save");
  });

  test("detecta AssessmentModel", () => {
    const verdict = evaluateOmniRawPolicy("AssessmentModel.getRunningConfig()", "strict");
    expect(verdict.ok).toBe(true);
    expect(verdict.warnings.some(w => w.includes("AssessmentModel"))).toBe(true);
  });
});
