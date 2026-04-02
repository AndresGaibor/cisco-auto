// ============================================================================
// IOS Parser Result Framework
// Provides consistent return type for all IOS parsers
// ============================================================================

export type OutputSource = "terminal" | "synthetic" | "hybrid";

export interface ParseResult<T> {
  /** Parsed data */
  parsed: T;
  /** Raw (sanitized) output */
  raw: string;
  /** Warnings from partial parsing */
  warnings: string[];
  /** Confidence score 0-1 (1 = full confidence) */
  confidence: number;
  /** Source of the output */
  source: OutputSource;
}

/**
 * Create a successful parse result
 */
export function createParseResult<T>(
  parsed: T,
  raw: string,
  options?: {
    source?: OutputSource;
    warnings?: string[];
    confidence?: number;
  }
): ParseResult<T> {
  return {
    parsed,
    raw,
    warnings: options?.warnings ?? [],
    confidence: options?.confidence ?? 1.0,
    source: options?.source ?? "terminal",
  };
}

/**
 * Create a partial parse result with warnings
 */
export function createPartialParseResult<T>(
  parsed: T,
  raw: string,
  warnings: string[],
  source: OutputSource = "terminal"
): ParseResult<T> {
  return {
    parsed,
    raw,
    warnings,
    confidence: warnings.length > 0 ? 0.7 : 1.0,
    source,
  };
}

/**
 * Create a failed parse result
 */
export function createParseErrorResult<T>(
  raw: string,
  error: string,
  partialData?: Partial<T>
): ParseResult<T> {
  return {
    parsed: partialData as T,
    raw,
    warnings: [error],
    confidence: 0,
    source: "terminal",
  };
}
