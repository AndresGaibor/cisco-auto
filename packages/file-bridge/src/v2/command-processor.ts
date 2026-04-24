/**
 * Procesador de comandos para PT.
 *
 * Maneja dequeuing de comandos, verificación de expiración,
 * deduplicación, y publicación de resultados.
 *
 * CRITICAL: Claim-by-rename previene race conditions y double-processing.
 * El rename atómico de commands/ -> in-flight/ es la operación clave que
 * garantiza que solo un PT procesa cada comando.
 */

import { join, basename } from "node:path";
import { readFileSync, existsSync, renameSync } from "node:fs";
import { createHash } from "node:crypto";
import type { BridgeCommandEnvelope, BridgeResultEnvelope } from "../shared/protocol.js";
import { BridgePathLayout, parseCommandFileName } from "../shared/path-layout.js";
import { EventLogWriter } from "../event-log-writer.js";
import {
  atomicWriteFile,
  ensureDir,
  listJsonFiles,
  safeUnlink,
} from "../shared/fs-atomic.js";

export interface ClaimResult {
  ok: boolean;
  path: string | null;
  reason?: string;
  errorCode?: string;
}

export interface BridgeResultMeta {
  attempt: number;
  queuedAt: number;
  claimedAt: number;
  completedAtMs: number;
  queueLatencyMs: number;
  execLatencyMs: number;
  claimedFile?: string;
}

export interface BridgeResultEnvelopeWithMeta<T = unknown> extends BridgeResultEnvelope<T> {
  meta: BridgeResultMeta;
}

/**
 * Procesa comandos desde la cola y publica resultados.
 */
export class CommandProcessor {
  /**
   * @param paths - Gestor de paths del bridge
   * @param eventWriter - Escritor de eventos para logging
   * @param seq - Generador de secuencias
   */
  constructor(
    private readonly paths: BridgePathLayout,
    private readonly eventWriter: EventLogWriter,
    private readonly seq: { next: () => number },
  ) {}

  /**
   * Obtiene el siguiente comando de la cola (FIFO por seq).
   *
   * Hace claim atómico via rename de commands/ -> in-flight/.
   * Verifica expiración y checksum antes de retornar.
   * Comandos duplicados (con resultado existente) se purgan.
   *
   * @returns El envelope del comando o null si cola vacía
   */
  pickNextCommand<T = unknown>(): BridgeCommandEnvelope<T> | null {
    const files = listJsonFiles(this.paths.commandsDir());

    for (const file of files) {
      const parsed = parseCommandFileName(file);
      const sourcePath = join(this.paths.commandsDir(), file);

      if (!parsed) {
        this.moveToDeadLetter(sourcePath, new Error("Invalid command filename format"));
        continue;
      }

      const cmdId = this.paths.commandIdFromSeq(parsed.seq);
      const resultPath = this.paths.resultFilePath(cmdId);

      if (existsSync(resultPath)) {
        safeUnlink(sourcePath);
        this.eventWriter.append({
          seq: this.seq.next(),
          ts: Date.now(),
          type: "command-purged-duplicate",
          id: cmdId,
          commandType: parsed.type,
        });
        continue;
      }

      const envelope = this.claimAndReadEnvelope<T>(file, sourcePath, parsed, cmdId);
      if (envelope) return envelope;
    }

    return null;
  }

  private claimAndReadEnvelope<T>(
    filename: string,
    sourcePath: string,
    parsed: { seq: number; type: string },
    cmdId: string,
  ): BridgeCommandEnvelope<T> | null {
    const claimResult = this.claimCommandFile(filename);
    if (!claimResult.ok || !claimResult.path) return null;

    this.eventWriter.append({
      seq: this.seq.next(),
      ts: Date.now(),
      type: "command-claimed",
      id: cmdId,
      commandType: parsed.type,
    });

    try {
      const content = readFileSync(claimResult.path, "utf8");
      const envelope = JSON.parse(content) as BridgeCommandEnvelope<T>;

      if (this.isCommandExpired(envelope)) {
        this.publishResult(envelope, {
          startedAt: Date.now(),
          status: "timeout",
          ok: false,
          error: {
            code: "EXPIRED",
            message: "Command expired before being processed",
            phase: "queue",
          },
        });
        return null;
      }

      if (envelope.checksum) {
        const computed = checksumOf({ type: envelope.type, payload: envelope.payload });
        if (computed !== envelope.checksum) {
          this.publishResult(envelope, {
            startedAt: Date.now(),
            status: "failed",
            ok: false,
            error: {
              code: "CHECKSUM_MISMATCH",
              message: "Payload integrity compromised",
              phase: "queue",
            },
          });
          return null;
        }
      }

      this.eventWriter.append({
        seq: envelope.seq,
        ts: Date.now(),
        type: "command-picked",
        id: envelope.id,
        commandType: envelope.type,
      });

      return envelope;
    } catch (err) {
      this.moveToDeadLetter(claimResult.path, err);
      return null;
    }
  }

  private isCommandExpired(envelope: BridgeCommandEnvelope<unknown>): boolean {
    return envelope.expiresAt !== undefined && Date.now() > envelope.expiresAt;
  }

