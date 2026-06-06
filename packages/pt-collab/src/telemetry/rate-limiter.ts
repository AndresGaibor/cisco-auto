/**
 * TokenBucketRateLimiter - Rate limiter basado en token bucket.
 *
 * Útil para evitar que un peer envíe una avalancha de deltas que saturen
 * al host o la red. Se diferencia del rate limiting clásico porque permite
 * picos cortos (bursts) hasta la capacidad del bucket.
 */

export interface TokenBucketOptions {
  /** Tokens máximos en el bucket (tamaño del burst). */
  capacity: number;
  /** Tokens regenerados por segundo. */
  refillRate: number;
  /** Tokens iniciales (default = capacity). */
  initialTokens?: number;
}

export interface RateLimiterStats {
  currentTokens: number;
  capacity: number;
  refillRate: number;
  totalConsumed: number;
  totalThrottled: number;
  averageWaitMs: number;
}

export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefillAt: number;
  private totalConsumed = 0;
  private totalThrottled = 0;
  private totalWaitMs = 0;

  private readonly capacity: number;
  private readonly refillRate: number;

  constructor(opts: TokenBucketOptions) {
    this.capacity = opts.capacity;
    this.refillRate = opts.refillRate;
    this.tokens = opts.initialTokens ?? opts.capacity;
    this.lastRefillAt = Date.now();
  }

  /**
   * Intenta consumir N tokens. Retorna el tiempo de espera en ms si está throttled,
   * o 0 si fue exitoso.
   */
  tryConsume(cost: number = 1): { allowed: boolean; waitMs: number } {
    this.refill();

    if (this.tokens >= cost) {
      this.tokens -= cost;
      this.totalConsumed += cost;
      return { allowed: true, waitMs: 0 };
    }

    const needed = cost - this.tokens;
    const waitMs = Math.ceil((needed / this.refillRate) * 1000);
    this.totalThrottled += cost;
    this.totalWaitMs += waitMs;

    return { allowed: false, waitMs };
  }

  /**
   * Bloquea hasta que haya tokens disponibles.
   */
  async acquire(cost: number = 1): Promise<void> {
    const result = this.tryConsume(cost);
    if (!result.allowed) {
      await new Promise((r) => setTimeout(r, result.waitMs));
      return this.acquire(cost);
    }
  }

  /**
   * Resetea el bucket a su capacidad máxima.
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefillAt = Date.now();
  }

  getStats(): RateLimiterStats {
    return {
      currentTokens: Math.floor(this.tokens),
      capacity: this.capacity,
      refillRate: this.refillRate,
      totalConsumed: this.totalConsumed,
      totalThrottled: this.totalThrottled,
      averageWaitMs: this.totalThrottled > 0 ? Math.round(this.totalWaitMs / this.totalThrottled) : 0,
    };
  }

  private refill(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefillAt;
    if (elapsedMs <= 0) return;

    const tokensToAdd = (elapsedMs / 1000) * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefillAt = now;
  }
}

/**
 * SlidingWindowRateLimiter - Rate limiter con ventana deslizante.
 * Más preciso que token bucket para limitar N acciones por periodo.
 */
export class SlidingWindowRateLimiter {
  private readonly timestamps: number[] = [];
  private totalThrottled = 0;
  private totalAllowed = 0;

  constructor(
    private readonly maxEvents: number,
    private readonly windowMs: number,
  ) {}

  tryAcquire(): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Limpiar timestamps fuera de la ventana
    while (this.timestamps.length > 0 && this.timestamps[0]! < windowStart) {
      this.timestamps.shift();
    }

    if (this.timestamps.length < this.maxEvents) {
      this.timestamps.push(now);
      this.totalAllowed++;
      return { allowed: true, retryAfterMs: 0 };
    }

    this.totalThrottled++;
    const oldest = this.timestamps[0]!;
    const retryAfterMs = Math.max(0, oldest + this.windowMs - now);
    return { allowed: false, retryAfterMs };
  }

  reset(): void {
    this.timestamps.length = 0;
    this.totalThrottled = 0;
    this.totalAllowed = 0;
  }

  getStats() {
    return {
      eventsInWindow: this.timestamps.length,
      maxEvents: this.maxEvents,
      windowMs: this.windowMs,
      totalAllowed: this.totalAllowed,
      totalThrottled: this.totalThrottled,
    };
  }
}
