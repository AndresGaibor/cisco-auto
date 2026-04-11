#!/usr/bin/env bun
/**
 * Abstracción única para ejecutar subprocesos con captura explícita de salida,
 * timeout y aborto.
 */

import { logSubprocessEvent, createSubprocessLogEvent } from './subprocess-logger';

export interface RunSubprocessOptions {
  cmd: string[];
  cwd?: string;
  env?: Record<string, string | undefined>;
  timeoutMs?: number | null;
  signal?: AbortSignal;
}

export interface RunSubprocessResult {
  ok: boolean;
  success: boolean;
  timedOut: boolean;
  exitCode: number | null;
  signalCode: string | null;
  stdout: string;
  stderr: string;
  errorKind?: 'spawn' | 'timeout' | 'abort' | 'exit';
  errorMessage?: string;
  error?: Error;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_KILL_SIGNAL = 'SIGKILL';

async function readStreamText(stream: ReadableStream<Uint8Array<ArrayBuffer>> | null | undefined): Promise<string> {
  if (!stream) {
    return '';
  }

  return new Response(stream).text();
}

function normalizeCmd(cmd: string[]): string[] {
  return cmd.map((part) => String(part));
}

export async function runSubprocess(options: RunSubprocessOptions): Promise<RunSubprocessResult> {
  if (!Array.isArray(options.cmd) || options.cmd.length === 0) {
    return {
      ok: false,
      success: false,
      timedOut: false,
      exitCode: null,
      signalCode: null,
      stdout: '',
      stderr: '',
      errorKind: 'spawn',
      errorMessage: 'El comando está vacío.',
    };
  }

  if (options.signal?.aborted) {
    return {
      ok: false,
      success: false,
      timedOut: false,
      exitCode: null,
      signalCode: null,
      stdout: '',
      stderr: '',
      errorKind: 'abort',
      errorMessage: 'El AbortSignal ya estaba abortado.',
    };
  }

  const timeoutMs = options.timeoutMs === null ? null : (options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let proc: Bun.Subprocess | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;
  let aborted = false;

  const onAbort = () => {
    aborted = true;
    try {
      proc?.kill(DEFAULT_KILL_SIGNAL);
    } catch {
      // El proceso puede haber terminado antes de que llegara la señal.
    }
  };

  if (options.signal) {
    options.signal.addEventListener('abort', onAbort, { once: true });
  }

  try {
    proc = Bun.spawn({
      cmd: normalizeCmd(options.cmd),
      cwd: options.cwd,
      env: options.env,
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    if (timeoutMs !== null) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        try {
          proc?.kill(DEFAULT_KILL_SIGNAL);
        } catch {
          // El proceso puede haber salido por su cuenta antes de recibir la señal.
        }
      }, timeoutMs);
    }

    const stdoutPromise = readStreamText(proc.stdout as ReadableStream<Uint8Array<ArrayBuffer>> | null | undefined);
    const stderrPromise = readStreamText(proc.stderr as ReadableStream<Uint8Array<ArrayBuffer>> | null | undefined);
    const exitPromise = proc.exited;

    const [exitCode, stdout, stderr] = await Promise.all([exitPromise, stdoutPromise, stderrPromise]);

     const signalCode = proc.signalCode ?? null;
     const ok = !timedOut && !aborted && exitCode === 0;

      const logEvent = createSubprocessLogEvent(
        options.cmd,
        { cwd: options.cwd ?? undefined, timeoutMs: options.timeoutMs },
        { ok, success: ok, timedOut, exitCode: proc.exitCode ?? exitCode, signalCode, stdout, stderr, errorKind: ok ? undefined : timedOut ? 'timeout' : aborted ? 'abort' : 'exit', errorMessage: ok ? undefined : timedOut ? `El proceso superó el timeout de ${timeoutMs} ms.` : aborted ? 'El proceso fue abortado por AbortSignal.' : `El proceso terminó con código ${String(exitCode)}.` }
      );
      logSubprocessEvent(logEvent);

     return {
       ok,
       success: ok,
       timedOut,
       exitCode: proc.exitCode ?? exitCode,
       signalCode,
       stdout,
       stderr,
       errorKind: ok ? undefined : timedOut ? 'timeout' : aborted ? 'abort' : 'exit',
       errorMessage: ok
         ? undefined
         : timedOut
           ? `El proceso superó el timeout de ${timeoutMs} ms.`
           : aborted
             ? 'El proceso fue abortado por AbortSignal.'
             : `El proceso terminó con código ${String(exitCode)}.`,
     };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      success: false,
      timedOut,
      exitCode: proc?.exitCode ?? null,
      signalCode: proc?.signalCode ?? null,
      stdout: '',
      stderr: '',
      errorKind: aborted ? 'abort' : timedOut ? 'timeout' : 'spawn',
      errorMessage: message,
      error: error instanceof Error ? error : new Error(message),
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (options.signal) {
      options.signal.removeEventListener('abort', onAbort);
    }
  }
}
