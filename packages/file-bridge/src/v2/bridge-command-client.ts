/**
 * Cliente de comandos del FileBridge V2.
 *
 * Encapsula sendCommand y sendCommandAndWait con toda la lógica de:
 * - Validación de input
 * - Backpressure checking
 * - Checksums
 * - Escritura atómica de comandos
 * - Resolución de deferred results
 */

import { readFileSync, readFile } from "node:fs";
import { readFile as readFileAsync } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { ensureDir, atomicWriteFile } from "../shared/fs-atomic.js";
import { BridgePathLayout } from "../shared/path-layout.js";
import { BackpressureManager } from "../backpressure-manager.js";
import type {
  BridgeCommandEnvelope,
  BridgeResultEnvelope,
  BridgeDeferredTimings,
  BridgeResultTimings,
  BridgeTimeoutDetails,
} from "../shared/protocol.js";

const DEBUG = process.env.PT_DEBUG === "1";
const debugLog = (...args: unknown[]) => {
  if (DEBUG) console.log("[bridge:cmd-client]", ...args);
};

export const MAX_PAYLOAD_BYTES = 1024 * 1024;

export interface SendCommandOptions {
  enableBackpressure?: boolean;
  skipQueueIndex?: boolean;
}

export interface DeferredTimingAccumulator {
  enabled: true;
  startedAt: number;
  firstPollAt: number | null;
  lastPollAt: number | null;
  pollCount: number;
  tickets: string[];
  lastTicket: string | null;
}

export interface SendCommandAndWaitOptions {
  resolveDeferred?: boolean;
  deferredTiming?: DeferredTimingAccumulator;
  recommendedPollAfterMs?: number;
}

export class BridgeCommandClient {
  constructor(
    private readonly paths: BridgePathLayout,
    private readonly backpressure: BackpressureManager,
    private readonly options: SendCommandOptions & {
      resultTimeoutMs?: number;
      appendQueueIndex: (filename: string) => void;
      nextSeq: () => number;
      appendEvent: (event: { seq: number; ts: number; type: string; id?: string; commandType?: string; payloadSizeBytes?: number; expiresAt?: number }) => void;
      resultWatcher: { watch(id: string, cb: () => void): void; unwatch(id: string, cb: () => void): void };
      getResultTimeoutMs: () => number;
    },
  ) {}

