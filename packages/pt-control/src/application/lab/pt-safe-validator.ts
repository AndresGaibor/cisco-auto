// PTSafeValidator - Validador de JavaScript seguro para Packet Tracer
// Fase 8: Validación PT-safe del JS

export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  line?: number;
  column?: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  stats: {
    lines: number;
    estimatedSize: number;
    hasModuleImports: boolean;
    hasEval: boolean;
    hasDynamicCode: boolean;
  };
}

const DANGEROUS_PATTERNS = [
  { pattern: /\beval\s*\(/g, code: "EVAL_DETECTED", message: "eval() no está permitido en PT" },
  { pattern: /\brequire\s*\(/g, code: "REQUIRE_DETECTED", message: "require() no está disponible en PT" },
  { pattern: /\bimport\s+.*\s+from\s+['"`]/g, code: "ES_MODULE_IMPORT", message: "ES module imports no son soportados en PT" },
  { pattern: /\bexport\s+(default\s+)?/g, code: "ES_MODULE_EXPORT", message: "ES module exports no son soportados en PT" },
  { pattern: /\bdelete\s+\w+/g, code: "DELETE_OPERATOR", message: "delete no está permitido en PT" },
  { pattern: /\bwith\s*\(/g, code: "WITH_STATEMENT", message: "with no está permitido en PT" },
  { pattern: /\bdebugger\b/g, code: "DEBUGGER_STATEMENT", message: "debugger no está permitido en PT" },
  { pattern: /__dirname/g, code: "NODE_GLOBAL", message: "__dirname es una variable global de Node.js" },
  { pattern: /__filename/g, code: "NODE_GLOBAL", message: "__filename es una variable global de Node.js" },
  { pattern: /\bprocess\b/g, code: "NODE_GLOBAL", message: "process es una variable global de Node.js" },
  { pattern: /\bBuffer\b/g, code: "NODE_GLOBAL", message: "Buffer es una clase de Node.js" },
  { pattern: /\bglobal\b/g, code: "NODE_GLOBAL", message: "global es una variable global de Node.js" },
  { pattern: /\bmodule\b(?!\.\w)/g, code: "NODE_GLOBAL", message: "module es una variable global de Node.js" },
  { pattern: /\bconsole\.log\b/g, code: "CONSOLE_LOG", message: "console.log puede causar problemas en PT" },
];

const MAX_SCRIPT_SIZE = 50 * 1024;
const MAX_LINE_COUNT = 10000;

export class PTSafeValidator {
  validate(code: string): ValidationResult {
    const issues: ValidationIssue[] = [];
    const lines = code.split("\n");
    const stats = {
      lines: lines.length,
      estimatedSize: code.length,
      hasModuleImports: false,
      hasEval: false,
      hasDynamicCode: false,
    };

    if (code.length > MAX_SCRIPT_SIZE) {
      issues.push({
        severity: "error",
        code: "SIZE_EXCEEDED",
        message: `Script demasiado grande: ${code.length} bytes (máximo: ${MAX_SCRIPT_SIZE})`,
      });
    }

    if (lines.length > MAX_LINE_COUNT) {
      issues.push({
        severity: "error",
        code: "LINE_COUNT_EXCEEDED",
        message: `Demasiadas líneas: ${lines.length} (máximo: ${MAX_LINE_COUNT})`,
      });
    }

    for (const { pattern, code: issueCode, message } of DANGEROUS_PATTERNS) {
      const matches = code.matchAll(new RegExp(pattern.source, "g"));
      for (const match of matches) {
        const index = match.index ?? 0;
        const lineNumber = code.substring(0, index).split("\n").length;

        issues.push({
          severity: issueCode === "CONSOLE_LOG" ? "warning" : "error",
          code: issueCode,
          message,
          line: lineNumber,
        });

        if (issueCode === "ES_MODULE_IMPORT") stats.hasModuleImports = true;
        if (issueCode === "EVAL_DETECTED") stats.hasEval = true;
        if (issueCode === "REQUIRE_DETECTED") stats.hasDynamicCode = true;
      }
    }

    const syntaxResult = this.validateSyntax(code);
    if (!syntaxResult.valid) {
      issues.push(...syntaxResult.issues);
    }

    return {
      valid: issues.filter((i) => i.severity === "error").length === 0,
      issues,
      stats,
    };
  }

  private validateSyntax(code: string): { valid: boolean; issues: ValidationIssue[] } {
    const issues: ValidationIssue[] = [];

    const openBraces: number[] = [];
    const openParens: number[] = [];
    const openBrackets: number[] = [];
    const stringCharStack: ("'" | '"' | '`')[] = [];
    let inMultilineComment = false;
    let inSingleLineComment = false;

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const prevChar = i > 0 ? code[i - 1] : "";

      if (inMultilineComment) {
        if (char === "/" && prevChar === "*") {
          inMultilineComment = false;
        }
        continue;
      }

      if (inSingleLineComment) {
        if (char === "\n") {
          inSingleLineComment = false;
        }
        continue;
      }

      if (char === "/" && prevChar === "/") {
        inSingleLineComment = true;
        continue;
      }

      if (char === "*" && prevChar === "/") {
        inMultilineComment = true;
        continue;
      }

      if (stringCharStack.length > 0) {
        if (char === stringCharStack[stringCharStack.length - 1] && prevChar !== "\\") {
          stringCharStack.pop();
        }
        continue;
      }

      if (char === '"' || char === "'" || char === "`") {
        stringCharStack.push(char);
        continue;
      }

      switch (char) {
        case "{":
          openBraces.push(i);
          break;
        case "}":
          if (openBraces.length === 0) {
            issues.push({
              severity: "error",
              code: "UNmatched_BRACE",
              message: `Llave de cierre sin abrir correspondiente`,
              line: this.getLineNumber(code, i),
            });
          } else {
            openBraces.pop();
          }
          break;
        case "(":
          openParens.push(i);
          break;
        case ")":
          if (openParens.length === 0) {
            issues.push({
              severity: "error",
              code: "UNmatched_PAREN",
              message: `Paréntesis de cierre sin abrir correspondiente`,
              line: this.getLineNumber(code, i),
            });
          } else {
            openParens.pop();
          }
          break;
        case "[":
          openBrackets.push(i);
          break;
        case "]":
          if (openBrackets.length === 0) {
            issues.push({
              severity: "error",
              code: "UNmatched_BRACKET",
              message: `Corchete de cierre sin abrir correspondiente`,
              line: this.getLineNumber(code, i),
            });
          } else {
            openBrackets.pop();
          }
          break;
      }
    }

    if (openBraces.length > 0) {
      issues.push({
        severity: "error",
        code: "UNmatched_BRACE",
        message: `${openBraces.length} llave(s) sin cerrar`,
        line: this.getLineNumber(code, openBraces.at(-1)!),
      });
    }

    if (openParens.length > 0) {
      issues.push({
        severity: "error",
        code: "UNmatched_PAREN",
        message: `${openParens.length} paréntesis sin cerrar`,
        line: this.getLineNumber(code, openParens.at(-1)!),
      });
    }

    if (openBrackets.length > 0) {
      issues.push({
        severity: "error",
        code: "UNmatched_BRACKET",
        message: `${openBrackets.length} corchete(s) sin cerrar`,
        line: this.getLineNumber(code, openBrackets.at(-1)!),
      });
    }

    if (stringCharStack.length > 0) {
      issues.push({
        severity: "error",
        code: "UNclosed_STRING",
        message: `String sin cerrar`,
      });
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  private getLineNumber(code: string, index: number): number {
    return code.substring(0, index).split("\n").length;
  }
}
