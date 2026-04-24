/**
 * Consumer durable de eventos NDJSON del bridge.
 *
 * Lee eventos del journal NDJSON sin perder datos incluso ante crashes.
 *
 * Protocolo de archivos:
 * - logs/events.current.ndjson: archivo activo de escritura (append)
 * - logs/events.<timestamp>.ndjson: archivos rotados (solo lectura)
 * - logs/rotation-manifest.json: índice de archivos rotados
 * - consumer-state/<consumerId>.json: checkpoint de posición (byteOffset + lastSeq)
 *
 * Flujo de recuperación ante rotación:
 * 1. Checkpoint guarda: currentFile, byteOffset, lastSeq, updatedAt
 * 2. Si al leer, byteOffset > tamaño actual del archivo → archivo fue rotado
 * 3. Se consulta rotation-manifest.json para encontrar el archivo rotado correcto
 * 4. Se ajusta offset si el archivo rotado aún contiene datos del checkpoint
 *
 * Características:
 * - Checkpointing eachimétrico: solo se Persiste byteOffset y lastSeq
 * - StringDecoder para manejo correcto de caracteres multibyte UTF-8
 * - Buffer de leftover para líneas parciales entre reads
 * - Detección de gaps de secuencia
 * - Watcher + polling para resiliencia (fallback a polling si watch falla)
 * - Throttled writes del checkpoint para evitar I/O excesivo
 */
import {
  closeSync,
  existsSync,
  openSync,
  readSync,
  statSync,
  watch,
  type FSWatcher,
} from "node:fs";
import { StringDecoder } from "string_decoder";
import { EventEmitter } from "node:events";
import { ensureDir, ensureFile } from "./shared/fs-atomic.js";
import type {
  BridgeEvent,
} from "./shared/protocol.js";
import type { ConsumerCheckpoint, RotationManifest } from "./shared/local-types.js";
import { BridgeEventSchema } from "./shared/protocol.js";
import { BridgePathLayout } from "./shared/path-layout.js";
import { CheckpointManager } from "./consumer-checkpoint.js";
import { FileResolver } from "./consumer-file-resolver.js";

export interface DurableNdjsonConsumerOptions {
  consumerId: string;
  /** Polling interval in ms (default: 300ms) */
  pollIntervalMs?: number;
  /** Read buffer size in bytes (default: 64KB) */
  bufferSize?: number;
  /** If true, start from beginning of file; if false, start from end (default: false) */
  startFromBeginning?: boolean;
  /** Called for each successfully parsed event */
  onEvent?: (event: BridgeEvent) => void;
  /** Called when a sequence gap is detected */
  onGap?: (expected: number, actual: number) => void;
  /** Called when a line fails to parse */
  onParseError?: (line: string, error: unknown) => void;
  /** Called when data loss is detected (e.g., rotated file not found) */
  onDataLoss?: (info: {
    reason: string;
    lostFromOffset: number;
    checkpoint: ConsumerCheckpoint;
    file?: string;
    offset?: number;
    seq?: number;
    timestamp?: number;
  }) => void;
}

/**
 * Consumer durable que persiste su posición parano perder eventos.
 *
 * Soporta:
 * - Reanudación exacta tras crashes (checkpoint de byteOffset + lastSeq)
 * - Recuperación de archivos rotados via rotation-manifest.json
 * - Handling de caracteres multibyte UTF-8 via StringDecoder
 * - Polling con fallback automático si fs.watch falla
 */
export class DurableNdjsonConsumer extends EventEmitter {
  private readonly pollIntervalMs: number;
  private readonly bufferSize: number;

  private watcher: FSWatcher | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private fd: number | null = null;
  private currentFilePath: string | null = null;
  private leftover = "";
  private running = false;
  private consecutiveParseErrors = 0;
  private usingPollingFallback = false;
  private lastWatchError: string | null = null;
  private totalParseErrors = 0;
  private totalDataLossEvents = 0;

  private readonly checkpointManager: CheckpointManager;
  private readonly fileResolver: FileResolver;
  private decoder = new StringDecoder("utf8");

  private watcherFailed = false;
  private recentParseErrors: Array<{
    fragment: string;
    offsetStart: number;
    offsetEnd: number;
    count: number;
  }> = [];
  private recentDataLossEvents: Array<{
    reason: string;
    file: string;
    offset: number;
    seq?: number;
    timestamp: number;
  }> = [];

  private static readonly MAX_CONSECUTIVE_ERRORS = 50;
  private static readonly MAX_RECENT_PARSE_ERRORS = 10;
  private static readonly MAX_RECENT_DATA_LOSS = 10;

