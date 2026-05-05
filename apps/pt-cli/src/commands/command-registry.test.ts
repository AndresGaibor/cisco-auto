import { describe, expect, test } from "bun:test";

import { PUBLIC_COMMAND_DEFINITIONS } from "./command-registry.js";

describe("PUBLIC_COMMAND_DEFINITIONS", () => {
  test("incluye el comando mcp", () => {
    expect(PUBLIC_COMMAND_DEFINITIONS.some((definition) => definition.name === "mcp")).toBe(true);
  });
});
