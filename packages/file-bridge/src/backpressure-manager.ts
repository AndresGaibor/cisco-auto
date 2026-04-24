/**
 * Backpressure Manager para la cola de comandos.
 *
 * Implementa un algoritmo de "ventana deslizante" que limita la cantidad
 * máxima de comandos pending (en cola + in-flight) para evitar que PT se
 * sature. Cuando se alcanza el límite, se lanza BackpressureError o se
 * bloquea hasta que haya capacidad disponible.
 *
 * Algoritmo:
 * 1. getPendingCount() = count(commands/*.json) + count(in-flight/*.json)
 * 2. checkCapacity() lanza error si pending >= maxPending
 * 3. waitForCapacity() hace polling con exponential backoff hasta timeout
 *
 * El threshold es configurable para ajustar según la capacidad de PT.
 */
import { readdirSync } from "node:fs";
import type { BridgePathLayout } from "./shared/path-layout.js";

/**
 * Configuración para el BackpressureManager.
 */
export interface BackpressureConfig {
  /** Maximum number of pending commands (commands + in-flight) */
  maxPending: number;
  /** How often to check queue size (ms) */
  checkIntervalMs: number;
  /** Maximum time to wait for capacity (ms) */
  maxWaitMs: number;
}

export class BackpressureError extends Error {
  constructor(
    message: string,
    public readonly pendingCount: number,
    public readonly maxPending: number,
  ) {
    super(message);
    this.name = "BackpressureError";
  }
}

/**
 * Gestor de backpressure que previene saturación de la cola de comandos.
 */
export class BackpressureManager {
  private readonly config: Required<BackpressureConfig>;

  /**
   * @param paths - BridgePathLayout para acceder a los directorios de cola
   * @param config - Configuración opcional con maxPending, checkIntervalMs, maxWaitMs
   */
  constructor(
    private readonly paths: BridgePathLayout,
    config: Partial<BackpressureConfig> = {},
  ) {
    this.config = {
      maxPending: config.maxPending ?? 100,
      checkIntervalMs: config.checkIntervalMs ?? 100,
      maxWaitMs: config.maxWaitMs ?? 30_000,
    };
  }

  /**
   * Verifica si hay capacidad disponible en la cola.
   * Lanza BackpressureError si pending >= maxPending.
   * @throws BackpressureError cuando la cola está llena
   */
  checkCapacity(): void {
    const pending = this.getPendingCount();
    if (pending >= this.config.maxPending) {
      throw new BackpressureError(
        `Command queue full: ${pending}/${this.config.maxPending} pending. ` +
          `Wait for PT to process commands before sending more.`,
        pending,
        this.config.maxPending,
      );
    }
  }

  /**
   * Bloquea hasta que haya capacidad disponible o expire el timeout.
   * Usa polling con intervalo configurable para revisar la cola.
   * @param timeoutMs - Tiempo máximo de espera (default: maxWaitMs de config)
   * @returns Promise que resuelve cuando hay capacidad
   * @throws BackpressureError si expira el timeout
   */
  async waitForCapacity(timeoutMs?: number): Promise<void> {
    const deadline = Date.now() + (timeoutMs ?? this.config.maxWaitMs);

    while (Date.now() < deadline) {
      const pending = this.getPendingCount();

      if (pending < this.config.maxPending) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, this.config.checkIntervalMs));
    }

    const pending = this.getPendingCount();
    throw new BackpressureError(
      `Timeout waiting for command queue capacity after ${timeoutMs ?? this.config.maxWaitMs}ms. ` +
        `Queue has ${pending}/${this.config.maxPending} pending commands.`,
      pending,
      this.config.maxPending,
    );
  }

  /**
   * Cuenta comandos pending = comandos en cola + comandos in-flight.
   * Excluye _queue.json (índice auxiliar).
   * @returns Cantidad total de comandos en proceso
   */
  getPendingCount(): number {
    try {
      const commandsDir = this.paths.commandsDir();
      const inFlightDir = this.paths.inFlightDir();

      const commands = readdirSync(commandsDir).filter(
        (f) => f.endsWith(".json") && f !== "_queue.json",
      ).length;
      const inFlight = readdirSync(inFlightDir).filter(
        (f) => f.endsWith(".json") && f !== "_queue.json",
      ).length;

      return commands + inFlight;
    } catch {
      return 0;
    }
  }

  /**
   * Calcula cuántos comandos más se pueden enviar sin backpressure.
   * @returns Cantidad de slots disponibles (mínimo 0)
   */
  getAvailableCapacity(): number {
    const pending = this.getPendingCount();
    return Math.max(0, this.config.maxPending - pending);
  }

  /**
   * Obtiene métricas básicas de uso de la cola.
   * @returns Objeto con maxPending, currentPending, availableCapacity, utilizationPercent
   */
  getStats(): {
    maxPending: number;
    currentPending: number;
    availableCapacity: number;
    utilizationPercent: number;
  } {
    const pending = this.getPendingCount();
    return {
      maxPending: this.config.maxPending,
      currentPending: pending,
      availableCapacity: this.config.maxPending - pending,
      utilizationPercent: Math.round((pending / this.config.maxPending) * 100),
    };
  }

  /**
   * Obtiene métricas detalladas separando comandos en cola e in-flight.
   * Útil para debugging y monitoreo granular.
   * @returns Objeto detallado con métricas de ambos tipos de cola
   */
  getDetailedStats(): {
    maxPending: number;
    queuedCount: number;
    inFlightCount: number;
    totalPending: number;
    availableCapacity: number;
    utilizationPercent: number;
  } {
    try {
      const queuedCount = readdirSync(this.paths.commandsDir()).filter(
        (f) => f.endsWith(".json") && f !== "_queue.json",
      ).length;
      const inFlightCount = readdirSync(this.paths.inFlightDir()).filter(
        (f) => f.endsWith(".json") && f !== "_queue.json",
      ).length;
      const totalPending = queuedCount + inFlightCount;

      return {
        maxPending: this.config.maxPending,
        queuedCount,
        inFlightCount,
        totalPending,
        availableCapacity: Math.max(0, this.config.maxPending - totalPending),
        utilizationPercent: Math.round((totalPending / this.config.maxPending) * 100),
      };
    } catch {
      return {
        maxPending: this.config.maxPending,
        queuedCount: 0,
        inFlightCount: 0,
        totalPending: 0,
        availableCapacity: this.config.maxPending,
        utilizationPercent: 0,
      };
    }
  }
}
