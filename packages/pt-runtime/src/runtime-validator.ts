// ============================================================================
// Runtime Validator - PT-safe validation
// ============================================================================
// Valida que el código generado para Packet Tracer sea seguro para QTScript / PT.
// Reglas principales:
// - Sin ES modules
// - Sin sintaxis ES6+ no soportada
// - Sin globals Node/Web no disponibles
// - main.js debe exponer símbolos mínimos del bootloader/kernel
// - runtime.js debe exponer símbolos mínimos del dispatcher runtime

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const FORBIDDEN_SYNTAX_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\bimport\b/, message: "ES modules are not PT-safe" },
  { pattern: /\bexport\b/, message: "ES modules are not PT-safe" },
  { pattern: /\basync\b/, message: "async/await is not PT-safe" },
  { pattern: /\bawait\b/, message: "async/await is not PT-safe" },
  { pattern: /\bconst\b/, message: "const is not PT-safe" },
  { pattern: /\blet\b/, message: "let is not PT-safe" },
  { pattern: /=>/, message: "arrow functions are not PT-safe" },
  { pattern: /`/, message: "template literals are not PT-safe" },
];

const FORBIDDEN_GLOBAL_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\bwindow\b/, message: "window is not available in PT Script Engine" },
  { pattern: /\bdocument\b/, message: "document is not available in PT Script Engine" },
  { pattern: /\bfetch\b/, message: "fetch is not available in PT Script Engine" },
  { pattern: /\bXMLHttpRequest\b/, message: "XMLHttpRequest is not available in PT Script Engine" },
  { pattern: /\blocalStorage\b/, message: "localStorage is not available in PT Script Engine" },
  { pattern: /\bsessionStorage\b/, message: "sessionStorage is not available in PT Script Engine" },
  { pattern: /\bprocess\b/, message: "process is not available in PT Script Engine" },
  { pattern: /\bBuffer\b/, message: "Buffer is not available in PT Script Engine" },
  { pattern: /\bsetImmediate\b/, message: "setImmediate is not available in PT Script Engine" },
  { pattern: /\brequire\s*\(/, message: "require() is not PT-safe" },
  { pattern: /\bmodule\b/, message: "module is not PT-safe" },
  { pattern: /\bexports\b/, message: "exports is not PT-safe" },
  { pattern: /\bglobalThis\b/, message: "globalThis is not PT-safe" },
];

const FORBIDDEN_WARNING_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\bMap\b/, message: "Map may not be supported reliably in PT" },
  { pattern: /\bSet\b/, message: "Set may not be supported reliably in PT" },
  { pattern: /\bPromise\b/, message: "Promise may not be supported reliably in PT" },
];

const REQUIRED_MAIN_SYMBOLS = ["function main()", "function cleanUp()", "createKernel("];
const REQUIRED_MAIN_QUEUE_SYMBOLS = ["COMMANDS_DIR", "IN_FLIGHT_DIR", "RESULTS_DIR"];
const REQUIRED_RUNTIME_SYMBOLS = ["runtimeDispatcher", "_ptDispatch"];
const REQUIRED_RUNTIME_HANDLERS = ["handleConfigIos", "handleDeferredPoll"];

function pushUnique(target: string[], value: string): void {
  if (!target.includes(value)) {
    target.push(value);
  }
}

export function validatePtSafe(code: string, type: "main" | "runtime" | "any"): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!code || code.trim().length < 20) {
    return {
      ok: false,
      errors: ["Code is empty or too short"],
      warnings,
    };
  }

  for (const entry of FORBIDDEN_SYNTAX_PATTERNS) {
    if (entry.pattern.test(code)) {
      pushUnique(errors, entry.message);
    }
  }

  for (const entry of FORBIDDEN_GLOBAL_PATTERNS) {
    if (entry.pattern.test(code)) {
      pushUnique(errors, entry.message);
    }
  }

  for (const entry of FORBIDDEN_WARNING_PATTERNS) {
    if (entry.pattern.test(code)) {
      pushUnique(warnings, entry.message);
    }
  }

  if (type === "main" || type === "any") {
    for (const symbol of REQUIRED_MAIN_SYMBOLS) {
      if (code.indexOf(symbol) === -1) {
        pushUnique(errors, `Missing required main.js symbol: ${symbol}`);
      }
    }

    const hasQueue = REQUIRED_MAIN_QUEUE_SYMBOLS.every((s) => code.indexOf(s) !== -1);
    if (!hasQueue) {
      pushUnique(
        warnings,
        "main.js does not appear to expose the queue directories for the queue-based protocol",
      );
    }
  }

  if (type === "runtime" || type === "any") {
    for (const symbol of REQUIRED_RUNTIME_SYMBOLS) {
      if (code.indexOf(symbol) === -1) {
        pushUnique(errors, `Missing required runtime.js symbol: ${symbol}`);
      }
    }

    for (const handler of REQUIRED_RUNTIME_HANDLERS) {
      if (code.indexOf(handler) === -1) {
        pushUnique(warnings, `Missing standard runtime handler: ${handler}`);
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
  const lines: string[] = [];

  if (result.errors.length > 0) {
    lines.push("PT-safe validation failed:");
    for (const err of result.errors) {
      lines.push(`  - ERROR: ${err}`);
    }
  }

  if (result.warnings.length > 0) {
    if (lines.length === 0) {
      lines.push("PT-safe validation warnings:");
    } else {
      lines.push("Warnings:");
    }

    for (const warn of result.warnings) {
      lines.push(`  - WARNING: ${warn}`);
    }
  }

  return lines.join("\n");
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
