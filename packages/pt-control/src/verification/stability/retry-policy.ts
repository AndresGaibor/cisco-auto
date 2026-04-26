// ============================================================================
// Retry Policy - Política de reintentos testeable
// ============================================================================
// Políticas configurables de reintento para operaciones que pueden fallar
// transientemente (timeouts, conexiones, etc.).

/**
 * Configuración de retry policy.
 */
export interface RetryPolicyConfig {
  /** Número máximo de reintentos */
  maxRetries: number;
  /** Delay inicial en ms */
  initialDelayMs: number;
  /** Factor de backoff multiplicativo */
  backoffMultiplier: number;
  /** Delay máximo entre reintentos en ms */
  maxDelayMs: number;
  /** Si se debe usar jitter */
  useJitter: boolean;
  /** Errores recuperables */
  retryableErrors: string[];
}

/**
 * Resultado de un intento con retry.
 */
export interface RetryAttempt<T> {
  /** Si el intento fue exitoso */
  ok: boolean;
  /** Número de intento (1-based) */
  attemptNumber: number;
  /** Resultado o error */
  result?: T;
  error?: string;
  /** Tiempo total invertido */
  totalTimeMs: number;
  /** Delay usado en este intento */
  delayMs: number;
}

/**
 * Estado del retry.
 */
export interface RetryState {
  attempts: number;
  totalDelayMs: number;
  lastError?: string;
}

/**
 * Política de retry con backoff exponencial.
 */
export class RetryPolicy {
  private config: Required<RetryPolicyConfig>;

  constructor(config: Partial<RetryPolicyConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      initialDelayMs: config.initialDelayMs ?? 1000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      maxDelayMs: config.maxDelayMs ?? 30000,
      useJitter: config.useJitter ?? true,
      retryableErrors: config.retryableErrors ?? ["timeout", "ECONNRESET", "ETIMEDOUT", "network", "connection"],
    };
  }

  /**
   * Ejecuta una función con reintentos.
   */
  async execute<T>(
    fn: () => Promise<T>,
    options?: { onRetry?: (state: RetryState, error: string) => void; context?: string }
  ): Promise<RetryAttempt<T>> {
    const startTime = Date.now();
    let totalDelayMs = 0;
    let attemptNumber = 0;

    while (attemptNumber <= this.config.maxRetries) {
      attemptNumber++;

      try {
        const result = await fn();
        const delayMs = this.calcularDelay(attemptNumber - 1);

        return {
          ok: true,
          attemptNumber,
          result,
          totalTimeMs: Date.now() - startTime,
          delayMs,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const isRetryable = this.esErrorRecuperable(errorMsg);

        if (!isRetryable || attemptNumber > this.config.maxRetries) {
          return {
            ok: false,
            attemptNumber,
            error: errorMsg,
            totalTimeMs: Date.now() - startTime,
            delayMs: 0,
          };
        }

        const delayMs = this.calcularDelay(attemptNumber);
        totalDelayMs += delayMs;

        const state: RetryState = {
          attempts: attemptNumber,
          totalDelayMs,
          lastError: errorMsg,
        };

        options?.onRetry?.(state, errorMsg);

        await this.esperar(delayMs);
      }
    }

    return {
      ok: false,
      attemptNumber,
      error: "Max retries exceeded",
      totalTimeMs: Date.now() - startTime,
      delayMs: 0,
    };
  }

  /**
   * Verifica si un error es recuperable.
   */
  esErrorRecuperable(errorMsg: string): boolean {
    const lowerMsg = errorMsg.toLowerCase();
    return this.config.retryableErrors.some(
      (e) => lowerMsg.includes(e.toLowerCase())
    );
  }

  /**
   * Calcula el delay para un intento dado.
   */
  calcularDelay(attemptNumber: number): number {
    const exponentialDelay = this.config.initialDelayMs *
      Math.pow(this.config.backoffMultiplier, attemptNumber);

    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelayMs);

    if (this.config.useJitter) {
      return Math.floor(cappedDelay * (0.5 + Math.random() * 0.5));
    }

    return cappedDelay;
  }

  /**
   * Obtiene la configuración actual.
   */
  getConfig(): Readonly<Required<RetryPolicyConfig>> {
    return { ...this.config };
  }

  /**
   * Crea una copia con nueva configuración.
   */
  withConfig(overrides: Partial<RetryPolicyConfig>): RetryPolicy {
    return new RetryPolicy({
      ...this.config,
      ...overrides,
    });
  }

  private async esperar(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Retry policy predefinida para operaciones de red.
 */
export const NETWORK_RETRY_POLICY = new RetryPolicy({
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  useJitter: true,
  retryableErrors: ["timeout", "ECONNRESET", "ETIMEDOUT", "network", "connection", "ECONNREFUSED"],
});

/**
 * Retry policy predefinida para operaciones de archivo.
 */
export const FILE_RETRY_POLICY = new RetryPolicy({
  maxRetries: 2,
  initialDelayMs: 500,
  backoffMultiplier: 2,
  maxDelayMs: 5000,
  useJitter: false,
  retryableErrors: ["ENOENT", "EBUSY", "EMFILE"],
});

/**
 * Retry policy predefinida para operaciones de PT.
 */
export const PT_RETRY_POLICY = new RetryPolicy({
  maxRetries: 5,
  initialDelayMs: 500,
  backoffMultiplier: 1.5,
  maxDelayMs: 15000,
  useJitter: true,
  retryableErrors: ["timeout", "ETIMEDOUT", "not ready", "busy", "device not found"],
});

/**
 * Función helper para crear retry policy desde preset.
 */
export function crearRetryPolicy(preset: "network" | "file" | "pt" | "strict" | "lenient"): RetryPolicy {
  switch (preset) {
    case "network":
      return NETWORK_RETRY_POLICY;
    case "file":
      return FILE_RETRY_POLICY;
    case "pt":
      return PT_RETRY_POLICY;
    case "strict":
      return new RetryPolicy({
        maxRetries: 5,
        initialDelayMs: 2000,
        backoffMultiplier: 2,
        maxDelayMs: 30000,
        useJitter: true,
        retryableErrors: ["timeout"],
      });
    case "lenient":
      return new RetryPolicy({
        maxRetries: 2,
        initialDelayMs: 500,
        backoffMultiplier: 1.5,
        maxDelayMs: 5000,
        useJitter: false,
        retryableErrors: ["timeout", "ECONNRESET", "ETIMEDOUT", "network", "connection"],
      });
  }
}
