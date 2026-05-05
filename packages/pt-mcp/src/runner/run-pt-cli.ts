import { spawn } from "node:child_process";

import type { RunPtCliInput, RunPtCliResult } from "../types.js";
import { parseCliOutput } from "./parse-cli-output.js";

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_STDOUT_BYTES = 512 * 1024;
const MAX_STDERR_BYTES = 128 * 1024;

function truncate(text: string, maxBytes: number): { value: string; truncated: boolean } {
  const bytes = new TextEncoder().encode(text);

  if (bytes.length <= maxBytes) {
    return { value: text, truncated: false };
  }

  return { value: new TextDecoder().decode(bytes.slice(0, maxBytes)), truncated: true };
}

export async function runPtCli(input: RunPtCliInput): Promise<RunPtCliResult> {
  const argv = input.argv.slice();
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const startedAt = Date.now();

  if (argv[0] === "mcp") {
    return {
      ok: false,
      exitCode: null,
      signal: null,
      argv,
      durationMs: 0,
      stdout: "",
      stderr: "",
      json: null,
      truncated: { stdout: false, stderr: false },
      error: {
        code: "NESTED_MCP_NOT_SUPPORTED",
        message: "No se permite ejecutar pt mcp desde el propio servidor MCP.",
      },
    };
  }

  const child = spawn("bun", ["run", input.cliEntrypoint, ...argv], {
    cwd: input.repoRoot,
    env: {
      ...process.env,
      PT_MCP: "1",
      NO_COLOR: "1",
      PT_CLI_TIMING: "0",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  let timedOut = false;

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const completion = new Promise<RunPtCliResult>((resolve) => {
    const finish = (exitCode: number | null, signal: NodeJS.Signals | null): void => {
      const truncatedStdout = truncate(stdout, MAX_STDOUT_BYTES);
      const truncatedStderr = truncate(stderr, MAX_STDERR_BYTES);
      const parsed = parseCliOutput(truncatedStdout.value, truncatedStderr.value, Boolean(input.parseJson));

      resolve({
        ok: exitCode === 0 && !signal && !timedOut,
        exitCode,
        signal,
        argv,
        durationMs: Date.now() - startedAt,
        stdout: parsed.stdout,
        stderr: parsed.stderr,
        json: parsed.json,
        truncated: {
          stdout: truncatedStdout.truncated,
          stderr: truncatedStderr.truncated,
        },
        error: exitCode === 0 && !signal && !timedOut ? undefined : {
          code: timedOut ? "TIMEOUT" : "CLI_FAILED",
          message: timedOut ? `Timeout de ${timeoutMs}ms superado` : `CLI terminó con código ${exitCode ?? "signal"}`,
        },
      });
    };

    child.on("error", (error) => {
      resolve({
        ok: false,
        exitCode: null,
        signal: null,
        argv,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
        json: null,
        truncated: { stdout: false, stderr: false },
        error: {
          code: "SPAWN_FAILED",
          message: error instanceof Error ? error.message : String(error),
        },
      });
    });

    child.on("close", (exitCode, signal) => {
      finish(exitCode, signal);
    });
  });

  if (input.stdin != null) {
    child.stdin.write(input.stdin);
  }
  child.stdin.end();

  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, timeoutMs);

  try {
    return await completion;
  } finally {
    clearTimeout(timeout);
  }
}
