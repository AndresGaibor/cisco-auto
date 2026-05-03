/**
 * Watcher compartido para archivos de resultado.
 *
 * Evita el agotamiento de file descriptors creando UN SOLO fs.watch
 * en lugar de uno por cada sendCommandAndWait(). Múltiples listeners
 * se registran por commandId y son notificados cuando el watcher
 * detecta cambios en el directorio de resultados.
 *
 * Algoritmo de watching:
 * 1. SharedResultWatcher mantiene un Map<commandId, Set<callback>>
 * 2. El primer registro inicia el watcher del directorio results/
 * 3. Cuando un archivo .json aparece, se extrae el commandId y se
 *    notifica a todos los callbacks registrados
 * 4. El último unwatch detiene el watcher para liberar recursos
 *
 * El watcher es lazy: solo se crea cuando hay listeners activos y
 * se destruye cuando no queda ninguno.
 */
import { existsSync, readdirSync, watch, type FSWatcher } from "node:fs";
import { EventEmitter } from "node:events";
import { join } from "node:path";

/**
 * Watcher compartido que multiplexa notificaciones de archivos de resultado.
 *
 * Evita agotamiento de file descriptors al crear un único fs.watch()
 * que sirve a múltiples commandIds. Pattern pub/sub con cleanup automático.
 */
export class SharedResultWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private seenFiles = new Set<string>();
  private callbacks = new Map<string, Set<() => void>>();
  private refCount = 0;
  private watching = false;

  /**
   * @param resultsDir - Directorio donde se escriben los resultados (results/)
   */
  constructor(private readonly resultsDir: string) {
    super();
  }

  /**
   * Registra un callback para ser notificado cuando aparezca el resultado de un comando.
   * Inicia el watcher lazily si es el primer registro.
   *
   * @param commandId - ID del comando (sin extensión)
   * @param callback - Función a llamar cuando el archivo de resultado aparezca
   */
  watch(commandId: string, callback: () => void): void {
    if (!this.callbacks.has(commandId)) {
      this.callbacks.set(commandId, new Set());
    } else {
      const existing = this.callbacks.get(commandId)!;
      if (existing.has(callback)) {
        return;
      }
    }

    this.callbacks.get(commandId)!.add(callback);
    this.refCount++;

    if (!this.watching) {
      this.startWatching();
    }
  }

  /**
   * Desregistra un callback. Si no quedan callbacks para un commandId,
   * se limpia la entrada. Si no quedan listeners activos, se detiene el watcher.
   *
   * @param commandId - ID del comando
   * @param callback - Referencia exacta del callback a remover
   */
  unwatch(commandId: string, callback: () => void): void {
    const cbs = this.callbacks.get(commandId);
    if (!cbs) return;

    if (cbs.delete(callback)) {
      this.refCount--;
    }

    if (cbs.size === 0) {
      this.callbacks.delete(commandId);
    }

    if (this.refCount === 0 && this.watching) {
      this.stopWatcher();
    }
  }

  /**
   * Notifica a todos los callbacks registrados para un commandId.
   * Los errores en callbacks individuales se emitén como eventos de error
   * pero no interrumpen la notificación de otros callbacks.
   *
   * @param commandId - ID del comando cuyos listeners deben ser notificados
   */
  private notify(commandId: string): void {
    const cbs = this.callbacks.get(commandId);
    if (!cbs) return;

    for (const callback of cbs) {
      try {
        callback();
      } catch (err) {
        this.emitCallbackError(err);
      }
    }
  }

  /**
   * Inicia el fs.watch del directorio de resultados.
   * Filtra solo archivos .json y extrae el commandId del nombre.
   */
  private startWatching(): void {
    if (this.watcher) return;

    this.watching = true;

    try {
      this.watcher = watch(this.resultsDir, (_eventType, filename) => {
        if (filename) {
          this.handleMaybeResult(String(filename));
        } else {
          this.scanResultsDir();
        }
      });

      this.watcher.on("error", (err) => {
        this.emit("error", err);
        this.stopFsWatcherOnly();
        this.startPollingFallback();
      });
    } catch (err) {
      this.emit("error", err);
    }

    this.startPollingFallback();
  }

  /**
   * Detiene y cierra el watcher de forma segura.
   */
  private stopWatcher(): void {
    this.stopFsWatcherOnly();
    this.stopPollingFallback();
    this.watching = false;
    this.seenFiles.clear();
  }

  private stopFsWatcherOnly(): void {
    if (this.watcher) {
      try {
        this.watcher.close();
      } catch {
        // Ignore close errors
      }
      this.watcher = null;
    }
  }

  private startPollingFallback(): void {
    if (this.pollTimer) return;

    this.pollTimer = setInterval(() => {
      this.scanResultsDir();
    }, 100);

    if (typeof this.pollTimer.unref === "function") {
      this.pollTimer.unref();
    }
  }

  private stopPollingFallback(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private scanResultsDir(): void {
    if (!existsSync(this.resultsDir)) {
      return;
    }

    let files: string[] = [];

    try {
      files = readdirSync(this.resultsDir).filter((file) => file.endsWith(".json"));
    } catch {
      return;
    }

    for (const file of files) {
      const fullPath = join(this.resultsDir, file);

      if (!existsSync(fullPath)) {
        continue;
      }

      this.handleMaybeResult(file);
    }
  }

  private handleMaybeResult(filename: string): void {
    if (!filename.endsWith(".json")) return;

    if (this.seenFiles.has(filename)) {
      return;
    }

    this.seenFiles.add(filename);

    const commandId = filename.slice(0, -5);
    const callbacks = this.callbacks.get(commandId);

    if (!callbacks || callbacks.size === 0) return;

    for (const callback of [...callbacks]) {
      try {
        callback();
      } catch (error) {
        this.emitCallbackError(error);
      }
    }
  }

  private emitCallbackError(error: unknown): void {
    if (this.listenerCount("error") > 0) {
      this.emit("error", error);
    }

    this.emit("callback-error", error);
  }

  /**
   * Libera todos los recursos: cierra watcher, limpia callbacks y listeners.
   * Llamar antes de descartar la instancia.
   */
  destroy(): void {
    this.stopWatcher();
    this.callbacks.clear();
    this.refCount = 0;
    this.removeAllListeners();
  }

  /**
   * Obtiene estadísticas de diagnóstico del watcher.
   * @returns Estado actual del watcher y contadores
   */
  getStats(): {
    watching: boolean;
    listenersCount: number;
    commandsWatched: number;
  } {
    return {
      watching: this.watching,
      listenersCount: this.refCount,
      commandsWatched: this.callbacks.size,
    };
  }
}
