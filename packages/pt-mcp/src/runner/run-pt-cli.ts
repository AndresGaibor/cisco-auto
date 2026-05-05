import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import type { RunPtCliInput, RunPtCliResult } from "../types.js";
import { parseCliOutput } from "./parse-cli-output.js";

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_STDOUT_BYTES = 512 * 1024;
const MAX_STDERR_BYTES = 128 * 1024;
const DEFAULT_PREVIEW_BYTES = 12_000;

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
  const outputMode = input.outputMode ?? "buffer";
  const previewBytes = input.previewBytes ?? DEFAULT_PREVIEW_BYTES;
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
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let timedOut = false;
  let stdoutPath: string | undefined;
  let stderrPath: string | undefined;
  let jsonPath: string | undefined;
  let spoolDir = input.spoolDir;

  const captureSpool = outputMode === "spool";
  let stdoutStream: ReturnType<typeof createWriteStream> | null = null;
  let stderrStream: ReturnType<typeof createWriteStream> | null = null;

  function closeStream(stream: ReturnType<typeof createWriteStream> | null): Promise<void> {
    if (!stream) return Promise.resolve();
    return new Promise((resolve) => {
      stream.end(() => resolve());
    });
  }

  if (captureSpool) {
    spoolDir = spoolDir ?? join(input.repoRoot, "mcp-spool");
    await mkdir(spoolDir, { recursive: true });
    stdoutPath = join(spoolDir, "stdout.txt");
    stderrPath = join(spoolDir, "stderr.txt");
    jsonPath = join(spoolDir, "json.txt");
    stdoutStream = createWriteStream(stdoutPath);
    stderrStream = createWriteStream(stderrPath);
  }

  child.stdout.on("data", (chunk) => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    stdoutBytes += buffer.length;

    if (captureSpool) {
      stdoutStream?.write(buffer);
      if (stdout.length < previewBytes) {
        stdout += buffer.toString("utf8");
        if (stdout.length > previewBytes) stdout = stdout.slice(0, previewBytes);
      }
      return;
    }

    stdout += buffer.toString("utf8");
  });

  child.stderr.on("data", (chunk) => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    stderrBytes += buffer.length;

    if (captureSpool) {
      stderrStream?.write(buffer);
      if (stderr.length < previewBytes) {
        stderr += buffer.toString("utf8");
        if (stderr.length > previewBytes) stderr = stderr.slice(0, previewBytes);
      }
      return;
    }

    stderr += buffer.toString("utf8");
  });

  const completion = new Promise<RunPtCliResult>((resolve) => {
    const finish = async (exitCode: number | null, signal: NodeJS.Signals | null): Promise<void> => {
      await Promise.all([closeStream(stdoutStream), closeStream(stderrStream)]);

      const stdoutPreview = captureSpool ? stdout : truncate(stdout, MAX_STDOUT_BYTES).value;
      const stderrPreview = captureSpool ? stderr : truncate(stderr, MAX_STDERR_BYTES).value;
      const stdoutTruncated = captureSpool ? stdoutBytes > previewBytes : truncate(stdout, MAX_STDOUT_BYTES).truncated;
      const stderrTruncated = captureSpool ? stderrBytes > previewBytes : truncate(stderr, MAX_STDERR_BYTES).truncated;
      const parsed = parseCliOutput(stdoutPreview, stderrPreview, Boolean(input.parseJson) && !stdoutTruncated && !stderrTruncated);

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
          stdout: stdoutTruncated,
          stderr: stderrTruncated,
        },
        stdoutBytes,
        stderrBytes,
        stdoutPath,
        stderrPath,
        jsonPath: captureSpool && parsed.json != null ? jsonPath : undefined,
        jsonParsed: Boolean(input.parseJson) && parsed.json != null,
        spoolDir,
        error: exitCode === 0 && !signal && !timedOut ? undefined : {
          code: timedOut ? "TIMEOUT" : "CLI_FAILED",
          message: timedOut ? `Timeout de ${timeoutMs}ms superado` : `CLI terminó con código ${exitCode ?? "signal"}`,
        },
      });
    };

    child.on("error", (error) => {
      void closeStream(stdoutStream);
      void closeStream(stderrStream);

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
        stdoutBytes,
        stderrBytes,
        stdoutPath,
        stderrPath,
        jsonPath,
        jsonParsed: false,
        spoolDir,
        error: {
          code: "SPAWN_FAILED",
          message: error instanceof Error ? error.message : String(error),
        },
      });
    });

    child.on("close", (exitCode, signal) => {
      void finish(exitCode, signal);
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
