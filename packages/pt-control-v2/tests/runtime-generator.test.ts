import { describe, expect, it } from "bun:test";
import { renderMainSource } from "../src/runtime-generator/index.js";

describe("RuntimeGenerator helpers", () => {
  it("injects the DEV_DIR literal and escapes characters", () => {
    const devDir = '/tmp/pt "control"';
    const literal = JSON.stringify(devDir);
    const source = renderMainSource(devDir);
    expect(source).toContain(`var DEV_DIR = ${literal};`);
    expect(source).toContain("PT Control V2 - Main Script Module");
  });
});
