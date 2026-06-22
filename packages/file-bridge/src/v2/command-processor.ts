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
import { readFileSync, existsSync, renameSync, statSync } from "node:fs";
import { readFile as readFileAsync } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { BridgeCommandEnvelope, BridgeResultEnvelope } from "../shared/protocol.js";
import { BridgePathLayout, parseCommandFileName } from "../shared/path-layout.js";
import { EventLogWriter } from "../event-log-writer.js";
import {
  atomicWriteFile,
  ensureDir,
  safeUnlink,
} from "../shared/fs-atomic.js";
import { listJsonFilesAsync } from "../shared/fs-atomic-async.js";
import { filterBridgeCommandFiles } from "../shared/bridge-file-classifier.js";
import { ReaddirCache } from "../shared/readdir-cache.js";
import { FileBridgeMetrics } from "../file-bridge-metrics.js";
import { AppendOnlyQueueIndex, type AppendOnlyQueueIndexOptions } from "../shared/append-only-queue-index.js";

/** Cada cuántos appends se evalúa la compactación automática. */
const DEFAULT_COMPACTION_INTERVAL = 1000;

/** Opciones de CommandProcessor para el índice y compaction. */
export interface CommandProcessorIndexOptions extends AppendOnlyQueueIndexOptions {
  /** Cada cuántos appends se evalúa la compactación (default 1000). */
  compactionEvery?: number;
}

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
  type: string;
  meta: BridgeResultMeta;
}

/**
 * Opciones para pickNextCommand.
 */
export interface PickNextCommandOptions {
  /**
   * Si true, ignora el skip por mtime y siempre lista el directorio.
   * Útil justo después de un claim exitoso (cuando sabemos que el
   * archivo fue removido y puede haber más comandos nuevos).
   */
  forceFresh?: boolean;
}

/**
 * Procesa comandos desde la cola y publica resultados.
 */
export class CommandProcessor {
  private readonly readdirCache: ReaddirCache;
  private readonly metrics: FileBridgeMetrics | null;
  private readonly queueIndex: AppendOnlyQueueIndex;
  private appendCount = 0;
  private readonly compactionEvery: number;
  private lastSeenMtime: number | null = null;
  private didClaimLastTime = false;

  /**
   * @param paths - Gestor de paths del bridge
   * @param eventWriter - Escritor de eventos para logging
   * @param seq - Generador de secuencias
   * @param readdirCacheTtlMs - TTL del cache de readdir. 0 desactiva. Default 100ms.
   * @param metrics - Métricas opcionales. Si se provee, se registran counters nuevos.
   * @param indexOptions - Opciones del AppendOnlyQueueIndex y compaction.
   */
  constructor(
    private readonly paths: BridgePathLayout,
    private readonly eventWriter: EventLogWriter,
    private readonly seq: { next: () => number },
    readdirCacheTtlMs: number = 100,
    metrics: FileBridgeMetrics | null = null,
    indexOptions?: CommandProcessorIndexOptions,
  ) {
    this.readdirCache = new ReaddirCache({
      ttlMs: readdirCacheTtlMs,
      extension: ".json",
    });
    this.metrics = metrics;
    this.queueIndex = new AppendOnlyQueueIndex({
      commandsDir: this.paths.commandsDir(),
      maxSizeBytes: indexOptions?.maxSizeBytes,
    });
    this.compactionEvery = indexOptions?.compactionEvery ?? DEFAULT_COMPACTION_INTERVAL;
    this.migrateLegacyQueueIndex();
  }

