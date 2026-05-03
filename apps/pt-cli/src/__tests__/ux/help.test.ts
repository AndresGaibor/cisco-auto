#!/usr/bin/env bun
import { describe, expect, test } from "bun:test";
import { PUBLIC_COMMAND_DEFINITIONS } from "../../commands/command-registry.js";
import { renderRootHelp } from "../../cli/help-renderer.js";

function stripAnsi(value: string): string {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

describe("help UX", () => {
  test("root help teaches mental rules", () => {
    const cleanHelp = stripAnsi(renderRootHelp(PUBLIC_COMMAND_DEFINITIONS));

    expect(cleanHelp).toContain("pt cmd");
    expect(cleanHelp).toContain("pt device");
    expect(cleanHelp).toContain("pt link");
    expect(cleanHelp).toContain("pt verify");
    expect(cleanHelp).toContain("pt doctor");
    expect(cleanHelp).toContain("omni (omniscience)");
    expect(cleanHelp).toContain("runtime");
    expect(cleanHelp).toContain("build");
    expect(cleanHelp).toContain("logs");
    expect(cleanHelp).toContain("completion");
    expect(cleanHelp).toContain("set");
  });
});