import { describe, expect, test } from "bun:test";
import { getAllRuntimeFiles } from "../runtime-manifest.js";

describe("runtime manifest", () => {
  test("no incluye el motor terminal de main.js", () => {
    const files = getAllRuntimeFiles();

    expect(files).not.toContain("terminal/engine/command-executor.ts");
    expect(files).not.toContain("terminal/engine/command-state-machine.ts");
    expect(files).not.toContain("terminal/terminal-utils.ts");
  });
});
