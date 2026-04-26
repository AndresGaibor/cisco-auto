import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("routing CLI boundary", () => {
  const source = readFileSync(
    join(import.meta.dir, "../../commands/routing.ts"),
    "utf8",
  );

  test("routing.ts imports IOS builders from pt-control application/routing", () => {
    expect(source).toContain("@cisco-auto/pt-control/application/routing");
    expect(source).toContain("executeStaticRoute");
    expect(source).toContain("executeOspfEnable");
    expect(source).toContain("executeOspfAddNetwork");
    expect(source).toContain("executeEigrpEnable");
    expect(source).toContain("executeBgpEnable");
  });

  test("routing.ts does NOT contain inline IOS builder functions", () => {
    // Pure builder functions should NOT be inline
    expect(source).not.toContain("function buildStaticRouteCommands");
    expect(source).not.toContain("function buildOspfEnableCommands");
    expect(source).not.toContain("function buildOspfAddNetworkCommands");
    expect(source).not.toContain("function buildEigrpEnableCommands");
    expect(source).not.toContain("function buildBgpEnableCommands");
    expect(source).not.toContain("function cidrToSubnetMask");
    expect(source).not.toContain("function validarIPv4");
    expect(source).not.toContain("function validarCIDR");
    expect(source).not.toContain("function parseEnteroObligatorio");
    expect(source).not.toContain("function parseCidrToNetworkWildcard");
  });

  test("routing.ts has under 300 lines", () => {
    const lines = source.split("\n").filter((l) => l.trim() !== "");
    expect(lines.length).toBeLessThan(300);
  });

  test("routing.ts imports from @cisco-auto/kernel/plugins/routing for generateRoutingCommands", () => {
    // The thin CLI should NOT import generateRoutingCommands directly
    // It should use the use cases instead
    expect(source).not.toContain("from '@cisco-auto/kernel/plugins/routing'");
  });

  test("routing.ts keeps ROUTING_META", () => {
    expect(source).toContain("ROUTING_META");
    expect(source).toContain("id: 'routing'");
  });

  test("routing.ts calls pt-control use cases in execute callbacks", () => {
    expect(source).toContain("executeStaticRoute(");
    expect(source).toContain("executeOspfEnable(");
    expect(source).toContain("executeOspfAddNetwork(");
    expect(source).toContain("executeEigrpEnable(");
    expect(source).toContain("executeBgpEnable(");
  });
});
