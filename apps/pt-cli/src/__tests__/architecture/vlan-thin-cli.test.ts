import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("vlan CLI boundary", () => {
  test("vlan command delegates business logic to pt-control application/vlan", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../commands/vlan.ts"),
      "utf8",
    );

    expect(source).toContain("@cisco-auto/pt-control/application/vlan");
    expect(source).toContain("buildVlanCreateCommands");
    expect(source).toContain("buildVlanApplyCommands");
    expect(source).toContain("buildVlanTrunkCommands");

    expect(source).not.toContain("resolveCapabilitySet");
    expect(source).not.toContain("planConfigureVlan");
    expect(source).not.toContain("planConfigureTrunkPort");
    expect(source).not.toContain("parseInterfaceName");
    expect(source).not.toContain("parseStrictVlanId");
    expect(source).not.toContain("fetchDeviceList");
    expect(source).not.toContain("getIOSCapableDevices");
    expect(source).not.toContain("ctx.controller.start()");
    expect(source).not.toContain("ctx.controller.stop()");
  });
});