  /**
   * @param paths - BridgePathLayout para acceder a la estructura de directorios
   * @param options - Configuración del consumer (consumerId, pollIntervalMs, callbacks, etc.)
   */
  constructor(
    private readonly paths: BridgePathLayout,
    private readonly options: DurableNdjsonConsumerOptions,
  ) {
    super();
    this.pollIntervalMs = options.pollIntervalMs ?? 300;
    this.bufferSize = options.bufferSize ?? 64 * 1024;

    this.checkpointManager = new CheckpointManager(
      paths,
      options.consumerId,
      options.startFromBeginning ?? false,
    );
    this.fileResolver = new FileResolver(paths);
  }

  /**
   * Inicia el consumo de eventos. Crea directorios necesarios,
   * restaura posición desde checkpoint, e inicia watcher + timer de polling.
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    ensureDir(this.paths.consumerStateDir());
    ensureDir(this.paths.logsDir());
    ensureFile(this.paths.currentEventsFile(), "");

    this.reopenFromCheckpoint();

    try {
      this.watcher = watch(this.paths.logsDir(), () => {
        this.poll();
      });
      this.usingPollingFallback = false;
      this.lastWatchError = null;
    } catch (err) {
      this.watcher = null;
      this.usingPollingFallback = true;
      this.lastWatchError = String(err);
      this.emit("warning", {
        type: "watch-fallback",
        error: String(err),
      });
    }

    this.timer = setInterval(() => {
      this.poll();
    }, this.pollIntervalMs);

    this.poll();
  }

  /**
   * Detiene el consumo, libera file descriptors y cierra watcher/timer.
   * El último checkpoint escrito queda persisted para la próxima ejecución.
   */
  stop(): void {
    this.running = false;

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.fd !== null) {
      try {
        closeSync(this.fd);
      } catch {
        // ignore
      }
      this.fd = null;
    }

