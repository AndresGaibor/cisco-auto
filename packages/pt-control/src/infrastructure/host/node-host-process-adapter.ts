import { spawn } from "node:child_process";
import type { HostProcessPort, SpawnResult } from "../../application/ports/host-process.port.js";

export class NodeHostProcessAdapter implements HostProcessPort {
  platform(): NodeJS.Platform {
    return process.platform;
  }

  async spawn(command: string, argv: string[], options?: { timeoutMs?: number }): Promise<SpawnResult> {
    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      let timer: ReturnType<typeof setTimeout> | undefined;

      const child = spawn(command, argv, { stdio: ["ignore", "pipe", "pipe"] });

      if (options?.timeoutMs) {
        timer = setTimeout(() => {
          child.kill("SIGKILL");
        }, options.timeoutMs);
      }

      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on("close", (code) => {
        if (timer) clearTimeout(timer);
        resolve({ ok: code === 0, stdout, stderr, exitCode: code });
      });

      child.on("error", (err) => {
        if (timer) clearTimeout(timer);
        resolve({ ok: false, stdout, stderr, exitCode: null });
      });
    });
  }
}