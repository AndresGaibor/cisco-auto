/**
 * AppendOnlyQueueIndex - Índice append-only para la cola de comandos.
 *
 * El _queue.json legacy se reescribía entero en cada append: O(N) por append,
 * O(N²) para N comandos totales. Esto es devastador bajo alta concurrencia.
 *
 * Este nuevo diseño escribe append-only en NDJSON (una línea por entry),
 * permitiendo appends en O(1). La reconstrucción del set se hace lazy
 * cuando se necesita.
 *
 * Formato del archivo: una línea JSON por entry (filename).
 * El archivo se trunca cuando garbage collector elimina entries inválidas.
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { ensureDir } from "./fs-atomic.js";
import {
  appendLineAsync,
  pathExists,
  readTextFile,
  writeTextFile,
} from "./fs-atomic-async.js";

export interface AppendOnlyQueueIndexOptions {
  /** Path al archivo NDJSON (default: <commandsDir>/_queue.ndjson). */
  indexPath?: string;
  /** Directorio de comandos (para default del indexPath). */
  commandsDir?: string;
  /** Tamaño máximo antes de compactar (default 10MB). */
  maxSizeBytes?: number;
}

export class AppendOnlyQueueIndex {
  private readonly indexPath: string;
  private readonly maxSizeBytes: number;
  private cachedSet: Set<string> | null = null;

  constructor(opts: AppendOnlyQueueIndexOptions) {
    if (opts.indexPath) {
      this.indexPath = opts.indexPath;
    } else if (opts.commandsDir) {
      this.indexPath = join(opts.commandsDir, "_queue.ndjson");
    } else {
      throw new Error("AppendOnlyQueueIndex requires indexPath or commandsDir");
    }
    this.maxSizeBytes = opts.maxSizeBytes ?? 10 * 1024 * 1024;
  }

  /**
   * Appends filename al índice. O(1) en el happy path.
   */
  append(filename: string): void {
    ensureDir(this.getDirectory());
    appendFileSync(this.indexPath, JSON.stringify(filename) + "\n", "utf8");
    this.cachedSet?.add(filename);
  }

  /**
   * Versión async (non-blocking) de append(). Misma semántica O(1).
   * appendLineAsync ya crea el directorio padre si no existe.
   */
  async appendAsync(filename: string): Promise<void> {
    await appendLineAsync(this.indexPath, JSON.stringify(filename));
    this.cachedSet?.add(filename);
  }

  /**
   * Lee todas las entries actuales. Usa cache si está disponible.
   * Retorna siempre un array NUEVO (inmutable) para evitar mutaciones externas.
   */
  getAll(): string[] {
    if (this.cachedSet) {
      return Array.from(this.cachedSet);
    }

    if (!existsSync(this.indexPath)) {
      this.cachedSet = new Set();
      return [];
    }

    try {
      const content = readFileSync(this.indexPath, "utf8");
      const lines = content.split("\n").filter((line) => line.trim() !== "");
      const set = new Set<string>();
      for (const line of lines) {
        try {
          const filename = JSON.parse(line);
          if (typeof filename === "string" && filename !== "") {
            set.add(filename);
          }
        } catch {
          // skip malformed lines
        }
      }
      this.cachedSet = set;
      return Array.from(set);
    } catch {
      this.cachedSet = new Set();
      return [];
    }
  }

  /**
   * Versión async de getAll(). Reconstruye el cache si no está presente.
   */
  async getAllAsync(): Promise<string[]> {
    if (this.cachedSet) {
      return Array.from(this.cachedSet);
    }

    const content = await readTextFile(this.indexPath);
    if (content === null) {
      this.cachedSet = new Set();
      return [];
    }

    const lines = content.split("\n").filter((line) => line.trim() !== "");
    const set = new Set<string>();
    for (const line of lines) {
      try {
        const filename = JSON.parse(line);
        if (typeof filename === "string" && filename !== "") {
          set.add(filename);
        }
      } catch {
        // skip malformed lines
      }
    }
    this.cachedSet = set;
    return Array.from(set);
  }

  /**
   * Lee todas las entries (referencia compartida, no copiar).
   * Más rápido pero el caller NO debe mutar el array retornado.
   */
  getAllCached(): string[] {
    if (this.cachedSet) {
      return Array.from(this.cachedSet);
    }
    return this.getAll();
  }

  /**
   * Verifica si una filename está en el índice.
   */
  has(filename: string): boolean {
    if (this.cachedSet) {
      return this.cachedSet.has(filename);
    }
    return this.getAll().includes(filename);
  }

