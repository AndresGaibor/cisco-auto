import { Command } from "commander";
import { runSubprocess } from "../system/run-subprocess.js";
import { ExitCodes } from "../errors/index.js";
import { getGlobalFlags } from "../flags.js";
import { buildFlags } from "../flags-utils.js";
import { resolveTimeout } from "../utils/timeout.js";

export function createBuildCommand(): Command {
  return new Command("build")
    .description("Build y deploy de archivos a ~/pt-dev/")
    .action(async function () {
      const { resolve } = await import("path");

      console.log("🔨 Build y deploy de PT Runtime...\n");

      const rootDir = resolve(import.meta.dirname, "../../../../");

      const parent = this.parent as Command;
      const globalFlags = parent
        ? getGlobalFlags(parent)
        : buildFlags({ verify: true });
      const timeoutMs = resolveTimeout(undefined, globalFlags);

      const result = await runSubprocess({
        cmd: ["bun", "run", "--cwd", "packages/pt-control", "scripts/build.ts"],
        cwd: rootDir,
        timeoutMs,
      });

      // Forward output to maintain same behavior as stdio: 'inherit'
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);

      if (result.timedOut) {
        console.log("\n⏰ Build timeout exceeded");
        process.exit(ExitCodes.TIMEOUT);
      }

      if (!result.success) {
        console.log("\n❌ Build failed");
        process.exit(ExitCodes.ERROR);
      }
    });
}
