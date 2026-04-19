// ============================================================================
// Errors - Taxonomia de errores para PT Runtime
// ============================================================================

export class UnsupportedByPT extends Error {
  readonly code = "UNSUPPORTED_BY_PT";
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedByPT";
  }
}

export class PrimitiveRejected extends Error {
  readonly code = "PRIMITIVE_REJECTED";
  constructor(message: string) {
    super(message);
    this.name = "PrimitiveRejected";
  }
}

export class InvalidPayload extends Error {
  readonly code = "INVALID_PAYLOAD";
  constructor(message: string) {
    super(message);
    this.name = "InvalidPayload";
  }
}

export class TerminalTimeout extends Error {
  readonly code = "TERMINAL_TIMEOUT";
  constructor(message: string) {
    super(message);
    this.name = "TerminalTimeout";
  }
}

export class PromptMismatch extends Error {
  readonly code = "PROMPT_MISMATCH";
  constructor(message: string) {
    super(message);
    this.name = "PromptMismatch";
  }
}

export class PrivilegeDenied extends Error {
  readonly code = "PRIVILEGE_DENIED";
  constructor(message: string) {
    super(message);
    this.name = "PrivilegeDenied";
  }
}

export class CapabilityUnavailable extends Error {
  readonly code = "CAPABILITY_UNAVAILABLE";
  constructor(message: string) {
    super(message);
    this.name = "CapabilityUnavailable";
  }
}

export class HackProbeFailed extends Error {
  readonly code = "HACK_PROBE_FAILED";
  constructor(message: string) {
    super(message);
    this.name = "HackProbeFailed";
  }
}

export class FlakyObservation extends Error {
  readonly code = "FLAKY_OBSERVATION";
  constructor(message: string) {
    super(message);
    this.name = "FlakyObservation";
  }
}

export class VerificationFailed extends Error {
  readonly code = "VERIFICATION_FAILED";
  constructor(message: string) {
    super(message);
    this.name = "VerificationFailed";
  }
}

export interface Evidence {
  device?: string;
  mode?: string;
  timestamp: number;
  rawOutput: string;
}

export interface TypedError {
  code: string;
  message: string;
  cause?: unknown;
}

export interface TypedResult<T = unknown> {
  ok: boolean;
  raw: string;
  normalized?: T;
  evidence: Evidence;
  warnings: string[];
  confidence: number;
  error?: TypedError;
}

export function isTypedError(err: unknown): err is TypedError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as Record<string, unknown>).code === "string"
  );
}

export function createTypedError(
  err: UnsupportedByPT | PrimitiveRejected | InvalidPayload | TerminalTimeout |
    PromptMismatch | PrivilegeDenied | CapabilityUnavailable | HackProbeFailed |
    FlakyObservation | VerificationFailed
): TypedError {
  return {
    code: err.code,
    message: err.message,
    cause: err.cause,
  };
}

export function wrapInTypedResult<T>(
  raw: string,
  fn: () => T,
  evidence: Evidence,
  warnings: string[] = [],
  confidence: number = 1.0
): TypedResult<T> {
  try {
    const normalized = fn();
    return {
      ok: true,
      raw,
      normalized,
      evidence,
      warnings,
      confidence,
    };
  } catch (err) {
    const error = isTypedError(err)
      ? err
      : {
          code: "UNKNOWN_ERROR",
          message: err instanceof Error ? err.message : String(err),
        };
    return {
      ok: false,
      raw,
      evidence,
      warnings,
      confidence: 0,
      error,
    };
  }
}