  /**
   * Elimina entries específicas. Útil para garbage collection.
   */
  remove(filenames: string[]): void {
    if (filenames.length === 0) return;
    const toRemove = new Set(filenames);

    if (this.cachedSet) {
      for (const f of toRemove) {
        this.cachedSet.delete(f);
      }
    }

    if (!existsSync(this.indexPath)) return;

    try {
      const content = readFileSync(this.indexPath, "utf8");
      const lines = content.split("\n");
      const filtered = lines.filter((line) => {
        if (line.trim() === "") return true;
        try {
          const filename = JSON.parse(line);
          return !toRemove.has(filename);
        } catch {
          return true;
        }
      });
      writeFileSync(this.indexPath, filtered.join("\n"), "utf8");
    } catch {
      // ignore
    }
  }

  /**
   * Versión async de remove(). Reconstruye el archivo sin las entries.
   */
  async removeAsync(filenames: string[]): Promise<void> {
    if (filenames.length === 0) return;
    const toRemove = new Set(filenames);

    if (this.cachedSet) {
      for (const f of toRemove) {
        this.cachedSet.delete(f);
      }
    }

    const exists = await pathExists(this.indexPath);
    if (!exists) return;

    const content = await readTextFile(this.indexPath);
    if (content === null) return;

    const lines = content.split("\n");
    const filtered = lines.filter((line) => {
      if (line.trim() === "") return true;
      try {
        const filename = JSON.parse(line);
        return !toRemove.has(filename);
      } catch {
        return true;
      }
    });
    await writeTextFile(this.indexPath, filtered.join("\n"));
  }

  /**
   * Compacta el archivo eliminando duplicados y entradas inválidas.
   * Útil después de GC o crash recovery.
   */
  compact(): void {
    this.cachedSet = null;
    if (!existsSync(this.indexPath)) return;

    try {
      const content = readFileSync(this.indexPath, "utf8");
      const lines = content.split("\n");
      const seen = new Set<string>();
      const deduped: string[] = [];

      for (const line of lines) {
        if (line.trim() === "") continue;
        try {
          const filename = JSON.parse(line);
          if (typeof filename === "string" && filename !== "" && !seen.has(filename)) {
            seen.add(filename);
            deduped.push(JSON.stringify(filename));
          }
        } catch {
          // skip malformed
        }
      }

      writeFileSync(this.indexPath, deduped.join("\n") + (deduped.length > 0 ? "\n" : ""), "utf8");
    } catch {
      // ignore
    }
  }

  /**
   * Versión async de compact(). Misma semántica.
   */
  async compactAsync(): Promise<void> {
    this.cachedSet = null;
    const exists = await pathExists(this.indexPath);
    if (!exists) return;

    const content = await readTextFile(this.indexPath);
    if (content === null) return;

    const lines = content.split("\n");
    const seen = new Set<string>();
    const deduped: string[] = [];

    for (const line of lines) {
      if (line.trim() === "") continue;
      try {
        const filename = JSON.parse(line);
        if (typeof filename === "string" && filename !== "" && !seen.has(filename)) {
          seen.add(filename);
          deduped.push(JSON.stringify(filename));
        }
      } catch {
        // skip malformed
      }
    }

    await writeTextFile(
      this.indexPath,
      deduped.join("\n") + (deduped.length > 0 ? "\n" : ""),
    );
  }

  /**
   * Verifica si necesita compactación por tamaño.
   */
  needsCompaction(): boolean {
    if (!existsSync(this.indexPath)) return false;
    try {
      const { statSync } = require("node:fs") as typeof import("node:fs");
      return statSync(this.indexPath).size > this.maxSizeBytes;
    } catch {
      return false;
    }
  }

  /**
   * Invalida el cache en memoria.
   */
  invalidateCache(): void {
    this.cachedSet = null;
  }

  /**
   * Resetea completamente el índice.
   */
  reset(): void {
    if (existsSync(this.indexPath)) {
      try {
        const tmp = `${this.indexPath}.${process.pid}.tmp`;
        writeFileSync(tmp, "", "utf8");
        renameSync(tmp, this.indexPath);
      } catch {
        // ignore
      }
    }
    this.cachedSet = new Set();
  }

  /**
   * Versión async de reset(). El rename atómico se mantiene sync dentro
   * del async porque es la única operación que requiere atomicidad.
   */
  async resetAsync(): Promise<void> {
    const exists = await pathExists(this.indexPath);
    if (exists) {
      try {
        const tmp = `${this.indexPath}.${process.pid}.tmp`;
        await writeTextFile(tmp, "");
        renameSync(tmp, this.indexPath);
      } catch {
        // ignore
      }
    }
    this.cachedSet = new Set();
  }

  private getDirectory(): string {
    const { dirname } = require("node:path") as typeof import("node:path");
    return dirname(this.indexPath);
  }
}
