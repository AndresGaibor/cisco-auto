import { PT_API_METHOD_INDEX } from "../pt-api/pt-api-registry.js";

export interface PTApiValidationError {
  file: string;
  line?: number;
  objectType: string;
  method: string;
  message: string;
  severity: "error" | "warning";
}

export interface PTApiValidationResult {
  valid: boolean;
  errors: PTApiValidationError[];
  warnings: PTApiValidationError[];
  stats: {
    totalMethods: number;
    registeredMethods: number;
    unregisteredMethods: number;
  };
}

const VARIABLE_TYPE_MAP: Record<string, string> = {
  net: "PTNetwork",
  lw: "PTLogicalWorkspace",
  device: "PTDevice",
  term: "PTCommandLine",
  port: "PTPort",
  fm: "PTFileManager",
  ipc: "PTIpc",
};

function extractMethodCalls(code: string): Array<{ objectType: string; method: string; line: number }> {
  const calls: Array<{ objectType: string; method: string; line: number }> = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trimStart().startsWith("//")) continue;

    const regex = /(\w+)\.(\w+)\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(lines[i])) !== null) {
      const objectType = VARIABLE_TYPE_MAP[match[1]];
      if (objectType) {
        calls.push({ objectType, method: match[2], line: i + 1 });
      }
    }
  }

  return calls;
}

export function validatePtApiCalls(code: string, fileName: string): PTApiValidationResult {
  const errors: PTApiValidationError[] = [];
  const warnings: PTApiValidationError[] = [];
  const calls = extractMethodCalls(code);
  const registered = new Set<string>();

  for (const [objectType, methods] of Object.entries(PT_API_METHOD_INDEX)) {
    for (const method of methods) {
      registered.add(`${objectType}.${method}`);
    }
  }

  for (const call of calls) {
    const key = `${call.objectType}.${call.method}`;
    if (!registered.has(key)) {
      const existsSomewhere = Array.from(registered).some((entry) => entry.endsWith(`.${call.method}`));
      const error: PTApiValidationError = {
        file: fileName,
        line: call.line,
        objectType: call.objectType,
        method: call.method,
        message: existsSomewhere
          ? `"${call.method}" existe, pero no en ${call.objectType}. Revisa el mapeo de variable.`
          : `"${call.method}" no existe en la API PT para ${call.objectType}.`,
        severity: existsSomewhere ? "warning" : "error",
      };

      errors.push(error);
      if (error.severity === "warning") {
        warnings.push(error);
      }
    }
  }

  return {
    valid: errors.every((error) => error.severity !== "error"),
    errors,
    warnings,
    stats: {
      totalMethods: calls.length,
      registeredMethods: calls.filter((call) => registered.has(`${call.objectType}.${call.method}`)).length,
      unregisteredMethods: errors.filter((error) => error.severity === "error").length,
    },
  };
}
