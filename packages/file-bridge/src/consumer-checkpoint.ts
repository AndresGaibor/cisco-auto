/**
 * Gestor de checkpoints para DurableNdjsonConsumer.
 *
 * Lee, escribe y hace caching de checkpoints de posición del consumer.
 * Implementa escritura throttleada para evitar I/O excesivo durante reads grandes.
 *
 * El checkpoint guarda:
 * - consumerId: identificador del consumer
 * - currentFile: archivo NDJSON actualmente en lectura (relative path)
 * - byteOffset: posición exacta dentro del archivo
 * - lastSeq: último seq procesado (para detección de gaps)
 * - updatedAt: timestamp de última actualización
 *
 * Estrategia de throttle: solo escribe si pasaron más de 10ms desde la última
 * escritura, para evitar writes en cada poll cuando se leen muchos eventos.
 */
import { existsSync, readFileSync } from "node:fs";
import { statSync } from "node:fs";
import { atomicWriteFile } from "./shared/fs-atomic.js";
import type { ConsumerCheckpoint } from "./shared/local-types.js";
import { BridgePathLayout } from "./shared/path-layout.js";

/**
 * Maneja checkpoints de posición para consumo durable de eventos.
 */
export class CheckpointManager {
  private checkpointCache: ConsumerCheckpoint | null = null;
  private lastCheckpointWrite = 0;
  private readonly CHECKPOINT_WRITE_INTERVAL = 10; // ms

  /**
   * @param paths - BridgePathLayout para acceder a directorios
   * @param consumerId - Identificador único del consumer
   * @param startFromBeginning - Si true, lee desde inicio; si false, desde fin de archivo
   */
  constructor(
    private readonly paths: BridgePathLayout,
    private readonly consumerId: string,
    private readonly startFromBeginning: boolean,
  ) {}

  /**
   * Lee el checkpoint actual desde disco, o crea uno nuevo si no existe.
   * Hace cache del checkpoint leído para evitar lecturas repetidas.
   *
   * @returns Copia del checkpoint actual (nunca retorna el objeto interno)
   */
  read(): ConsumerCheckpoint {
    if (!existsSync(this.checkpointFile())) {
      const checkpoint = this.fresh();
      this.write(checkpoint);
      this.checkpointCache = checkpoint;
      this.lastCheckpointWrite = Date.now();
      return checkpoint;
    }

    try {
      const raw = JSON.parse(
        readFileSync(this.checkpointFile(), "utf8"),
      ) as ConsumerCheckpoint;
      this.checkpointCache = raw;
      return { ...raw };
    } catch {
      return this.fresh();
    }
  }

  /**
   * Escribe checkpoint de forma atómica. Solo escribe si hay cambios
   * respecto al cache para evitar escrituras redundantes.
   *
   * @param checkpoint - El checkpoint a persistir
   */
  write(checkpoint: ConsumerCheckpoint): void {
    if (
      this.checkpointCache &&
      this.checkpointCache.byteOffset === checkpoint.byteOffset &&
      this.checkpointCache.lastSeq === checkpoint.lastSeq &&
      this.checkpointCache.currentFile === checkpoint.currentFile
    ) {
      return;
    }

    atomicWriteFile(this.checkpointFile(), JSON.stringify(checkpoint, null, 2));
    this.checkpointCache = checkpoint;
  }

  /**
   * Crea un checkpoint inicial basado en startFromBeginning.
   * Si startFromBeginning=false y existe el archivo, empieza desde el final.
   *
   * @returns Checkpoint inicial
   */
  fresh(): ConsumerCheckpoint {
    const currentFile = this.relativeLogFile(this.paths.currentEventsFile());
    let byteOffset = 0;
    if (!this.startFromBeginning && existsSync(this.paths.currentEventsFile())) {
      byteOffset = statSync(this.paths.currentEventsFile()).size;
    }
    return {
      consumerId: this.consumerId,
      currentFile,
      byteOffset,
      lastSeq: 0,
      updatedAt: Date.now(),
    };
  }

  /**
   * Indica si han pasado suficientes ms para permitir escritura throttleada.
   * @returns true si puede escribir ahora
   */
  canWriteCheckpoint(): boolean {
    return Date.now() - this.lastCheckpointWrite > this.CHECKPOINT_WRITE_INTERVAL;
  }

  /**
   * Marca que se escribió un checkpoint (reinicia el timer de throttle).
   */
  markCheckpointWritten(): void {
    this.lastCheckpointWrite = Date.now();
  }

  /**
   * @returns Path absoluto del archivo de checkpoint
   */
  getCheckpointFile(): string {
    return this.paths.consumerCheckpointFile(this.consumerId);
  }

  private checkpointFile(): string {
    return this.paths.consumerCheckpointFile(this.consumerId);
  }

  private relativeLogFile(filePath: string): string {
    return filePath.split("/").pop() ?? "events.current.ndjson";
  }
}