    this.currentFilePath = null;
    this.leftover = "";
    this.decoder.end();
    this.usingPollingFallback = false;
    this.lastWatchError = null;
  }

  /**
   * Fuerza un poll manual. Lee eventos desde la posición del checkpoint
   * hasta el final del archivo actual. Si el archivo fue rotado, busca
   * el siguiente archivo rotado disponible.
   *
   * El checkpoint se escribe al final de cada poll (throttled).
   */
  poll(): void {
    if (!this.running) return;

    const checkpoint = this.checkpointManager.read();
    const resolved = this.fileResolver.resolveWithRotation(checkpoint, (info) => {
      this.emit("data-loss", info);
      this.options.onDataLoss?.(info);
    });

    if (!resolved) {
      ensureFile(this.paths.currentEventsFile(), "");
      return;
    }

    // If file changed (rotated or recreated) or fd is stale, reopen it
    if (this.currentFilePath !== resolved.filePath || this.fd === null) {
      this.reopenFile(resolved.filePath);
      // Reset decoder when switching files to avoid carryover of incomplete multibyte chars
      this.decoder = new StringDecoder("utf8");
    }

    if (this.fd === null || this.currentFilePath === null) return;

    let stats: ReturnType<typeof statSync>;
    try {
      stats = statSync(this.currentFilePath);
    } catch {
      return;
    }

    // Handle truncation: if file shrunk, reset to beginning
    let offset = resolved.offset;
    if (offset > stats.size) {
      offset = 0;
      this.leftover = "";
      this.decoder = new StringDecoder("utf8");
    }

    // Nothing new to read
    if (offset >= stats.size) {
      const nextFile = this.fileResolver.findNextRotatedFile(this.currentFilePath);
      if (nextFile) {
        this.reopenFile(nextFile);
        this.poll();
      }
      return;
    }

    const buffer = Buffer.alloc(this.bufferSize);

    while (true) {
      const previousLeftover = this.leftover;
      this.leftover = "";

      const bytesRead = readSync(this.fd, buffer, 0, buffer.length, offset);
      if (bytesRead <= 0) {
        this.leftover = previousLeftover;
        break;
      }

      // StringDecoder handles incomplete multibyte characters correctly —
      // it buffers bytes that don't form a complete character until the next write()
      const chunk = previousLeftover + this.decoder.write(buffer.subarray(0, bytesRead));
      const lines = chunk.split("\n");
      this.leftover = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const raw = JSON.parse(line);
          const result = BridgeEventSchema.safeParse(raw);

          // Reset error counter on successful parse
          this.consecutiveParseErrors = 0;

          let event: BridgeEvent;
          if (result.success) {
            event = result.data as BridgeEvent;
          } else {
            event = raw as BridgeEvent;
            this.emit("parse-error", {
              type: "parse-error" as const,
              raw,
              line,
              error: "Validation failed",
              issues: result.error.issues.map((issue) => ({
                path: issue.path,
                message: issue.message,
              })),
            });
            this.options.onParseError?.(line, result.error);
          }

          if (event.seq !== undefined) {
            this.validateSequence(checkpoint.lastSeq, event.seq);
          }

          this.emit("event", event);
          this.options.onEvent?.(event);

          if (event.seq !== undefined) {
            checkpoint.lastSeq = event.seq;
          }
        } catch (err) {
          // JSON parse error — increment error counter
          this.consecutiveParseErrors++;
          this.totalParseErrors++;

          // Guardar contexto del error para diagnostics
          const offsetStart = checkpoint.byteOffset;
          const offsetEnd = offsetStart + bytesRead;
          this.recentParseErrors.push({
            fragment: line.slice(0, 200),
            offsetStart,
            offsetEnd,
            count: this.consecutiveParseErrors,
          });
          if (this.recentParseErrors.length > DurableNdjsonConsumer.MAX_RECENT_PARSE_ERRORS) {
            this.recentParseErrors.shift();
          }

          const parseError = {
            type: "parse-error" as const,
            raw: null,
            line,
            error: String(err),
            recoverable: true,
            consecutiveErrors: this.consecutiveParseErrors,
            totalParseErrors: this.totalParseErrors,
            filePath: this.currentFilePath,
            offset,
          };
          this.emit("parse-error", parseError);
          this.options.onParseError?.(line, err);

          // If too many consecutive errors, the file is likely corrupted
          if (this.consecutiveParseErrors >= DurableNdjsonConsumer.MAX_CONSECUTIVE_ERRORS) {
            this.totalDataLossEvents++;

            this.emit("data-loss", {
              reason: "too many consecutive parse errors",
              errorCount: this.consecutiveParseErrors,
              totalDataLossEvents: this.totalDataLossEvents,
              lastError: String(err),
              lostFromOffset: checkpoint.byteOffset,
              currentFilePath: this.currentFilePath,
              checkpoint,
            });

            this.options.onDataLoss?.({
              reason: "too many consecutive parse errors",
              lostFromOffset: checkpoint.byteOffset,
              checkpoint,
            });

            // Skip to end of file to avoid infinite loop
            this.consecutiveParseErrors = 0;
            offset = stats.size;
            checkpoint.byteOffset = offset;
            break;
          }

          // Skip this corrupted line and continue with next line
          continue;
        }
      }

      offset += bytesRead;
      checkpoint.byteOffset = offset;
      checkpoint.currentFile = this.fileResolver.toRelative(this.currentFilePath);
      checkpoint.updatedAt = Date.now();

      // Throttle checkpoint writes during the loop
      if (this.checkpointManager.canWriteCheckpoint()) {
        this.checkpointManager.write(checkpoint);
        this.checkpointManager.markCheckpointWritten();
      }

      if (bytesRead < buffer.length) break;
    }

    // Flush any remaining incomplete multibyte characters from the decoder
    // Only when closing or switching files - NOT at end of every poll
    // The leftover handling above already captures complete lines

    // Final checkpoint write — ALWAYS write at end of poll
    checkpoint.byteOffset = offset;
    this.checkpointManager.write(checkpoint);
    this.checkpointManager.markCheckpointWritten();
  }

  private validateSequence(lastSeq: number, currentSeq: number): void {
    if (lastSeq === 0) return;
    const expected = lastSeq + 1;
    if (currentSeq !== expected) {
      this.emit("gap", { expected, actual: currentSeq });
      this.options.onGap?.(expected, currentSeq);
    }
  }

  private reopenFromCheckpoint(): void {
    const checkpoint = this.checkpointManager.read();
    const resolved = this.fileResolver.resolveWithRotation(checkpoint);
    if (resolved) {
      this.reopenFile(resolved.filePath);
    }
  }

  private reopenFile(filePath: string): void {
    if (this.fd !== null) {
      try {
        closeSync(this.fd);
      } catch {
        // ignore
      }
      this.fd = null;
    }

    this.fd = openSync(filePath, "r");
    this.currentFilePath = filePath;
    this.leftover = "";
    this.decoder = new StringDecoder("utf8");
  }

  /**
   * @returns true si el watcher de filesystem falló y se usa polling en su lugar
   */
  isUsingPollingFallback(): boolean {
    return this.usingPollingFallback;
  }

  /**
   * @returns Mensaje de error del último intento de crear el watcher, o null si no hubo error
   */
  getLastWatchError(): string | null {
    return this.lastWatchError;
  }

  /**
   * @returns Cantidad total de errores de parseo JSON encontrados desde el inicio
   */
  getTotalParseErrors(): number {
    return this.totalParseErrors;
  }

  /**
   * @returns Cantidad total de eventos de pérdida de datos detectados desde el inicio
   */
  getTotalDataLossEvents(): number {
    return this.totalDataLossEvents;
  }
}
