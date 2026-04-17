import type { ValidationError, ValidationResult } from "./validate-pt-safe.js";

function createResult(errors: ValidationError[], warnings: ValidationError[] = [], code = ""): ValidationResult {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      byCategory: errors.reduce<Record<string, number>>((acc, err) => {
        acc[err.category] = (acc[err.category] || 0) + 1;
        return acc;
      }, {}),
      bundleSize: code.length,
      estimatedSourceMapsSize: Math.ceil(code.length * 0.1),
    },
  };
}

function createSyntaxError(code: string, message: string): ValidationError {
  return {
    line: 1,
    column: 1,
    message,
    severity: "error",
    category: "syntax-error",
    context: code.slice(0, 120),
  };
}

export function validateBalancedSyntax(code: string): ValidationResult {
  try {
    // `new Function()` valida la sintaxis JS real sin ejecutar el código.
    // En el runtime generado, esto detecta llaves/paréntesis/corchetes sin cerrar.
    new Function(code);
    return createResult([], [], code);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createResult([createSyntaxError(code, message)], [], code);
  }
}

export function validateMainBootstrapContract(code: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (code.indexOf("function main()") === -1) {
    errors.push({
      line: 1,
      column: 1,
      message: "main.js must expose function main()",
      severity: "error",
      category: "syntax-error",
    });
  }

  if (code.indexOf("function cleanUp()") === -1) {
    errors.push({
      line: 1,
      column: 1,
      message: "main.js must expose function cleanUp()",
      severity: "error",
      category: "syntax-error",
    });
  }

  if (code.indexOf("createKernel(") === -1 && code.indexOf("function createKernel") === -1) {
    errors.push({
      line: 1,
      column: 1,
      message: "main.js must only bootstrap the kernel via createKernel()",
      severity: "error",
      category: "syntax-error",
    });
  }

  return createResult(errors, [], code);
}

export function validateRuntimeBootstrapContract(code: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (code.indexOf("_ptDispatch") === -1) {
    errors.push({
      line: 1,
      column: 1,
      message: "runtime.js must register _ptDispatch on the global scope",
      severity: "error",
      category: "syntax-error",
    });
  }

  if (code.indexOf("runtimeDispatcher") === -1) {
    errors.push({
      line: 1,
      column: 1,
      message: "runtime.js must expose runtimeDispatcher",
      severity: "error",
      category: "syntax-error",
    });
  }

  return createResult(errors, [], code);
}
