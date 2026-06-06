/**
 * Escritor append-only del journal NDJSON de eventos del bridge.
 *
 * Los eventos se appendean línea por línea a events.current.ndjson.
 * Cuando el archivo supera rotateAtBytes, se rota a un archivo timestamped
 * y se crea uno nuevo lazily en el siguiente append.
 *
 * Seguridad en rotación:
 * - La rotación usa rename atómico para el archivo completado
 * - Puede haber una ventana corta donde events.current.ndjson no existe;
 *   el siguiente append lo recrea
 * - El rotation manifest se actualiza post-rotación para que los consumers
 *   puedan recuperar eventos de archivos rotados
 */
import { existsSync, readFileSync, statSync, renameSync } from "node:fs";
import { join } from "node:path";
import type { BridgeEvent } from "./shared/protocol.js";
import type { RotationEntry, RotationManifest } from "./shared/local-types.js";
import { BridgePathLayout } from "./shared/path-layout.js";
import { appendLine, atomicWriteFile, ensureDir, ensureFile } from "./shared/fs-atomic.js";
import {
  appendLineAsync,
  readJsonFileAsync,
  fileSize,
} from "./shared/fs-atomic-async.js";

export interface EventLogWriterOptions {
  /** Max size in bytes before rotating (default: 32MB) */
  rotateAtBytes?: number;
}

/**
 * Escritor del journal de eventos con soporte de rotación.
 */
export class EventLogWriter {
  private readonly rotateAtBytes: number;
  private readonly currentFile: string;
  private readonly logsDir: string;
  private lastSeqWritten = 0;
  private rotationCounter = 0;

  /**
   * @param paths - BridgePathLayout
   * @param options - Opciones con rotateAtBytes (default 32MB)
   */
  constructor(
    private readonly paths: BridgePathLayout,
    options: EventLogWriterOptions = {},
  ) {
    this.rotateAtBytes = options.rotateAtBytes ?? 32 * 1024 * 1024;
    this.logsDir = paths.logsDir();
    this.currentFile = paths.currentEventsFile();

    ensureDir(this.logsDir);
    ensureFile(this.currentFile, "");
  }

  /**
   * Appendea un evento al journal. Si el archivo supera rotateAtBytes,
   * hace rotación atómica antes de escribir.
   *
   * @param event - Evento a escribir (se serializa a JSON)
   */
  append(event: BridgeEvent): void {
    this.rotateIfNeeded();
    appendLine(this.currentFile, JSON.stringify(event));

    if (event.seq !== undefined && event.seq > this.lastSeqWritten) {
      this.lastSeqWritten = event.seq;
    }
  }

  /**
   * Versión async (non-blocking) de append(). Misma semántica pero no
   * bloquea el event loop en escrituras largas.
   *
   * La rotación sigue usando renameSync (atómico, no async) para preservar
   * la garantía de atomicidad en la rotación.
   */
  async appendAsync(event: BridgeEvent): Promise<void> {
    await this.rotateIfNeededAsync();
    await appendLineAsync(this.currentFile, JSON.stringify(event));

    if (event.seq !== undefined && event.seq > this.lastSeqWritten) {
      this.lastSeqWritten = event.seq;
    }
  }

  /**
   * @returns Path absoluto del archivo de eventos actual
   */
  getCurrentFile(): string {
    return this.currentFile;
  }

  private rotateIfNeeded(): void {
    let size = 0;
    try {
      size = statSync(this.currentFile).size;
    } catch {
      size = 0;
    }

    if (size < this.rotateAtBytes) return;

    const timestamp = Date.now();
    const counter = this.rotationCounter++;
    const rotatedFileName = `events.${timestamp}-${counter}.ndjson`;
    const rotated = join(this.logsDir, rotatedFileName);

    const sizeAtRotation = size;
    const seqAtRotation = this.lastSeqWritten;

    try {
      renameSync(this.currentFile, rotated);
    } catch {
      return;
    }

    this.appendToManifest({
      file: rotatedFileName,
      rotatedAt: timestamp,
      previousFile: "events.current.ndjson",
      bytesSizeAtRotation: sizeAtRotation,
      lastSeqInFile: seqAtRotation,
    });

    ensureFile(this.currentFile, "");
  }

  private async rotateIfNeededAsync(): Promise<void> {
    const size = await fileSize(this.currentFile);

    if (size < this.rotateAtBytes) return;

    const timestamp = Date.now();
    const counter = this.rotationCounter++;
    const rotatedFileName = `events.${timestamp}-${counter}.ndjson`;
    const rotated = join(this.logsDir, rotatedFileName);

    const sizeAtRotation = size;
    const seqAtRotation = this.lastSeqWritten;

    try {
      // rename atómico — sync dentro de async es OK, la atomicidad
      // del rename es lo que importa.
      renameSync(this.currentFile, rotated);
    } catch {
      return;
    }

    await this.appendToManifestAsync({
      file: rotatedFileName,
      rotatedAt: timestamp,
      previousFile: "events.current.ndjson",
      bytesSizeAtRotation: sizeAtRotation,
      lastSeqInFile: seqAtRotation,
    });

    ensureFile(this.currentFile, "");
  }

  private appendToManifest(entry: RotationEntry): void {
    const manifestFile = this.paths.rotationManifestFile();
    let manifest: RotationManifest = { rotations: [] };

    try {
      if (existsSync(manifestFile)) {
        const content = readFileSync(manifestFile, "utf8");
        manifest = JSON.parse(content) as RotationManifest;
      }
    } catch {
      manifest = { rotations: [] };
    }

    manifest.rotations.push(entry);

    if (manifest.rotations.length > 100) {
      manifest.rotations = manifest.rotations.slice(-100);
    }

    atomicWriteFile(manifestFile, JSON.stringify(manifest, null, 2));
  }

  private async appendToManifestAsync(entry: RotationEntry): Promise<void> {
    const manifestFile = this.paths.rotationManifestFile();
    let manifest: RotationManifest = { rotations: [] };

    const existing = await readJsonFileAsync<RotationManifest>(manifestFile);
    if (existing) {
      manifest = existing;
    }

    manifest.rotations.push(entry);

    if (manifest.rotations.length > 100) {
      manifest.rotations = manifest.rotations.slice(-100);
    }

    // El manifest se reconstruye desde el log rotado si se pierde, así
    // que atomicWriteFile (atómico) sigue siendo lo correcto aquí. La
    // lectura async evita bloquear el event loop durante la reconstrucción.
    atomicWriteFile(manifestFile, JSON.stringify(manifest, null, 2));
  }
}
