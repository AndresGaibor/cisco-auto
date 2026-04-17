// ============================================================================
// Runtime Validator - PT-safe validation (Fase 3)
// ============================================================================
// Valida que el código generado para Packet Tracer sea "seguro" (PT-safe).
// Packet Tracer 9.0 usa un motor QTScript muy antiguo que:
// 1. No soporta ES6+ (no const, no let, no arrow functions, no template literals)
// 2. No soporta módulos (no import, no export)
// 3. No soporta APIs web modernas (no fetch, no Promise, no Map/Set)
// 4. No soporta 'globalThis'

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const FORBIDDEN_SYNTAX = [
  "import ",
  "async ",
  "await ",
  "const ",
  "let ",
  "=>",
  "`", // Template literals
];

const FORBIDDEN_GLOBALS = [
  "window",
  "document",
  "fetch",
  "XMLHttpRequest",
  "localStorage",
  "sessionStorage",
  "process",
  "Buffer",
  "setImmediate",
];

const FORBIDDEN_PATTERNS = [
  { pattern: "Map", message: "Map may not be supported" },
  { pattern: "Set", message: "Set may not be supported" },
];

// ============================================================================
// Required symbols para main.js - Consolidated Kernel
// ============================================================================

const REQUIRED_MAIN_SYMBOLS_V2 = ["function main()", "function cleanUp()", "createKernel("];

const REQUIRED_MAIN_SYMBOLS_QUEUE = ["COMMANDS_DIR", "IN_FLIGHT_DIR", "RESULTS_DIR"];

// ============================================================================
// Required symbols para runtime.js
// ============================================================================

const REQUIRED_RUNTIME_SYMBOLS = ["runtimeDispatcher", "_ptDispatch"];

const REQUIRED_RUNTIME_HANDLERS = ["handleConfigIos", "handleDeferredPoll"];

// ============================================================================
// Validation Logic
// ============================================================================

export function validatePtSafe(code: string, type: "main" | "runtime" | "any"): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!code || code.trim().length === 0) {
    errors.push("Code is too short or empty");
    return { ok: false, errors, warnings };
  }

  // 1. Check forbidden syntax
  for (const syntax of FORBIDDEN_SYNTAX) {
    if (code.indexOf(syntax) !== -1) {
      errors.push(
        `Forbidden syntax '${syntax}': ES modules and modern ES6 features are not PT-safe`,
      );
    }
  }

  // 2. Check forbidden globals
  for (const global of FORBIDDEN_GLOBALS) {
    // Check for exact word to avoid false positives with variables like 'processing'
    const regex = new RegExp(`\\b${global}\\b`, "g");
    if (regex.test(code)) {
      errors.push(`Forbidden global '${global}': Not available in PT Script Engine`);
    }
  }

  // 3. Check forbidden patterns (warnings)
  for (const { pattern, message } of FORBIDDEN_PATTERNS) {
    const regex = new RegExp(`\\b${pattern}\\b`, "g");
    if (regex.test(code)) {
      warnings.push(`Forbidden pattern: ${message}`);
    }
  }

  // 4. Check required symbols
  if (type === "main" || type === "any") {
    for (const symbol of REQUIRED_MAIN_SYMBOLS_V2) {
      if (code.indexOf(symbol) === -1) {
        errors.push(`Missing required symbol: ${symbol}`);
      }
    }

    // Check for queue protocol V2
    const hasQueue = REQUIRED_MAIN_SYMBOLS_QUEUE.every((s) => code.indexOf(s) !== -1);
    if (!hasQueue) {
      warnings.push("main.js does not seem to use the latest queue-based command protocol");
    }
  }

  if (type === "runtime" || type === "any") {
    for (const symbol of REQUIRED_RUNTIME_SYMBOLS) {
      if (code.indexOf(symbol) === -1) {
        errors.push(`Missing required symbol: ${symbol}`);
      }
    }

    for (const handler of REQUIRED_RUNTIME_HANDLERS) {
      if (code.indexOf(handler) === -1) {
        warnings.push(`Missing standard handler: ${handler}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateMainJs(code: string): ValidationResult {
  return validatePtSafe(code, "main");
}

export function validateRuntimeJs(code: string): ValidationResult {
  return validatePtSafe(code, "runtime");
}

export function validateGeneratedArtifacts(main: string, runtime: string): ValidationResult {
  const mainRes = validateMainJs(main);
  const runtimeRes = validateRuntimeJs(runtime);

  return {
    ok: mainRes.ok && runtimeRes.ok,
    errors: [...mainRes.errors, ...runtimeRes.errors],
    warnings: [...mainRes.warnings, ...runtimeRes.warnings],
  };
}

export function formatValidationErrors(result: ValidationResult): string {
  let msg = "PT-safe Validation Failed:\n";
  for (const err of result.errors) msg += `  - ERROR: ${err}\n`;
  for (const warn of result.warnings) msg += `  - WARNING: ${warn}\n`;
  return msg;
}

export function validateMainCode(code: string): void {
  const result = validateMainJs(code);
  if (!result.ok) {
    throw new Error(formatValidationErrors(result));
  }
}

export function validateRuntimeCode(code: string): void {
  const result = validateRuntimeJs(code);
  if (!result.ok) {
    throw new Error(formatValidationErrors(result));
  }
}
