/**
 * ReaddirCache - Caché con TTL para listados de directorios.
 *
 * Reduce I/O del filesystem cuando hay múltiples lectores concurrentes
 * (CLI, watchers, diagnostics) consultando el mismo directorio repetidamente.
 *
 * Diseño:
 * - TTL por entrada (default 100ms)
 * - Invalidación explícita vía `invalidate()`
 * - Invalidación implícita al pasar ttlMs=0
 * - Thread-safe para single-threaded Node.js (sin locks)
 *
 * NO usar para directorios que cambian rápidamente y donde la freshness
 * es crítica (ej: in-flight/). Ideal para commands/, results/, dead-letter/
 * donde las operaciones de listado son frecuentes y los cambios son graduales.
 */

export interface ReaddirCacheOptions {
  /** TTL en ms. 0 desactiva el cache. Default: 100ms. */
  ttlMs?: number;
  /** Filtrar archivos por extensión (ej: ".json"). Si no se da, retorna todos. */
  extension?: string;
  /** Función de filtrado personalizada. */
  filter?: (filename: string) => boolean;
  /** Función para listar el directorio (default: fs.readdirSync). */
  reader?: (dir: string) => string[];
  /** Función para stat del directorio (default: fs.statSync). */
  stat?: (dir: string) => { mtimeMs: number };
}

interface CacheEntry {
  files: string[];
  expiresAt: number;
  mtimeMs: number;
  hitCount: number;
}

export class ReaddirCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;
  private readonly extension: string | null;
  private readonly filter: ((filename: string) => boolean) | null;
  private readonly reader: (dir: string) => string[];
  private readonly stat: (dir: string) => { mtimeMs: number };

  private totalHits = 0;
  private totalMisses = 0;
  private lastCallWasHit = false;

  constructor(opts: ReaddirCacheOptions = {}) {
    this.ttlMs = opts.ttlMs ?? 100;
    this.extension = opts.extension ?? null;
    this.filter = opts.filter ?? null;
    this.reader = opts.reader ?? this.defaultReader;
    this.stat = opts.stat ?? this.defaultStat;
  }

  /**
   * Lista los archivos del directorio. Usa cache si está disponible y fresco.
   *
   * Freshness = (TTL válido) OR (mtimeMs del directorio no cambió desde la última lectura).
   *
   * Optimización clave: en el caso hot path (TTL vigente) NO se hace stat,
   * solo se retorna el cache. El stat+mtime-check solo se activa cuando el
   * TTL expiró, permitiendo al cache seguir siendo útil incluso más allá
   * del TTL si el directorio no cambió.
   */
  list(dir: string): string[] {
    if (this.ttlMs <= 0) {
      this.lastCallWasHit = false;
      return this.readFromDisk(dir);
    }

    const now = Date.now();
    const entry = this.cache.get(dir);

    // Hot path: TTL vigente → retorna cache sin stat
    if (entry && entry.expiresAt > now) {
      entry.hitCount++;
      this.totalHits++;
      this.lastCallWasHit = true;
      return entry.files;
    }

    // TTL expirado o sin entry: hacer stat para chequear mtime antes de leer disco
    const currentMtime = this.statDirectory(dir);

    if (entry && entry.mtimeMs === currentMtime) {
      // mtime no cambió: refrescar TTL y retornar cache sin leer disco
      entry.expiresAt = now + this.ttlMs;
      entry.hitCount++;
      this.totalHits++;
      this.lastCallWasHit = true;
      return entry.files;
    }

    // Cache stale: leer del disco y actualizar entry
    this.totalMisses++;
    this.lastCallWasHit = false;
    const files = this.readFromDisk(dir);
    this.cache.set(dir, {
      files,
      expiresAt: now + this.ttlMs,
      mtimeMs: currentMtime,
      hitCount: 0,
    });
    return files;
  }

  /**
   * Invalida la entrada de cache para un directorio específico.
   * Usar cuando sabemos que el contenido cambió (ej: después de un write).
   */
  invalidate(dir: string): void {
    this.cache.delete(dir);
  }

  /**
   * Invalida todas las entradas del cache.
   */
  invalidateAll(): void {
    this.cache.clear();
  }

  /**
   * Retorna el mtimeMs del directorio conocido por el cache, o null si nunca se leyó.
   *
   * Útil para optimistic locking: si el caller recuerda el mtime de la última
   * lectura y este no cambió, puede saltarse la iteración completa.
   */
  getDirectoryMtime(dir: string): number | null {
    const entry = this.cache.get(dir);
    return entry ? entry.mtimeMs : null;
  }

  /**
   * Indica si hay una entrada fresca (TTL vigente) en el cache para el directorio.
   */
  hasFreshEntry(dir: string): boolean {
    const entry = this.cache.get(dir);
    if (!entry) return false;
    return entry.expiresAt > Date.now();
  }

  /**
   * Indica si la última llamada a list() retornó un cache hit.
   *
   * Útil para métricas: distingue entre "el cache sirvió el listado" y
   * "tuvimos que ir al disco porque el mtime cambió o expiró el TTL".
   */
  wasLastCallCached(): boolean {
    return this.lastCallWasHit;
  }

  /**
   * Limpia entradas expiradas del cache para evitar memory leaks.
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [dir, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        this.cache.delete(dir);
        pruned++;
      }
    }
    return pruned;
  }

  getStats(): {
    entries: number;
    totalHits: number;
    totalMisses: number;
    hitRate: number;
  } {
    const total = this.totalHits + this.totalMisses;
    return {
      entries: this.cache.size,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      hitRate: total > 0 ? this.totalHits / total : 0,
    };
  }

  /**
   * Atajo: invalidar y re-leer (fresh value).
   */
  refresh(dir: string): string[] {
    this.invalidate(dir);
    return this.list(dir);
  }

  private readFromDisk(dir: string): string[] {
    let files: string[];
    try {
      files = this.reader(dir);
    } catch {
      return [];
    }

    if (this.extension) {
      files = files.filter((f) => f.endsWith(this.extension!));
    }
    if (this.filter) {
      files = files.filter(this.filter);
    }
    return files;
  }

  private statDirectory(dir: string): number {
    try {
      return this.stat(dir).mtimeMs;
    } catch {
      return -1;
    }
  }

  private defaultReader(dir: string): string[] {
    const { readdirSync } = require("node:fs") as typeof import("node:fs");
    return readdirSync(dir);
  }

  private defaultStat(dir: string): { mtimeMs: number } {
    const { statSync } = require("node:fs") as typeof import("node:fs");
    return statSync(dir);
  }
}