  /**
   * Valida el payload del comando.
   */
  validateCommandInput(type: string, payload: unknown, expiresAtMs?: number): void {
    if (typeof type !== "string" || type.trim() === "") {
      throw new Error("[bridge] sendCommand: type must be a non-empty string");
    }
    if (payload === null || payload === undefined) {
      throw new Error("[bridge] sendCommand: payload cannot be null or undefined");
    }
    if (typeof payload === "object" && Array.isArray(payload)) {
      throw new Error("[bridge] sendCommand: payload cannot be an array");
    }
    if (typeof payload !== "object") {
      throw new Error("[bridge] sendCommand: payload must be a serializable object");
    }
    if (expiresAtMs !== undefined && (typeof expiresAtMs !== "number" || expiresAtMs <= 0)) {
      throw new Error("[bridge] sendCommand: expiresAtMs must be a positive number");
    }
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > MAX_PAYLOAD_BYTES) {
      throw new Error(`[bridge] sendCommand: payload too large (${payloadSize} bytes, max ${MAX_PAYLOAD_BYTES})`);
    }
  }

  /**
   * Calcula checksum SHA256 de un objeto.
   */
  checksumOf(input: unknown): string {
    return `sha256:${createHash("sha256").update(JSON.stringify(input)).digest("hex")}`;
  }

  /**
   * Envía un comando al bridge (no bloquea esperando resultado).
   */
  sendCommand<TPayload = unknown>(
    type: string,
    payload: TPayload,
    expiresAtMs?: number,
  ): BridgeCommandEnvelope<TPayload> {
    this.validateCommandInput(type, payload, expiresAtMs);

    debugLog(`sendCommand type=${type} expiresAtMs=${String(expiresAtMs ?? "none")}`);

    if (this.options.enableBackpressure ?? true) {
      this.backpressure.checkCapacity();
    }

    const seq = this.options.nextSeq();
    const id = `cmd_${String(seq).padStart(12, "0")}`;

    const payloadWithType = {
      type,
      ...(payload as object),
    } as TPayload;

    const envelope: BridgeCommandEnvelope<TPayload> = {
      protocolVersion: 2,
      id,
      seq,
      createdAt: Date.now(),
      type,
      payload: payloadWithType,
      attempt: 1,
      expiresAt: expiresAtMs,
      checksum: this.checksumOf({ type, payload: payloadWithType }),
    };

    const commandFile = this.paths.commandFilePath(seq, type);
    debugLog(`commandFile=${commandFile}`);

    ensureDir(this.paths.commandsDir());
    atomicWriteFile(commandFile, JSON.stringify(envelope, null, 2));

    if (!this.options.skipQueueIndex) {
      try {
        this.options.appendQueueIndex(this.paths.commandFileName(seq, type));
      } catch (queueErr) {
        console.warn(`[bridge] failed to update queue index: ${String(queueErr)}`);
      }
    }

    debugLog(`wrote command id=${id} seq=${seq}`);

    this.options.appendEvent({
      seq,
      ts: Date.now(),
      type: "command-enqueued",
      id,
      commandType: type,
      payloadSizeBytes: JSON.stringify(payload).length,
      expiresAt: expiresAtMs,
    });

    return envelope;
  }

  private buildCommandId(seq: number): string {
    return `cmd_${String(seq).padStart(12, "0")}`;
  }

  /**
   * Construye envelope de timeout para un comando que no respondió.
   */
  buildResultTimeoutEnvelope(
    commandId: string,
    type: string,
    timeoutMs: number,
    seq: number,
  ): BridgeResultEnvelope {
    return {
      protocolVersion: 2,
      id: commandId,
      seq,
      completedAt: Date.now(),
      status: "timeout",
      ok: false,
      bridgeTimeoutDetails: {
        commandId,
        seq,
        timeoutMs,
        timedOutAt: Date.now(),
        location: "unknown",
        exists: false,
      },
    };
  }

  isDeferredBridgeValue(value: unknown): value is { deferred: true; ticket: string } {
    if (!value || typeof value !== "object") {
      return false;
    }
    const candidate = value as { deferred?: unknown; ticket?: unknown };
    return (
      candidate.deferred === true &&
      typeof candidate.ticket === "string" &&
      candidate.ticket.trim().length > 0
    );
  }

  isMalformedDeferredBridgeValue(value: unknown): boolean {
    if (!value || typeof value !== "object") {
      return false;
    }
    const candidate = value as { deferred?: unknown; ticket?: unknown };
    return (
      candidate.deferred === true &&
      (typeof candidate.ticket !== "string" || candidate.ticket.trim().length === 0)
    );
  }
}

export interface ResultResolverDeps {
  paths: BridgePathLayout;
  resultWatcher: { watch(id: string, cb: () => void): void; unwatch(id: string, cb: () => void): void };
  buildResultTimeoutEnvelope: BridgeCommandClient["buildResultTimeoutEnvelope"];
  isDeferredBridgeValue: BridgeCommandClient["isDeferredBridgeValue"];
  isMalformedDeferredBridgeValue: BridgeCommandClient["isMalformedDeferredBridgeValue"];
  getResultTimeoutMs: () => number;
}

export class BridgeResultResolver {
  constructor(private readonly deps: ResultResolverDeps) {}

  private getOrCreateDeferredTimingAccumulator(
    options: SendCommandAndWaitOptions,
  ): DeferredTimingAccumulator {
    if (options.deferredTiming) {
      return options.deferredTiming;
    }

    const accumulator: DeferredTimingAccumulator = {
      enabled: true,
      startedAt: Date.now(),
      firstPollAt: null,
      lastPollAt: null,
      pollCount: 0,
      tickets: [],
      lastTicket: null,
    };

    options.deferredTiming = accumulator;
    return accumulator;
  }

  recordDeferredPoll(
    options: SendCommandAndWaitOptions,
    ticket: string,
  ): DeferredTimingAccumulator {
    const accumulator = this.getOrCreateDeferredTimingAccumulator(options);
    const now = Date.now();

    accumulator.pollCount += 1;
    accumulator.lastPollAt = now;
    accumulator.lastTicket = ticket;

    if (accumulator.firstPollAt === null) {
      accumulator.firstPollAt = now;
    }

    if (!accumulator.tickets.includes(ticket)) {
      accumulator.tickets.push(ticket);
    }

    return accumulator;
  }

  buildDeferredTimingSummary(
    accumulator: DeferredTimingAccumulator | undefined,
    resolved: boolean,
    now: number,
  ): BridgeDeferredTimings | undefined {
    if (!accumulator) {
      return undefined;
    }

    return {
      enabled: true,
      resolved,
      ticket: accumulator.lastTicket,
      pollCount: accumulator.pollCount,
      totalMs: Math.max(0, now - accumulator.startedAt),
      firstPollAt: accumulator.firstPollAt,
      lastPollAt: accumulator.lastPollAt,
      tickets: [...accumulator.tickets],
    };
  }

