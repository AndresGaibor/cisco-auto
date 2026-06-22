import type { BridgeCommandEnvelope } from "../shared/protocol.js";

/**
 * Entrada del journal de rollback.
 */
interface RollbackEntry {
  cmdId: string;
  reverseCommand: BridgeCommandEnvelope;
  recordedAt: number;
}

/**
 * Gestor de rollback para comandos reversibles.
 *
 * Mantiene un journal de operaciones inversas para poder deshacer
 * comandos ejecutados. El rollback real depende del tipo de comando —
 * cada comando reversible debe incluir su comando inverso en el campo
 * `reverseCommand` del envelope original.
 *
 * Uso:
 * ```typescript
 * const rollbackMgr = new RollbackManager(100);
 *
 * // Registrar comando reversible
 * rollbackMgr.record(cmdId, reverseEnvelope);
 *
 * // Obtener último comando reversible sin ejecutar
 * const last = rollbackMgr.getLastReverse();
 *
 * // Ejecutar rollback del último comando
 * const ok = await rollbackMgr.rollback();
 * ```
 */
export class RollbackManager {
  private readonly journal: RollbackEntry[] = [];
  private readonly maxEntries: number;

  /**
   * @param maxEntries - Máximo de entradas en el journal (default 100).
   *                     Cuando se excede, se elimina la entrada más antigua.
   */
  constructor(maxEntries: number = 100) {
    this.maxEntries = maxEntries;
  }

  /**
   * Registra una operación para rollback potencial.
   *
   * @param cmdId - ID del comando original
   * @param reverseCommand - Envelope del comando inverso a ejecutar en rollback
   */
  record(cmdId: string, reverseCommand: BridgeCommandEnvelope): void {
    this.journal.push({ cmdId, reverseCommand, recordedAt: Date.now() });
    if (this.journal.length > this.maxEntries) {
      this.journal.shift();
    }
  }

  /**
   * Obtiene el último comando reversible sin ejecutarlo.
   *
   * @returns El envelope del comando inverso o null si no hay entradas
   */
  getLastReverse(): BridgeCommandEnvelope | null {
    const entry = this.journal[this.journal.length - 1];
    return entry?.reverseCommand ?? null;
  }

  /**
   * Obtiene el ID del último comando registrado.
   *
   * @returns El cmdId o null si no hay entradas
   */
  getLastCmdId(): string | null {
    const entry = this.journal[this.journal.length - 1];
    return entry?.cmdId ?? null;
  }

  /**
   * Ejecuta rollback del último comando.
   *
   * Nota: La ejecución del comando inverso debe delegarse al caller.
   * Este método solo remueve la entrada del journal.
   *
   * @returns true si se ejecutó rollback, false si no había nada que deshacer
   */
  async rollback(): Promise<boolean> {
    const last = this.getLastReverse();
    if (!last) return false;
    this.journal.pop();
    return true;
  }

  /**
   * Remueve una entrada específica del journal por cmdId.
   *
   * @param cmdId - ID del comando a remover
   * @returns true si se encontró y removió la entrada
   */
  forget(cmdId: string): boolean {
    const index = this.journal.findIndex((e) => e.cmdId === cmdId);
    if (index === -1) return false;
    this.journal.splice(index, 1);
    return true;
  }

  /**
   * Limpia todo el journal de rollback.
   */
  clear(): void {
    this.journal.length = 0;
  }

  /**
   * Retorna el número de entradas actuales en el journal.
   */
  get size(): number {
    return this.journal.length;
  }

  /**
   * Verifica si hay comandos pendientes de rollback.
   */
  get hasPending(): boolean {
    return this.journal.length > 0;
  }
}
