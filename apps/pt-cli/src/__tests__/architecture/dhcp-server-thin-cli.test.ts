import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("dhcp-server CLI boundary", () => {
  test("dhcp-server command delegates business logic to pt-control application/dhcp-server", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../commands/dhcp-server.ts"),
      "utf8",
    );

    expect(source).toContain("@cisco-auto/pt-control/application/dhcp-server");
    expect(source).toContain("applyDhcpServerConfig");
    expect(source).toContain("inspectDhcpServer");
    expect(source).toContain("parsePool");
    expect(source).toContain("type DhcpPoolConfig");
    expect(source).toContain("type DhcpServerApplyResult");
    expect(source).toContain("type DhcpServerInspectResult");

    expect(source).not.toMatch(/\binterface\s+DhcpServerConfig\b/);
    expect(source).not.toMatch(/\btype\s+DhcpServerUseCaseResult\b/);
    expect(source).not.toMatch(/\binterface\s+DhcpServerInspectRaw\b/);
    expect(source).not.toMatch(/\binterface\s+DhcpServerPort\b/);

    expect(source).not.toContain("ctx.controller.start()");
    expect(source).not.toContain("ctx.controller.stop()");

    expect(source).not.toMatch(/function parsePool\s*\(/);
  });
});