  /**
   * Espera el resultado de un comando con polling exponencial.
   * Si recommendedPollAfterMs está presente, se usa como delay inicial antes del primer retry.
   */
  async waitForResult<TResult>(
    envelope: BridgeCommandEnvelope<unknown>,
    timeout: number,
    recommendedPollAfterMs?: number,
  ): Promise<BridgeResultEnvelope<TResult>> {
    const resultPath = this.deps.paths.resultFilePath(envelope.id);
    const started = Date.now();
    let pollMs = 5;
    debugLog(`waiting result id=${envelope.id} path=${resultPath}`);

    return new Promise<BridgeResultEnvelope<TResult>>((resolve, reject) => {
      let resolved = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        this.deps.resultWatcher.unwatch(envelope.id, checkResult);
      };

      const resolveOnce = (result: BridgeResultEnvelope<TResult>) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(result);
      };

      const rejectOnce = (error: Error) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        reject(error);
      };

      const checkResult = async () => {
        if (Date.now() - started > timeout) {
          debugLog(`result timeout id=${envelope.id}`);
          resolveOnce(
            this.deps.buildResultTimeoutEnvelope(
              envelope.id,
              envelope.type,
              timeout,
              envelope.seq,
            ) as unknown as BridgeResultEnvelope<TResult>,
          );
          return;
        }

        try {
          const content = readFileSync(resultPath, "utf8");
          const result = JSON.parse(content) as BridgeResultEnvelope<TResult>;
          resolveOnce(result);
        } catch (err) {
          const error = err as NodeJS.ErrnoException;
          if (error.code === "ENOENT") {
            pollMs = Math.min(pollMs * 1.5, 200);
            timer = setTimeout(checkResult, pollMs);
          } else {
            debugLog(
              `result read failed id=${envelope.id} code=${String(error.code ?? "unknown")}`,
            );
            pollMs = Math.min(pollMs * 1.5, 500);
            timer = setTimeout(checkResult, pollMs);
          }
        }
      };

      const initialDelay = recommendedPollAfterMs != null ? Math.max(0, recommendedPollAfterMs) : 0;
      timer = setTimeout(checkResult, initialDelay);
      this.deps.resultWatcher.watch(envelope.id, checkResult);
    });
  }

  /**
   * Versión async de waitForResult que usa I/O no bloqueante.
   * Recomendado para entornos con alto concurrency o cuando se espera
   * muchos resultados en paralelo.
   */
  async waitForResultAsync<TResult>(
    envelope: BridgeCommandEnvelope<unknown>,
    timeout: number,
    recommendedPollAfterMs?: number,
  ): Promise<BridgeResultEnvelope<TResult>> {
    const resultPath = this.deps.paths.resultFilePath(envelope.id);
    const started = Date.now();
    let pollMs = 5;
    debugLog(`waiting result (async) id=${envelope.id} path=${resultPath}`);

    return new Promise<BridgeResultEnvelope<TResult>>((resolve, reject) => {
      let resolved = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        this.deps.resultWatcher.unwatch(envelope.id, checkResult);
      };

      const resolveOnce = (result: BridgeResultEnvelope<TResult>) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(result);
      };

      const rejectOnce = (error: Error) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        reject(error);
      };

      const checkResult = async () => {
        if (Date.now() - started > timeout) {
          debugLog(`result timeout id=${envelope.id}`);
          resolveOnce(
            this.deps.buildResultTimeoutEnvelope(
              envelope.id,
              envelope.type,
              timeout,
              envelope.seq,
            ) as unknown as BridgeResultEnvelope<TResult>,
          );
          return;
        }

        try {
          const content = await readFileAsync(resultPath, "utf8");
          const result = JSON.parse(content) as BridgeResultEnvelope<TResult>;
          resolveOnce(result);
        } catch (err) {
          const error = err as NodeJS.ErrnoException;
          if (error.code === "ENOENT") {
            pollMs = Math.min(pollMs * 1.5, 200);
            timer = setTimeout(checkResult, pollMs);
          } else {
            debugLog(
              `result read failed id=${envelope.id} code=${String(error.code ?? "unknown")}`,
            );
            pollMs = Math.min(pollMs * 1.5, 500);
            timer = setTimeout(checkResult, pollMs);
          }
        }
      };

      const initialDelay = recommendedPollAfterMs != null ? Math.max(0, recommendedPollAfterMs) : 0;
      timer = setTimeout(checkResult, initialDelay);
      this.deps.resultWatcher.watch(envelope.id, checkResult);
    });
  }
}