export type BackoffStrategy = "exponential" | "fixed" | "linear";

export interface RetryPolicyOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoff?: BackoffStrategy;
  jitter?: boolean;
  retryable?: (error: unknown) => boolean;
}

const DEFAULTS = {
  maxRetries: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
  backoff: "exponential" as BackoffStrategy,
  jitter: true,
} as const;

export class MaxRetriesExceededError extends Error {
  readonly lastError: unknown;
  readonly attempts: number;

  constructor(lastError: unknown, attempts: number) {
    const msg = lastError instanceof Error ? lastError.message : String(lastError);
    super(`Max retries exceeded (${attempts} attempts): ${msg}`);
    this.name = "MaxRetriesExceededError";
    this.lastError = lastError;
    this.attempts = attempts;
  }
}

export class RetryPolicy {
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly backoff: BackoffStrategy;
  private readonly jitter: boolean;
  private readonly retryable: (error: unknown) => boolean;

  constructor(options: RetryPolicyOptions = {}) {
    this.maxRetries = options.maxRetries ?? DEFAULTS.maxRetries;
    this.baseDelayMs = options.baseDelayMs ?? DEFAULTS.baseDelayMs;
    this.maxDelayMs = options.maxDelayMs ?? DEFAULTS.maxDelayMs;
    this.backoff = options.backoff ?? DEFAULTS.backoff;
    this.jitter = options.jitter ?? DEFAULTS.jitter;
    this.retryable = options.retryable ?? this.defaultRetryable;
  }

  private defaultRetryable(_error: unknown): boolean {
    return true;
  }

  calculateDelay(attempt: number): number {
    let delay: number;

    switch (this.backoff) {
      case "fixed":
        delay = this.baseDelayMs;
        break;
      case "linear":
        delay = this.baseDelayMs * attempt;
        break;
      case "exponential":
      default:
        delay = this.baseDelayMs * Math.pow(2, attempt - 1);
        break;
    }

    delay = Math.min(delay, this.maxDelayMs);

    if (this.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;

        if (attempt >= this.maxRetries) {
          throw new MaxRetriesExceededError(lastError, attempt);
        }

        if (!this.retryable(err)) {
          throw err;
        }

        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw new MaxRetriesExceededError(lastError, this.maxRetries);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
