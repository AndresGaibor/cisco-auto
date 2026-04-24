/**
 * Resolvedor de archivos para DurableNdjsonConsumer.
 *
 * Resuelve paths relativos a absolutos y encuentra el siguiente
 * archivo rotado. Soporta rotation manifest para recuperar eventos
 * de archivos que fueron rotados.
 *
 * Cuando un archivo NDJSON supera el umbral de tamaño, EventLogWriter
 * lo renombra a events.<timestamp>.ndjson y crea uno nuevo. Este resolver
 * maneja la transición transparently para el consumer.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ConsumerCheckpoint, RotationManifest } from "./shared/local-types.js";
import { BridgePathLayout } from "./shared/path-layout.js";

/**
 * Resuelve paths de archivos de log manejando rotación.
 */
export class FileResolver {
  /**
   * @param paths - BridgePathLayout para acceder a directorios
   */
  constructor(private readonly paths: BridgePathLayout) {}

  /**
   * Resuelve un nombre de archivo relativo a path absoluto.
   * Si el archivo no existe, hace fallback a events.current.ndjson.
   *
   * @param relativeName - Nombre relativo del archivo
   * @returns Path absoluto o null si no se encuentra
   */
  resolve(relativeName: string): string | null {
    const full = join(this.paths.logsDir(), relativeName);
    if (existsSync(full)) return full;

    const current = this.paths.currentEventsFile();
    if (existsSync(current)) return current;

    return null;
  }

  /**
   * Resuelve checkpoint considerando rotación de archivos.
   *
   * Si el checkpoint apunta a un archivo que ya no tiene el tamaño esperado,
   * significa que fue rotado. Consulta el rotation manifest para encontrar
   * dónde están los datos restantes.
   *
   * @param checkpoint - Checkpoint con posición actual
   * @param onDataLoss - Callback opcional cuando se detecta pérdida de datos
   * @returns Path y offsetresolved, o null si no se puede leer nada
   */
  resolveWithRotation(
    checkpoint: ConsumerCheckpoint,
    onDataLoss?: (info: { reason: string; lostFromOffset: number; checkpoint: ConsumerCheckpoint }) => void,
  ): { filePath: string; offset: number } | null {
    const currentFilePath = join(this.paths.logsDir(), checkpoint.currentFile);
    let currentSize: number;

    try {
      currentSize = statSync(currentFilePath).size;
    } catch {
      const fallback = this.paths.currentEventsFile();
      if (existsSync(fallback)) {
        return { filePath: fallback, offset: 0 };
      }
      return null;
    }

    if (checkpoint.byteOffset <= currentSize) {
      return { filePath: currentFilePath, offset: checkpoint.byteOffset };
    }

    const manifest = this.readManifest();
    if (!manifest) {
      onDataLoss?.({
        reason: "no rotation manifest found",
        lostFromOffset: checkpoint.byteOffset,
        checkpoint,
      });
      return { filePath: currentFilePath, offset: 0 };
    }

    const rotated = manifest.rotations.find(
      (r) =>
        r.previousFile === checkpoint.currentFile &&
        r.rotatedAt > checkpoint.updatedAt,
    );

    if (rotated) {
      const rotatedPath = join(this.paths.logsDir(), rotated.file);
      if (existsSync(rotatedPath)) {
        return { filePath: rotatedPath, offset: checkpoint.byteOffset };
      }
    }

    onDataLoss?.({
      reason: "rotated file not found in manifest",
      lostFromOffset: checkpoint.byteOffset,
      checkpoint,
    });
    return { filePath: currentFilePath, offset: 0 };
  }

  /**
   * Encuentra el siguiente archivo rotado después del actual.
   * Útil cuando el archivo actual se agotó y hay que continuar leyendo.
   *
   * @param currentPath - Path absoluto del archivo actual
   * @returns Path del siguiente archivo rotado o null si no hay más
   */
  findNextRotatedFile(currentPath: string): string | null {
    let files: string[];
    try {
      files = readdirSync(this.paths.logsDir())
        .filter((f) => f.startsWith("events.") && f.endsWith(".ndjson"))
        .sort();
    } catch {
      return null;
    }

    const current = this.toRelative(currentPath);
    const idx = files.indexOf(current);
    if (idx >= 0 && idx + 1 < files.length) {
      return join(this.paths.logsDir(), files[idx + 1]!);
    }

    return null;
  }

  /**
   * Convierte un path absoluto a nombre relativo dentro del directorio de logs.
   *
   * @param absolutePath - Path absoluto
   * @returns Solo el nombre del archivo
   */
  toRelative(absolutePath: string): string {
    return absolutePath.split("/").pop() ?? "events.current.ndjson";
  }

  private readManifest(): RotationManifest | null {
    const manifestFile = this.paths.rotationManifestFile();
    if (!existsSync(manifestFile)) return null;

    try {
      const content = readFileSync(manifestFile, "utf8");
      return JSON.parse(content) as RotationManifest;
    } catch {
      return null;
    }
  }
}
