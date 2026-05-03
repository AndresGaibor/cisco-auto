import { describe, expect, test } from "bun:test";
import { __test__ } from "./wlc-setup.js";

describe("wlc-setup", () => {
  test("usa Bun.spawnSync con argumentos sin shell", () => {
    const originalSpawnSync = Bun.spawnSync;
    const llamadas: Array<{ cmd: string[]; cwd?: string }> = [];

    try {
      (Bun as unknown as { spawnSync: typeof Bun.spawnSync }).spawnSync = ((options: { cmd: string[]; cwd?: string; stdout?: string; stderr?: string }) => {
        llamadas.push({ cmd: options.cmd, cwd: options.cwd });

        return {
          success: true,
          stdout: Buffer.from("ok"),
          stderr: Buffer.from(""),
          exitCode: 0,
        } as ReturnType<typeof Bun.spawnSync>;
      }) as typeof Bun.spawnSync;

      const output = __test__.runPtOmniRaw("(function(){ return 'x'; })();");

      expect(output).toBe("ok");
      expect(llamadas).toHaveLength(1);
      expect(llamadas[0]?.cmd).toEqual(["bun", "run", "pt", "omni", "raw", "(function(){ return 'x'; })();"]);
      expect(llamadas[0]?.cwd).toContain("cisco-auto");
    } finally {
      (Bun as unknown as { spawnSync: typeof Bun.spawnSync }).spawnSync = originalSpawnSync;
    }
  });
});
