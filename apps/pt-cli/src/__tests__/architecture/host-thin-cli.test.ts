import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("host CLI boundary", () => {
  test("host command delegates business logic to pt-control application/host", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../commands/host.ts"),
      "utf8",
    );

    expect(source.startsWith("#!/usr/bin/env bun")).toBe(true);
    expect(source).toContain("@cisco-auto/pt-control/application/host");
    expect(source).toContain("executeHostConfig");
    expect(source).toContain("executeHostInspect");
    expect(source).toContain("executeHostHistory");
    expect(source).toContain("executeHostCommand");

    expect(source).not.toContain("type { PTController }");
    expect(source).not.toContain("createTerminalCommandServiceForCli");
    expect(source).not.toContain("runtimeTerminal: null as any");
    expect(source).not.toContain("normalizeDeviceType");
    expect(source).not.toContain("DEVICE_TYPE_MAP");
    expect(source).not.toContain("#!/usr/bin/bin bun");
  });
});