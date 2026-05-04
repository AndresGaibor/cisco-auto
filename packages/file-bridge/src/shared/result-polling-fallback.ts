import { existsSync } from "node:fs";
import { ResultPathResolver } from "./result-path-resolver.js";

/**
 * Polling fallback para detectar resultados cuando fs.watch falla.
 *
 * A diferencia del scan global, este polling solo verifica archivos
 * específicos para los commandIds registrados.
 * Usa un set de seenFiles para evitar duplicar notificaciones.
 */
export class ResultPollingFallback {
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private seenFiles = new Set<string>();

  constructor(
    private readonly pathResolver: ResultPathResolver,
    private readonly subscribedCommandIds: Set<string>,
    private readonly onResult: (commandId: string) => void
  ) {}

  /**
   * Inicia el polling con el intervalo especificado.
   */
  start(intervalMs: number = 100): void {
    if (this.pollTimer) return;

    this.pollTimer = setInterval(() => {
      this.poll();
    }, intervalMs);

    if (typeof this.pollTimer.unref === "function") {
      this.pollTimer.unref();
    }
  }

  /**
   * Detiene el polling.
   */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * poll hace una verificación enfocada: solo archivos de commandIds suscritos.
   * No escanea el directorio completo.
   */
  poll(): void {
    for (const commandId of this.subscribedCommandIds) {
      const fullPath = this.pathResolver.resolve(commandId);

      if (!existsSync(fullPath)) {
        continue;
      }

      if (this.seenFiles.has(fullPath)) {
        continue;
      }

      this.seenFiles.add(fullPath);
      this.onResult(commandId);
    }
  }

  /**
   * Verifica si un archivo ya fue visto.
   */
  hasSeen(fullPath: string): boolean {
    return this.seenFiles.has(fullPath);
  }

  /**
   * Marca un archivo como visto (para dedup con fs.watch).
   */
  markSeen(fullPath: string): void {
    this.seenFiles.add(fullPath);
  }

  /**
   * Limpia el estado de archivos vistos.
   */
  resetSeen(): void {
    this.seenFiles.clear();
  }

  /**
   * Actualiza el set de commandIds suscritos (para cuando registry cambia).
   */
  updateSubscribedCommandIds(ids: Set<string>): void {
    this.subscribedCommandIds.clear();
    for (const id of ids) {
      this.subscribedCommandIds.add(id);
    }
  }
}