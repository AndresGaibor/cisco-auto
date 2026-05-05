import { describe, expect, test } from "bun:test";

import { createMcpCommand } from "./index.js";

describe("createMcpCommand", () => {
  test("expone el comando mcp con funnel habilitado por defecto", () => {
    const command = createMcpCommand({
      repoRoot: "/repo",
      cliEntrypoint: "/repo/apps/pt-cli/src/index.ts",
      commandCatalog: [],
    });

    expect(command.name()).toBe("mcp");
    expect(command.description()).toContain("MCP");

    const options = command.options.map((option) => option.long);
    expect(options).toContain("--no-funnel");
    expect(options).toContain("--live");
    expect(options).toContain("--port");
    expect(options).toContain("--path");
  });
});
