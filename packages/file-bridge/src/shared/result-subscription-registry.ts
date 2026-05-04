/**
 * Registry de suscripciones para resultados de comandos.
 *
 * Gestiona el registro y desregistro de callbacks por commandId.
 * Mantiene un mapa de commandId -> Set<callback>.
 */
export class ResultSubscriptionRegistry {
  private callbacks = new Map<string, Set<() => void>>();
  private refCount = 0;

  /**
   * Registra un callback para un commandId.
   * Evita duplicados si la misma referencia de callback ya existe.
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
  }

  /**
   * Desregistra un callback específico.
   * Limpia entradas vacías.
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
  }

  /**
   * Notifica a todos los callbacks registrados para un commandId.
   * Los errores individuales no interrumpen la notificación de otros callbacks.
   */
  notify(commandId: string, onError?: (err: unknown) => void): void {
    const cbs = this.callbacks.get(commandId);
    if (!cbs || cbs.size === 0) return;

    for (const callback of cbs) {
      try {
        callback();
      } catch (err) {
        if (onError) onError(err);
      }
    }
  }

  /**
   * Obtiene todos los commandIds registrados.
   */
  getRegisteredCommandIds(): Set<string> {
    return new Set(this.callbacks.keys());
  }

  /**
   * Verifica si hay callbacks para un commandId específico.
   */
  hasCallbacks(commandId: string): boolean {
    const cbs = this.callbacks.get(commandId);
    return cbs !== undefined && cbs.size > 0;
  }

  /**
   * Retorna el número total de callbacks activos.
   */
  getListenerCount(): number {
    return this.refCount;
  }

  /**
   * Retorna el número de commandIds únicos registrados.
   */
  getCommandCount(): number {
    return this.callbacks.size;
  }

  /**
   * Limpia todos los registros y recursos.
   */
  clear(): void {
    this.callbacks.clear();
    this.refCount = 0;
  }
}