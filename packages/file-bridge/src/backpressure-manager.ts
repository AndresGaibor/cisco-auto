/**
 * Backpressure manager for command queue.
 *
 * Prevents the queue from growing unbounded by tracking
 * pending commands and blocking when capacity is reached.
 */
import { readdirSync } from "node:fs";
import type { BridgePathLayout } from "./shared/path-layout.js";

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

export class BackpressureManager {
  private readonly config: Required<BackpressureConfig>;

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

  async waitForCapacity(timeoutMs?: number): Promise<void> {
    const deadline = Date.now() + (timeoutMs ?? this.config.maxWaitMs);

    while (Date.now() < deadline) {
      const pending = this.getPendingCount();

      if (pending < this.config.maxPending) {
        return;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, this.config.checkIntervalMs)
      );
    }

    const pending = this.getPendingCount();
    throw new BackpressureError(
      `Timeout waiting for command queue capacity after ${timeoutMs ?? this.config.maxWaitMs}ms. ` +
      `Queue has ${pending}/${this.config.maxPending} pending commands.`,
      pending,
      this.config.maxPending,
    );
  }

  getPendingCount(): number {
    try {
      const commandsDir = this.paths.commandsDir();
      const inFlightDir = this.paths.inFlightDir();

      const commands = readdirSync(commandsDir)
        .filter((f) => f.endsWith(".json")).length;
      const inFlight = readdirSync(inFlightDir)
        .filter((f) => f.endsWith(".json")).length;

      return commands + inFlight;
    } catch {
      return 0;
    }
  }

  getAvailableCapacity(): number {
    const pending = this.getPendingCount();
    return Math.max(0, this.config.maxPending - pending);
  }

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

  getDetailedStats(): {
    maxPending: number;
    queuedCount: number;
    inFlightCount: number;
    totalPending: number;
    availableCapacity: number;
    utilizationPercent: number;
  } {
    try {
      const queuedCount = readdirSync(this.paths.commandsDir())
        .filter((f) => f.endsWith(".json")).length;
      const inFlightCount = readdirSync(this.paths.inFlightDir())
        .filter((f) => f.endsWith(".json")).length;
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