  /**
   * Migra el _queue.json legacy al nuevo formato _queue.ndjson.
   *
   * Detecta si existe el archivo legacy y, si es así, copia todas sus
   * entries al AppendOnlyQueueIndex. Después renombra el legacy a
   * _queue.json.migrated para evitar re-migraciones en arranques futuros.
   */
  private migrateLegacyQueueIndex(): void {
    const legacyPath = join(this.paths.commandsDir(), "_queue.json");
    if (!existsSync(legacyPath)) return;

    try {
      const existing = readFileSync(legacyPath, "utf8");
      if (existing.trim()) {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed)) {
          for (const entry of parsed) {
            const filename = String(entry).trim();
            if (filename !== "" && filename !== "_queue.json" && filename.endsWith(".json")) {
              this.queueIndex.append(filename);
            }
          }
        }
      }
    } catch {
      // Si el legacy está corrupto, se ignora y el nuevo índice parte vacío.
    }

    try {
      const migratedPath = join(this.paths.commandsDir(), "_queue.json.migrated");
      renameSync(legacyPath, migratedPath);
    } catch {
      // Si no se puede renombrar, al menos no rompemos el bridge.
    }
  }

  /**
   * Obtiene el siguiente comando de la cola (FIFO por seq).
   *
   * Optimistic locking por mtime:
   *  - Trackea el mtimeMs del directorio commands/ via ReaddirCache.
   *  - Si el mtime no cambió desde la última llamada Y no se hizo claim
   *    en la iteración anterior, retorna null inmediatamente sin volver
   *    a iterar.
   *  - Esto evita trabajo redundante cuando múltiples workers consultan
   *    la misma cola vacía.
   *
   * Hace claim atómico via rename de commands/ -> in-flight/.
   * Verifica expiración y checksum antes de retornar.
   * Comandos duplicados (con resultado existente) se purgan.
   *
   * @param opts - Opciones (`{ forceFresh?: boolean }`)
   * @returns El envelope del comando o null si cola vacía
   */
  pickNextCommand<T = unknown>(opts: PickNextCommandOptions = {}): BridgeCommandEnvelope<T> | null {
    const { forceFresh = false } = opts;

    this.metrics?.recordPickNextCommandCall();

    // Skip rápido por mtime: si el directorio no cambió y no hicimos claim
    // en la última iteración, retornar null sin tocar el cache.
    if (!forceFresh) {
      const currentMtime = this.statCommandsDir();
      if (
        this.lastSeenMtime !== null &&
        currentMtime === this.lastSeenMtime &&
        !this.didClaimLastTime
      ) {
        this.metrics?.recordPickNextSkippedByMtime();
        return null;
      }
      this.lastSeenMtime = currentMtime;
    }

    this.didClaimLastTime = false;

    const readdirStartedAt = Date.now();
    const allFiles = this.readdirCache.list(this.paths.commandsDir());
    const readdirCacheHit = this.readdirCache.wasLastCallCached();
    this.metrics?.recordReaddir(Date.now() - readdirStartedAt, readdirCacheHit);
    if (readdirCacheHit) {
      this.metrics?.recordPickNextByCacheHit();
    }
    const files = filterBridgeCommandFiles(allFiles);

    for (const file of files) {
      const parsed = parseCommandFileName(file);
      const sourcePath = join(this.paths.commandsDir(), file);

      if (!parsed) {
        this.moveToDeadLetter(sourcePath, new Error("Invalid command filename format"));
        this.removeQueueIndexEntry(file);
        continue;
      }

      const cmdId = this.paths.commandIdFromSeq(parsed.seq);
      const resultPath = this.paths.resultFilePath(cmdId);

      if (existsSync(resultPath)) {
        safeUnlink(sourcePath);
        this.removeQueueIndexEntry(file);
        this.eventWriter.append({
          seq: this.seq.next(),
          ts: Date.now(),
          type: "command-purged-duplicate",
          id: cmdId,
          commandType: parsed.type,
        });
        continue;
      }

      // Claim invalida el cache (puede haber nuevos archivos en in-flight/)
      this.readdirCache.invalidate(this.paths.commandsDir());
      // Tras el claim el archivo se mueve fuera → mtime cambia
      this.lastSeenMtime = null;

      const envelope = this.claimAndReadEnvelope<T>(file, sourcePath, parsed, cmdId);
      if (envelope) {
        this.didClaimLastTime = true;
        return envelope;
      }
    }

    return null;
  }

  private statCommandsDir(): number {
    try {
      return statSync(this.paths.commandsDir()).mtimeMs;
    } catch {
      return -1;
    }
  }

  /**
   * Versión async (non-blocking) de pickNextCommand(). Misma semántica FIFO
   * y misma garantía atómica de claim-by-rename.
   *
   * El rename atómico (sync) se mantiene dentro del async — la atomicidad
   * del rename es lo que importa, no si es sync o async.
   * La lectura del envelope se hace con readFile de fs/promises.
   */
  async pickNextCommandAsync<T = unknown>(): Promise<BridgeCommandEnvelope<T> | null> {
    const readdirStartedAt = Date.now();
    const allFiles = await listJsonFilesAsync(this.paths.commandsDir());
    this.metrics?.recordReaddir(Date.now() - readdirStartedAt, false);
    const files = filterBridgeCommandFiles(allFiles);

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

      const envelope = await this.claimAndReadEnvelopeAsync<T>(file, sourcePath, parsed, cmdId);
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

    this.removeQueueIndexEntry(filename);

    this.eventWriter.append({
      seq: this.seq.next(),
      ts: Date.now(),
      type: "command-claimed",
      id: cmdId,
      commandType: parsed.type,
    });

    const parseStartedAt = Date.now();
    try {
      const content = readFileSync(claimResult.path, "utf8");
      const envelope = JSON.parse(content) as BridgeCommandEnvelope<T>;
      this.metrics?.recordJsonParse(Date.now() - parseStartedAt, true);

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
      this.metrics?.recordJsonParse(Date.now() - parseStartedAt, false);
      this.moveToDeadLetter(claimResult.path, err);
      return null;
    }
  }

  /**
   * Versión async de claimAndReadEnvelope. claimCommandFile (rename atómico)
   * se mantiene sync, pero la lectura del envelope se hace con readFile async.
   */
  private async claimAndReadEnvelopeAsync<T>(
    filename: string,
    sourcePath: string,
    parsed: { seq: number; type: string },
    cmdId: string,
  ): Promise<BridgeCommandEnvelope<T> | null> {
    const claimResult = this.claimCommandFile(filename);
    if (!claimResult.ok || !claimResult.path) return null;

    this.removeQueueIndexEntry(filename);

    this.eventWriter.append({
      seq: this.seq.next(),
      ts: Date.now(),
      type: "command-claimed",
      id: cmdId,
      commandType: parsed.type,
    });

    const parseStartedAt = Date.now();
    try {
      const content = await readFileAsync(claimResult.path, "utf8");
      const envelope = JSON.parse(content) as BridgeCommandEnvelope<T>;
      this.metrics?.recordJsonParse(Date.now() - parseStartedAt, true);

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
      this.metrics?.recordJsonParse(Date.now() - parseStartedAt, false);
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
    const startedAt = Date.now();

    try {
      ensureDir(this.paths.inFlightDir());
      renameSync(srcPath, dstPath);
      this.metrics?.recordClaim(Date.now() - startedAt, true);
      return { ok: true, path: dstPath };
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      this.metrics?.recordClaim(Date.now() - startedAt, false);
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
    const startedAt = Date.now();
    const finalResult: BridgeResultEnvelopeWithMeta<TResult> = {
      ...result,
      protocolVersion: 2,
      id: cmd.id,
      seq: cmd.seq,
      type: cmd.type,
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
    };

    let success = false;
    try {
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
      success = true;
    } finally {
      this.metrics?.recordResultPublish(Date.now() - startedAt, success);
    }
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

  private removeQueueIndexEntry(filename: string): void {
    try {
      this.queueIndex.remove([filename]);
    } catch {
      // El índice es auxiliar; si falla la limpieza no bloqueamos el flujo.
    }
  }

  /**
   * Agrega una entrada al índice auxiliar de cola.
   *
   * Delega en AppendOnlyQueueIndex (NDJSON) para que el append sea O(1)
   * en vez del O(N) del _queue.json legacy. Periódicamente evalúa la
   * compactación según `compactionEvery`.
   *
   * Este índice es best-effort y se usa para tracking rápido.
   * La fuente primaria de verdad son los archivos físicos en commands/.
   *
   * @param filename - Nombre del archivo de comando a agregar
   */
  appendQueueIndex(filename: string): void {
    if (filename === "" || filename === "_queue.json" || filename === "_queue.ndjson") {
      return;
    }
    const startedAt = Date.now();
    this.queueIndex.append(filename);
    this.metrics?.recordQueueAppend(Date.now() - startedAt);
    this.appendCount += 1;
    if (this.appendCount >= this.compactionEvery) {
      this.compactQueueIndexIfNeeded();
      this.appendCount = 0;
    }
  }

  /**
   * Compacta el índice si excede el tamaño máximo configurado.
   *
   * Útil como hook externo (p. ej. al detener el processor o en
   * intervalos de GC). Las compactaciones periódicas se disparan
   * automáticamente desde `appendQueueIndex` cada `compactionEvery` appends.
   */
  compactQueueIndexIfNeeded(): void {
    if (this.queueIndex.needsCompaction()) {
      this.queueIndex.compact();
      this.metrics?.recordQueueCompaction();
    }
  }

  rebuildQueueIndex(): void {
    this.queueIndex.compact();
    this.metrics?.recordQueueCompaction();
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
    const commandsDir = join(root, "commands");
    const index = new AppendOnlyQueueIndex({ commandsDir });
    index.remove([filename]);
  }
}

function checksumOf(input: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")}`;
}
