import { describe, expect, test } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { runPtCli } from "./run-pt-cli.js";

function createTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe("runPtCli", () => {
  test("ejecuta un script directo sin shell y devuelve JSON", async () => {
    const tempDir = createTempDir("pt-mcp-runner-");
    const scriptPath = join(tempDir, "echo-argv.ts");

    await Bun.write(
      scriptPath,
      `const stdin = await new Response(Bun.stdin).text();
const argv = process.argv.slice(2);
process.stdout.write(JSON.stringify({ argv, stdin, env: process.env.PT_MCP }));
`,
    );

    try {
      const result = await runPtCli({
        repoRoot: tempDir,
        cliEntrypoint: scriptPath,
        argv: ["alpha", "two words"],
        stdin: "payload",
        parseJson: true,
      });

      expect(result.ok).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.error).toBeUndefined();
      expect(result.json).toEqual({
        argv: ["alpha", "two words"],
        stdin: "payload",
        env: "1",
      });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
