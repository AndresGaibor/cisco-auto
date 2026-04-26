import { test, expect, describe } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Architecture test: config-ios CLI delegates to pt-control.
 *
 * Validates Phase 16.2 refactoring:
 * - Business logic lives in pt-control/application/config-ios
 * - CLI imports from pt-control, not duplicating logic
 * - Pure functions (buildVerificationPlan, detectCommandType) are in pt-control
 */

describe("config-ios thin CLI architecture", () => {
  const CLI_CONFIG_IOS_PATH = join(
    process.cwd(),
    "apps/pt-cli/src/commands/config-ios.ts",
  );

  const PT_CONTROL_CONFIG_IOS_PATH = join(
    process.cwd(),
    "packages/pt-control/src/application/config-ios/index.ts",
  );

  test("CLI imports applyConfigIOS from pt-control", () => {
    const content = readFileSync(CLI_CONFIG_IOS_PATH, "utf-8");
    expect(content).toContain("applyConfigIOS");
    expect(content).toContain("@cisco-auto/pt-control/application/config-ios");
  });

  test("CLI does NOT contain buildVerificationPlan implementation", () => {
    const content = readFileSync(CLI_CONFIG_IOS_PATH, "utf-8");
    // The pure function should be in pt-control, not in CLI
    expect(content).not.toContain("function buildVerificationPlan");
    expect(content).not.toContain("const plans: Array<{");
  });

  test("CLI does NOT contain detectCommandType implementation", () => {
    const content = readFileSync(CLI_CONFIG_IOS_PATH, "utf-8");
    // The pure function should be in pt-control, not in CLI
    expect(content).not.toContain("function detectCommandType");
    expect(content).not.toContain("const types: string[] = []");
  });

  test("pt-control exports buildVerificationPlan and detectCommandType", () => {
    const content = readFileSync(PT_CONTROL_CONFIG_IOS_PATH, "utf-8");
    expect(content).toContain("buildVerificationPlan");
    expect(content).toContain("detectCommandType");
  });

  test("CLI keeps CONFIG_IOS_META for command metadata", () => {
    const content = readFileSync(CLI_CONFIG_IOS_PATH, "utf-8");
    expect(content).toContain("CONFIG_IOS_META");
    expect(content).toContain('"config-ios"');
  });

  test("CLI does NOT re-implement verification logic", () => {
    const content = readFileSync(CLI_CONFIG_IOS_PATH, "utf-8");
    // Should not have the old verification loop with step.assert
    expect(content).not.toContain("verificationPlan.push");
    expect(content).not.toContain("step.assert(");
    expect(content).not.toContain("verificationChecks.push");
  });

  test("CLI delegates to use case via applyConfigIOS", () => {
    const content = readFileSync(CLI_CONFIG_IOS_PATH, "utf-8");
    // The key indicator that we're using the use case
    expect(content).toContain("applyConfigIOS(");
    expect(content).toContain("useCaseResult");
  });

  test("CLI shows verification result when available", () => {
    const content = readFileSync(CLI_CONFIG_IOS_PATH, "utf-8");
    // Render verification status
    expect(content).toContain("result.verification");
    expect(content).toContain("verified");
    expect(content).toContain("partiallyVerified");
  });

  test("pt-control config-ios module has use cases", () => {
    const content = readFileSync(PT_CONTROL_CONFIG_IOS_PATH, "utf-8");
    expect(content).toContain("applyConfigIOS");
    expect(content).toContain("verifyConfigIOS");
  });
});