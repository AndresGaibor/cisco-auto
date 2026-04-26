import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("check CLI boundary", () => {
  test("check command delegates business logic to pt-control application/check", () => {
    const source = readFileSync(join(import.meta.dir, "../../commands/check.ts"), "utf8");

    expect(source).toContain("@cisco-auto/pt-control/application/check");
    expect(source).toContain("validateLanBasic");
    expect(source).toContain("validateGateway");

    // Business logic moved to pt-control
    expect(source).not.toContain("getNetworkAddress(");
    expect(source).not.toContain("subnetMaskToBits(");
    expect(source).not.toContain("async function validateLanBasic");
    expect(source).not.toContain("async function validateGateway");
  });

  test("check.ts keeps CLI rendering (renderCheckResult) in CLI layer", () => {
    const source = readFileSync(join(import.meta.dir, "../../commands/check.ts"), "utf8");

    // renderCheckResult stays in CLI (rendering logic)
    expect(source).toContain("function renderCheckResult");
    expect(source).toContain("chalk.bold");
    expect(source).toContain("chalk.green");
    expect(source).toContain("chalk.red");
  });

  test("check.ts delegates validate to pt-control and uses runCommand pattern", () => {
    const source = readFileSync(join(import.meta.dir, "../../commands/check.ts"), "utf8");

    // start/stop are in execute callback - this is OK for check command since
    // validateLanBasic/validateGateway receive controller and runCommand wraps lifecycle
    expect(source).toContain("ctx.controller.start()");
    expect(source).toContain("ctx.controller.stop()");
    // But the actual validation logic is delegated
    expect(source).toContain("scenarioDef.validate(ctx.controller, scenario, fix)");
  });

  test("check.ts stays under 300 lines", () => {
    const source = readFileSync(join(import.meta.dir, "../../commands/check.ts"), "utf8");
    const lines = source.split("\n").length;

    expect(lines).toBeLessThan(300);
  });
});