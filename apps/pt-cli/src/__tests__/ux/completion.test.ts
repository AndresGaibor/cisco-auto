#!/usr/bin/env bun
import { describe, expect, test } from "bun:test";
import { PUBLIC_COMMAND_DEFINITIONS } from "../../commands/command-registry.js";

describe("completion registry", () => {
  test("completion solo usa comandos visibles", () => {
    const visible = PUBLIC_COMMAND_DEFINITIONS
      .filter((cmd) => !cmd.hidden && !cmd.legacy)
      .map((cmd) => cmd.name)
      .sort();

    expect(visible).toEqual([
      "agent",
      "app",
      "bench",
      "bridge",
      "build",
      "cmd",
      "collab",
      "completion",
      "device",
      "doctor",
      "e2e",
      "inspect",
      "link",
      "logs",
      "mcp",
      "omni",
      "project",
      "runtime",
      "save",
      "set",
      "verify",
    ]);
  });
});