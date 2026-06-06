/**
 * BridgeAutoRecovery - Detecta y recupera automáticamente cuando el bridge IPC
 * de Packet Tracer se cuelga o no responde.
 *
 * Estrategia:
 * - Monitorea latencia de polls (samples de los últimos N polls).
 * - Si latencia > STUCK_THRESHOLD_MS por más de STUCK_CONSECUTIVE_POLLS polls consecutivos,
 *   considera el bridge "stuck".
 * - Intenta recuperación automática: notifica a través de un callback.
 *   La lógica de recuperación real (reiniciar controller, etc.) es responsabilidad
 *   del caller.
 */

export type RecoveryTrigger = "stuck" | "fatal" | "frequent_failures";

export interface BridgeAutoRecoveryOptions {
  stuckThresholdMs?: number;
  stuckConsecutivePolls?: number;
  failureRateThreshold?: number;
  minSamples?: number;
  cooldownMs?: number;
  onRecoveryNeeded: (trigger: RecoveryTrigger, details: string) => Promise<void> | void;
}

export interface BridgeRecoveryState {
  lastTrigger: RecoveryTrigger | null;
  lastTriggerAt: number | null;
  consecutiveStuckPolls: number;
  recentFailures: number;
  totalSamples: number;
  inCooldown: boolean;
  cooldownUntilMs: number | null;
}

export class BridgeAutoRecovery {
  private consecutiveStuckPolls = 0;
  private recentFailures = 0;
  private totalSamples = 0;
  private lastTriggerAt: number | null = null;
  private lastTrigger: RecoveryTrigger | null = null;
  private cooldownUntilMs: number | null = null;

  private readonly stuckThresholdMs: number;
  private readonly stuckConsecutivePolls: number;
  private readonly failureRateThreshold: number;
  private readonly minSamples: number;
  private readonly cooldownMs: number;
  private readonly onRecoveryNeeded: NonNullable<BridgeAutoRecoveryOptions["onRecoveryNeeded"]>;

  constructor(opts: BridgeAutoRecoveryOptions) {
    this.stuckThresholdMs = opts.stuckThresholdMs ?? 5000;
    this.stuckConsecutivePolls = opts.stuckConsecutivePolls ?? 3;
    this.failureRateThreshold = opts.failureRateThreshold ?? 0.5;
    this.minSamples = opts.minSamples ?? 5;
    this.cooldownMs = opts.cooldownMs ?? 30_000;
    this.onRecoveryNeeded = opts.onRecoveryNeeded;
  }

  async recordPoll(latencyMs: number, success: boolean): Promise<void> {
    this.totalSamples++;

    if (success) {
      this.recentFailures = Math.max(0, this.recentFailures - 1);

      if (latencyMs > this.stuckThresholdMs) {
        this.consecutiveStuckPolls++;
        if (this.consecutiveStuckPolls >= this.stuckConsecutivePolls) {
          await this.trigger("stuck", `Bridge atascado: ${this.consecutiveStuckPolls} polls consecutivos > ${this.stuckThresholdMs}ms`);
        }
      } else {
        this.consecutiveStuckPolls = 0;
      }
    } else {
      this.recentFailures++;
      if (this.totalSamples >= this.minSamples) {
        const failureRate = this.recentFailures / this.totalSamples;
        if (failureRate >= this.failureRateThreshold) {
          await this.trigger("frequent_failures", `Tasa de fallos ${(failureRate * 100).toFixed(1)}% (${this.recentFailures}/${this.totalSamples})`);
        }
      }
    }
  }

  async triggerFatal(details: string): Promise<void> {
    await this.trigger("fatal", details);
  }

  getState(): BridgeRecoveryState {
    return {
      lastTrigger: this.lastTrigger,
      lastTriggerAt: this.lastTriggerAt,
      consecutiveStuckPolls: this.consecutiveStuckPolls,
      recentFailures: this.recentFailures,
      totalSamples: this.totalSamples,
      inCooldown: this.isInCooldown(),
      cooldownUntilMs: this.cooldownUntilMs,
    };
  }

  reset(): void {
    this.consecutiveStuckPolls = 0;
    this.recentFailures = 0;
    this.totalSamples = 0;
    this.lastTrigger = null;
    this.lastTriggerAt = null;
    this.cooldownUntilMs = null;
  }

  private isInCooldown(): boolean {
    if (this.cooldownUntilMs === null) return false;
    return Date.now() < this.cooldownUntilMs;
  }

  private async trigger(trigger: RecoveryTrigger, details: string): Promise<void> {
    if (this.isInCooldown()) return;

    this.lastTrigger = trigger;
    this.lastTriggerAt = Date.now();
    this.cooldownUntilMs = Date.now() + this.cooldownMs;

    try {
      await this.onRecoveryNeeded(trigger, details);
    } catch {
      // Ignorar errores del callback para no propagar al llamador
    }
  }
}
