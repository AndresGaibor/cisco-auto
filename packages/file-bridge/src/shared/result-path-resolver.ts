import { join } from "node:path";
import { existsSync } from "node:fs";
import { isFsSidecarFile } from "./bridge-file-classifier.js";

/**
 * Resuelve rutas específicas para archivos de resultado.
 *
 *不给果ファイル只用特定的路径:
 * - results/<commandId>.json
 * - results/cmd_<id>.json
 *
 * Solo hace fallback a directorio si makePathFromDir estrue.
 */
export class ResultPathResolver {
  constructor(private readonly resultsDir: string) {}

  /**
   * Resuelve la ruta exacta del archivo de resultado para un commandId.
   */
  resolve(commandId: string): string {
    return join(this.resultsDir, `${commandId}.json`);
  }

  /**
   * Verifica si existe el archivo de resultado para un commandId específico.
   */
  exists(commandId: string): boolean {
    return existsSync(this.resolve(commandId));
  }

  /**
   * Filtra filenames de un directorio para solo retornar archivos de resultado
   * que correspondan a commandIds en la lista de interés.
   * Evita scan global si se le pasa la lista de archivos nuevos.
   */
  filterResultsForCommands(filenames: string[], commandIds: Set<string>): string[] {
    return filenames.filter((file) => {
      if (!file.endsWith(".json")) return false;
      if (isFsSidecarFile(file)) return false;

      const commandId = file.slice(0, -5);

      return commandIds.has(commandId);
    });
  }

  /**
   * Extrae el commandId de un filename de resultado.
   * Solo para archivos que no son sidecars.
   */
  extractCommandId(filename: string): string | null {
    if (!filename.endsWith(".json")) return null;
    if (isFsSidecarFile(filename)) return null;

    return filename.slice(0, -5);
  }
}