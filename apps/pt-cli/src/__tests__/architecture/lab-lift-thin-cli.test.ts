import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("lab lift CLI boundary", () => {
  test("lab lift command delegates business logic to pt-control", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../commands/lab/lift.ts"),
      "utf8",
    );

    expect(source).toContain("executeCore3650LiftLab");
    expect(source).toContain("@cisco-auto/pt-control/application/lab");

    expect(source).not.toContain("function buildCoreCommands");
    expect(source).not.toContain("function buildAccessSwitchCommands");
    expect(source).not.toContain("function summarizeChecks");
    expect(source).not.toContain("const SERVER_IP");
    expect(source).not.toContain("const VLAN_USERS");
    expect(source).not.toContain("async function waitForTopologyMaterialization");
  });
});
