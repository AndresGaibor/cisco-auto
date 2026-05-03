export type RetryableFsCode =
  | "EPERM"
  | "EACCES"
  | "EBUSY"
  | "ENOTEMPTY"
  | "ENOENT";

export function isRetryableFsError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "EPERM" || code === "EACCES" || code === "EBUSY";
}

export function sleepSync(ms: number): void {
  const shared = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(shared, 0, 0, ms);
}

export function retrySync<T>(
  operation: () => T,
  options: {
    attempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
    onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  } = {},
): T {
  const attempts = options.attempts ?? 8;
  const baseDelayMs = options.baseDelayMs ?? 10;
  const maxDelayMs = options.maxDelayMs ?? 250;
  const shouldRetry = options.shouldRetry ?? isRetryableFsError;

  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return operation();
    } catch (error) {
      lastError = error;

      if (attempt >= attempts - 1 || !shouldRetry(error)) {
        throw error;
      }

      const delayMs = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      options.onRetry?.(error, attempt + 1, delayMs);
      sleepSync(delayMs);
    }
  }

  throw lastError;
}
