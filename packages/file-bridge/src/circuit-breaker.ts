export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeoutMs?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onHalfOpen?: () => void;
}

const DEFAULTS = {
  failureThreshold: 5,
  successThreshold: 2,
  timeoutMs: 30_000,
} as const;

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeoutMs: number;
  private readonly onOpen?: () => void;
  private readonly onClose?: () => void;
  private readonly onHalfOpen?: () => void;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? DEFAULTS.failureThreshold;
    this.successThreshold = options.successThreshold ?? DEFAULTS.successThreshold;
    this.timeoutMs = options.timeoutMs ?? DEFAULTS.timeoutMs;
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.onHalfOpen = options.onHalfOpen;
  }

  getState(): CircuitState {
    if (this.state === "open" && this.hasTimeoutElapsed()) {
      return "half-open";
    }
    return this.state;
  }

  isAllowed(): boolean {
    const currentState = this.getState();
    if (currentState === "closed") return true;
    if (currentState === "half-open") return true;
    return false;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.isAllowed()) {
      throw new CircuitBreakerOpenError(
        `Circuit is open (state=${this.state}), rejecting call`,
        this.state,
        this.failureCount,
        this.lastFailureTime,
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  onSuccess(): void {
    const currentState = this.getState();
    if (currentState === "half-open") {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.reset();
        this.onClose?.();
      }
    } else if (currentState === "closed") {
      this.failureCount = 0;
    }
  }

  onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "half-open") {
      this.tripOpen();
      return;
    }

    if (this.failureCount >= this.failureThreshold) {
      this.tripOpen();
    }
  }

  reset(): void {
    this.state = "closed";
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }

  private tripOpen(): void {
    this.state = "open";
    this.successCount = 0;
    this.onOpen?.();
  }

  private hasTimeoutElapsed(): boolean {
    return Date.now() - this.lastFailureTime >= this.timeoutMs;
  }

  forceState(state: CircuitState): void {
    this.state = state;
    if (state === "closed") {
      this.failureCount = 0;
      this.successCount = 0;
    }
    if (state === "open") {
      this.lastFailureTime = Date.now();
    }
  }

  getStats(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number;
  } {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

export class CircuitBreakerOpenError extends Error {
  readonly state: CircuitState;
  readonly failureCount: number;
  readonly lastFailureTime: number;

  constructor(
    message: string,
    state: CircuitState,
    failureCount: number,
    lastFailureTime: number,
  ) {
    super(message);
    this.name = "CircuitBreakerOpenError";
    this.state = state;
    this.failureCount = failureCount;
    this.lastFailureTime = lastFailureTime;
  }
}
