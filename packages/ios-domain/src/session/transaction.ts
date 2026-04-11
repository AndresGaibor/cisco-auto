/**
 * Transaction - Sistema de transacciones con rollback para comandos IOS
 * 
 * Permite agrupar comandos con sus comandos de rollback correspondientes,
 * ejecutarlos en orden y revertir en caso de error.
 */

import type { CommandHandler } from "./command-handler.js";

/**
 * Representa un comando individual dentro de una transacción
 */
export interface TransactionCommand {
  /** Comando a ejecutar */
  command: string;
  /** Comando de rollback para revertir este comando */
  rollbackCommand: string;
  /** Dispositivo objetivo (opcional) */
  deviceId?: string;
  /** Descripción del comando */
  description?: string;
}

/**
 * Entrada en el log de la transacción
 */
export interface TransactionLogEntry {
  /** Índice del comando en la transacción */
  index: number;
  /** Comando ejecutado */
  command: string;
  /** Estado de la ejecución */
  status: "pending" | "success" | "failed" | "rolled_back";
  /** Salida del comando (si está disponible) */
  output?: string;
  /** Error (si falló) */
  error?: string;
  /** Duración en milisegundos */
  durationMs?: number;
}

/**
 * Resultado de la ejecución de una transacción
 */
export interface TransactionResult {
  /** Indica si la transacción se completó exitosamente */
  success: boolean;
  /** Log completo de la ejecución */
  log: ReadonlyArray<TransactionLogEntry>;
  /** Comando en el que falló (si aplica) */
  failedAtIndex?: number;
}

/**
 * Clase Transaction - Agrupa comandos con rollback
 * 
 * Patrón: Unit of Work con soporte para compensación
 */
export class Transaction {
  private _commands: TransactionCommand[] = [];
  private _log: TransactionLogEntry[] = [];
  private _executed = false;
  private _rolledBack = false;

  /**
   * Agregar un comando con su rollback
   */
  add(command: string, rollbackCommand: string, options?: { deviceId?: string; description?: string }): this {
    this._commands.push({
      command,
      rollbackCommand,
      deviceId: options?.deviceId,
      description: options?.description,
    });
    return this;
  }

  /**
   * Agregar múltiples comandos en batch
   */
  addBatch(commands: TransactionCommand[]): this {
    for (const cmd of commands) {
      this._commands.push(cmd);
    }
    return this;
  }

  /**
   * Ejecutar todos los comandos en orden usando el session proporcionado
   * 
   * Si algún comando falla, lanza un error y deja la transacción en estado
   * parcialmente ejecutado. El caller debe llamar a rollback() para revertir.
   */
  async execute(session: CommandHandler): Promise<TransactionResult> {
    if (this._executed) {
      throw new Error("Transaction already executed");
    }
    if (this._commands.length === 0) {
      this._executed = true;
      return { success: true, log: [] };
    }

    this._executed = true;

    for (let i = 0; i < this._commands.length; i++) {
      const cmd = this._commands[i];
      const startTime = Date.now();

      this._log.push({
        index: i,
        command: cmd.command,
        status: "pending",
      });

      try {
        const result = await session.enterCommand(cmd.command);
        const durationMs = Date.now() - startTime;
        const output = typeof result[1] === "string" ? result[1] : String(result[1]);

        this._log[i] = {
          index: i,
          command: cmd.command,
          status: "success",
          output,
          durationMs,
        };
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        this._log[i] = {
          index: i,
          command: cmd.command,
          status: "failed",
          error: errorMessage,
          durationMs,
        };

        for (let j = i + 1; j < this._commands.length; j++) {
          this._log.push({
            index: j,
            command: this._commands[j].command,
            status: "pending",
          });
        }

        return {
          success: false,
          log: [...this._log],
          failedAtIndex: i,
        };
      }
    }

    return {
      success: true,
      log: [...this._log],
    };
  }

  /**
   * Revertir los comandos ejecutados en orden inverso
   * 
   * Solo hace rollback de los comandos que fueron exitosos.
   */
  async rollback(session: CommandHandler): Promise<TransactionResult> {
    if (!this._executed) {
      throw new Error("Transaction not executed yet");
    }
    if (this._rolledBack) {
      throw new Error("Transaction already rolled back");
    }

    this._rolledBack = true;

    // Obtener comandos exitosos en orden inverso
    const successfulCommands = [...this._log]
      .filter((entry) => entry.status === "success")
      .reverse();

    if (successfulCommands.length === 0) {
      return { success: true, log: [...this._log] };
    }

    for (const entry of successfulCommands) {
      const cmd = this._commands[entry.index];
      const startTime = Date.now();

      try {
        const result = await session.enterCommand(cmd.rollbackCommand);
        const durationMs = Date.now() - startTime;
        const output = typeof result[1] === "string" ? result[1] : String(result[1]);

        this._log[entry.index] = {
          ...entry,
          status: "rolled_back",
          output,
          durationMs: (entry.durationMs || 0) + durationMs,
        };
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        this._log[entry.index] = {
          ...entry,
          status: "failed",
          error: `Rollback failed: ${errorMessage}`,
          durationMs: (entry.durationMs || 0) + durationMs,
        };

        // Continuar con el rollback de los restantes a pesar del error
      }
    }

    return {
      success: this._log.every((e) => e.status !== "failed"),
      log: [...this._log],
    };
  }

  /**
   * Obtener el log de la transacción
   */
  getLog(): ReadonlyArray<TransactionLogEntry> {
    return [...this._log];
  }

  /**
   * Número de comandos en la transacción
   */
  get commandCount(): number {
    return this._commands.length;
  }

  /**
   * Indica si la transacción ya fue ejecutada
   */
  get isExecuted(): boolean {
    return this._executed;
  }

  /**
   * Indica si se hizo rollback
   */
  get isRolledBack(): boolean {
    return this._rolledBack;
  }

  /**
   * Comandos de la transacción
   */
  get commands(): ReadonlyArray<TransactionCommand> {
    return [...this._commands];
  }
}
