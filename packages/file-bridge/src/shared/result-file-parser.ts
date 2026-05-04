import { readFileSync } from "node:fs";
import { isFsSidecarFile } from "./bridge-file-classifier.js";

/**
 * ResultFileParser parsea archivos de resultado y filtra sidecars.
 *
 * Solo procesa archivos que:
 * - Terminan en .json
 * - No son sidecars (.tmp, .meta.json, .error.json, etc.)
 */
export class ResultFileParser {
  /**
   * Determina si un filename es un archivo de resultado válido.
   */
  isValidResultFile(filename: string): boolean {
    if (!filename.endsWith(".json")) return false;
    if (isFsSidecarFile(filename)) return false;
    return true;
  }

  /**
   * Parsea un archivo de resultado y retorna el contenido.
   * Retorna null si el archivo es un sidecar o no se puede leer.
   */
  parse(fullPath: string): object | null {
    try {
      const content = readFileSync(fullPath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}