  private claimCommandFile(filename: string): ClaimResult {
    const srcPath = join(this.paths.commandsDir(), filename);
    const dstPath = join(this.paths.inFlightDir(), filename);

    try {
      ensureDir(this.paths.inFlightDir());
      renameSync(srcPath, dstPath);
      return { ok: true, path: dstPath };
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === "ENOENT") {
        return { ok: false, path: null, reason: "file-not-found-or-already-claimed", errorCode: error.code };
      }

      this.eventWriter.append({
        seq: this.seq.next(),
        ts: Date.now(),
        type: "command-claim-error",
        note: `${filename}: ${String(err)}`,
      });

      return { ok: false, path: null, reason: "rename-failed", errorCode: error.code };
    }
  }

  /**
   * Publica el resultado de un comando y limpia el archivo in-flight.
   *
   * Escribe el resultado en results/<id>.json de forma atómica.
   * Agrega metadata de latencias (queue y exec).
   * Emite evento de completed/failed.
   * Finalmente limpia el archivo in-flight.
   *
   * @param cmd - Envelope original del comando
   * @param result - Resultado a publicar
   */
  publishResult<TResult = unknown>(
    cmd: BridgeCommandEnvelope,
    result: {
      startedAt: number;
      status: "completed" | "failed" | "timeout";
      ok: boolean;
      value?: TResult;
      error?: BridgeResultEnvelope["error"];
      attempt?: number;
      queuedAt?: number;
      claimedAt?: number;
      completedAtMs?: number;
      queueLatencyMs?: number;
      execLatencyMs?: number;
      claimedFile?: string;
    },
  ): void {
    const completedAtMs = Date.now();
    const finalResult: BridgeResultEnvelopeWithMeta<TResult> = {
      protocolVersion: 2,
      id: cmd.id,
      seq: cmd.seq,
      completedAt: completedAtMs,
      meta: {
        attempt: result.attempt ?? cmd.attempt ?? 1,
        queuedAt: result.queuedAt ?? cmd.createdAt,
        claimedAt: result.claimedAt ?? completedAtMs,
        completedAtMs,
        queueLatencyMs: result.queueLatencyMs ?? (result.claimedAt ?? completedAtMs) - (result.queuedAt ?? cmd.createdAt),
        execLatencyMs: result.execLatencyMs ?? completedAtMs - (result.claimedAt ?? completedAtMs),
        claimedFile: result.claimedFile,
      },
      ...result,
    };

    atomicWriteFile(
      this.paths.resultFilePath(cmd.id),
      JSON.stringify(finalResult, null, 2),
    );

    this.eventWriter.append({
      seq: cmd.seq,
      ts: Date.now(),
      type: finalResult.ok ? "command-completed" : "command-failed",
      id: cmd.id,
      status: finalResult.status,
      ok: finalResult.ok,
    });

    const inFlightPath = this.paths.inFlightFilePath(cmd.seq, cmd.type);
    safeUnlink(inFlightPath);
  }

  /**
   * Mueve un archivo corrupto a dead-letter con metadata de error.
   *
   * @param filePath - Path del archivo a mover
   * @param error - Error asociado al fallo
   */
  private moveToDeadLetter(filePath: string, error: unknown): void {
    const deadLetterBase = `${Date.now()}-${basename(filePath)}`;
    const deadLetterPath = this.paths.deadLetterFile(deadLetterBase);

    try {
      ensureDir(this.paths.deadLetterDir());
      renameSync(filePath, deadLetterPath);
      atomicWriteFile(
        this.paths.deadLetterErrorFile(deadLetterBase),
        JSON.stringify({
          originalFile: basename(filePath),
          originalPath: filePath,
          deadLetterPath,
          error: String(error),
          movedAt: Date.now(),
        }, null, 2),
      );
    } catch {
      // ignore
    }
  }

  /**
   * Agrega una entrada al índice auxiliar de cola.
   *
   * Este índice es best-effort y se usa para tracking rápido.
   * La fuente primaria de verdad son los archivos físicos en commands/.
   *
   * @param filename - Nombre del archivo de comando a agregar
   */
  appendQueueIndex(filename: string): void {
    const queueFilePath = join(this.paths.commandsDir(), "_queue.json");
    let queue: string[] = [];

    try {
      const existing = readFileSync(queueFilePath, "utf8");
      if (existing.trim()) {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed)) {
          queue = parsed
            .map((entry) => String(entry).trim())
            .filter((entry) => entry !== "" && entry !== "_queue.json" && entry.endsWith(".json"));
        }
      }
    } catch {
      queue = [];
    }

    if (!queue.includes(filename)) {
      queue.push(filename);
    }

    queue.sort();
    atomicWriteFile(queueFilePath, JSON.stringify(queue));
  }

  /**
   * Remueve una entrada del índice auxiliar de cola.
   *
   * Este método es estático porque necesita acceder a un path arbitrario
   * (útil para garbage collection u otras operaciones batch).
   *
   * @param root - Directorio raíz del bridge
   * @param filename - Nombre del archivo de comando a remover
   */
  static removeQueueEntry(root: string, filename: string): void {
    const queueFilePath = join(root, "commands", "_queue.json");

    try {
      const existing = readFileSync(queueFilePath, "utf8");
      if (!existing.trim()) return;

      const parsed = JSON.parse(existing);
      if (!Array.isArray(parsed)) return;

      const filtered = parsed.map((entry) => String(entry)).filter((entry) => entry !== filename);
      atomicWriteFile(queueFilePath, JSON.stringify(filtered));
    } catch {
      // Índice best-effort.
    }
  }
}

function checksumOf(input: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")}`;
}
