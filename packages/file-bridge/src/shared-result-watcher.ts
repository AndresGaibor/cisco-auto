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
import { isFsSidecarFile } from "./shared/bridge-file-classifier.js";
import { ResultPathResolver } from "./shared/result-path-resolver.js";
import { ResultSubscriptionRegistry } from "./shared/result-subscription-registry.js";
import { ResultPollingFallback } from "./shared/result-polling-fallback.js";

/**
 * Watcher compartido que multiplexa notificaciones de archivos de resultado.
 *
 * Evita agotamiento de file descriptors al crear un único fs.watch()
 * que sirve a múltiples commandIds. Pattern pub/sub con cleanup automático.
 */
export class SharedResultWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private readonly registry: ResultSubscriptionRegistry;
  private readonly pathResolver: ResultPathResolver;
  private pollingFallback: ResultPollingFallback | null = null;
  private readonly seenFiles = new Set<string>();
  private watching = false;

  /**
   * @param resultsDir - Directorio donde se escriben los resultados (results/)
   */
  constructor(resultsDir: string) {
    super();
    this.registry = new ResultSubscriptionRegistry();
    this.pathResolver = new ResultPathResolver(resultsDir);
  }

  /**
   * Registra un callback para ser notificado cuando aparezca el resultado de un comando.
   * Inicia el watcher lazily si es el primer registro.
   *
   * @param commandId - ID del comando (sin extensión)
   * @param callback - Función a llamar cuando el archivo de resultado aparezca
   */
  watch(commandId: string, callback: () => void): void {
    this.registry.watch(commandId, callback);

    if (this.pollingFallback) {
      this.refreshPollingSubscriptions();
    }

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
    this.registry.unwatch(commandId, callback);

    if (this.registry.getListenerCount() === 0 && this.watching) {
      this.stopWatcher();
      return;
    }

    this.refreshPollingSubscriptions();
  }

  /**
   * Notifica a todos los callbacks registrados para un commandId.
   * Los errores en callbacks individuales se emitén como eventos de error
   * pero no interrumpen la notificación de otros callbacks.
   *
   * @param commandId - ID del comando cuyos listeners deben ser notificados
   */
  private notify(commandId: string): void {
    if (!this.registry.hasCallbacks(commandId)) return;

    this.registry.notify(commandId, (err) => this.emitCallbackError(err));
  }

  /**
   * Inicia el fs.watch del directorio de resultados.
   * Filtra solo archivos .json y extrae el commandId del nombre.
   * Ignora sidecars para evitar notificaciones espurias.
   */
  private startWatching(): void {
    if (this.watcher) return;

    this.watching = true;

    try {
      this.watcher = watch(this.pathResolver["resultsDir"], (_eventType, filename) => {
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
    this.registry.clear();
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
    if (this.pollingFallback) return;

    const commandIds = this.registry.getRegisteredCommandIds();

    this.pollingFallback = new ResultPollingFallback(
      this.pathResolver,
      commandIds,
      (commandId) => this.notify(commandId)
    );

    this.pollingFallback.start(100);
  }

  private stopPollingFallback(): void {
    if (this.pollingFallback) {
      this.pollingFallback.stop();
      this.pollingFallback = null;
    }
  }

  private refreshPollingSubscriptions(): void {
    if (!this.pollingFallback) return;

    this.pollingFallback.updateSubscribedCommandIds(this.registry.getRegisteredCommandIds());
  }

  /**
   * scanResultsDir hace un scan enfocado: solo archivos de commandIds suscritos.
   * No itera sobre todos los archivos del directorio.
   */
  private scanResultsDir(): void {
    if (!existsSync(this.pathResolver["resultsDir"])) {
      return;
    }

    const subscribedIds = this.registry.getRegisteredCommandIds();
    if (subscribedIds.size === 0) return;

    let files: string[] = [];

    try {
      files = readdirSync(this.pathResolver["resultsDir"]);
    } catch {
      return;
    }

    const relevantFiles = this.pathResolver.filterResultsForCommands(files, subscribedIds);

    for (const file of relevantFiles) {
      const fullPath = join(this.pathResolver["resultsDir"], file);

      if (!existsSync(fullPath)) {
        continue;
      }

      if (this.seenFiles.has(fullPath)) {
        continue;
      }

      this.seenFiles.add(fullPath);

      if (this.pollingFallback) {
        this.pollingFallback.markSeen(fullPath);
      }

      const commandId = this.pathResolver.extractCommandId(file);
      if (commandId) {
        this.notify(commandId);
      }
    }
  }

  /**
   * handleMaybeResult filtra sidecars y usa seenFiles para evitar duplicados.
   */
  private handleMaybeResult(filename: string): void {
    if (!filename.endsWith(".json")) return;
    if (isFsSidecarFile(filename)) return;

    const fullPath = join(this.pathResolver["resultsDir"], filename);

    if (this.seenFiles.has(fullPath)) {
      return;
    }

    this.seenFiles.add(fullPath);

    if (this.pollingFallback) {
      this.pollingFallback.markSeen(fullPath);
    }

    const commandId = this.pathResolver.extractCommandId(filename);
    if (commandId) {
      this.notify(commandId);
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
    this.registry.clear();
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
      listenersCount: this.registry.getListenerCount(),
      commandsWatched: this.registry.getCommandCount(),
    };
  }
}