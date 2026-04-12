// packages/pt-runtime/src/build/validate-pt-safe.ts
// Validate generated JS is PT-safe
// Includes enhanced error messages with source context

export interface ValidationError {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: "error" | "warning";
  category: ErrorCategory;
  context?: string;
  suggestion?: string;
}

export type ErrorCategory =
  | "module-syntax"
  | "forbidden-global"
  | "async-pattern"
  | "class-pattern"
  | "operator-pattern"
  | "syntax-error";

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: ValidationSummary;
}

export interface ValidationSummary {
  totalErrors: number;
  totalWarnings: number;
  byCategory: Record<string, number>;
  bundleSize: number;
  estimatedSourceMapsSize: number;
}

interface PatternRule {
  pattern: RegExp;
  message: string;
  category: ErrorCategory;
  suggestion?: string;
  highlightGroup?: number;
}

const PT_FORBIDDEN_PATTERNS: PatternRule[] = [
  {
    pattern: /\bimport\s+(?:type\s+)?.*?\s+from\s+["'][^"']+["']/g,
    message: "import statements are not supported in PT runtime",
    category: "module-syntax",
    suggestion: "Use inline code or import from @cisco-auto/types",
  },
  {
    pattern: /\bexport\s+(?:default\s+)?(?:class|function|const|let|var|type|interface)/g,
    message: "export statements are not supported in PT runtime",
    category: "module-syntax",
    suggestion: "Remove export keyword - code is bundled inline",
  },
  {
    pattern: /\bexport\s+\{[^}]+\};?\s*$/gm,
    message: "named exports are not supported in PT runtime",
    category: "module-syntax",
    suggestion: "Use default exports or inline code",
  },
  {
    pattern: /\brequire\s*\(/g,
    message: "require() is not available in PT",
    category: "forbidden-global",
    suggestion: "Use static imports at build time",
  },
  {
    pattern: /\bprocess\b(?!\s*\.)/g,
    message: "process global is not available in PT",
    category: "forbidden-global",
    suggestion: "Use environment variables or IPC instead",
  },
  {
    pattern: /\bBuffer\b/g,
    message: "Buffer is not available in PT",
    category: "forbidden-global",
    suggestion: "Use ArrayBuffer or string operations",
  },
  {
    pattern: /\bconsole\.(log|error|warn|info|debug)\b/g,
    message: "console is not available in PT runtime",
    category: "forbidden-global",
    suggestion: "Use dprint() instead - it is automatically injected",
  },
  {
    pattern: /\basync\s+(?:function|\()/g,
    message: "async functions may not work correctly in PT",
    category: "async-pattern",
    suggestion: "Use synchronous code with callbacks instead",
  },
  {
    pattern: /\bawait\s+(?!\()/g,
    message: "await expressions may not work in PT",
    category: "async-pattern",
    suggestion: "Use callback-based async patterns instead",
  },
  {
    pattern: /\bPromise\b/g,
    message: "Promise is not fully supported in older PT versions",
    category: "async-pattern",
    suggestion: "Use callback-based patterns for compatibility",
  },
];

const PT_WARNING_PATTERNS: PatternRule[] = [
  {
    pattern: /\bclass\s+\w+\s+extends\s+\w+/g,
    message: "class extends pattern may have compatibility issues in older PT",
    category: "class-pattern",
    suggestion: "Test thoroughly on target PT versions",
  },
  {
    pattern: /\.\.\.(\w+)/g,
    message: "spread operator may not be fully supported in older PT",
    category: "operator-pattern",
    suggestion: "Use explicit iteration or Object.assign()",
  },
  {
    pattern: /\|\|\s*null/g,
    message: "null coalescing with || may be redundant",
    category: "operator-pattern",
  },
  {
    pattern: /\$\{[^}]+\}/g,
    message: "template literal with expressions - ensure ES5 compatibility",
    category: "operator-pattern",
    suggestion: "Test on target PT versions",
  },
];

function getContext(line: string, column: number, width = 40): string {
  const start = Math.max(0, column - 1 - width);
  const end = Math.min(line.length, column - 1 + width);
  const context = line.slice(start, end);
  const marker = " ".repeat(Math.min(column - 1 - start, context.length)) + "^";
  return `${context}\n${marker}`;
}

function categorizeByLine(errors: ValidationError[]): Record<string, number> {
  const categories: Record<string, number> = {};
  for (const err of errors) {
    categories[err.category] = (categories[err.category] || 0) + 1;
  }
  return categories;
}

export function validatePtSafe(code: string): ValidationResult {
  const lines = code.split("\n");
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    for (const rule of PT_FORBIDDEN_PATTERNS) {
      let match;
      rule.pattern.lastIndex = 0;
      while ((match = rule.pattern.exec(line)) !== null) {
        errors.push({
          line: lineNum + 1,
          column: match.index + 1,
          message: rule.message,
          severity: "error",
          category: rule.category,
          suggestion: rule.suggestion,
          context: getContext(line, match.index + 1),
        });
      }
    }

    for (const rule of PT_WARNING_PATTERNS) {
      let match;
      rule.pattern.lastIndex = 0;
      while ((match = rule.pattern.exec(line)) !== null) {
        warnings.push({
          line: lineNum + 1,
          column: match.index + 1,
          message: rule.message,
          severity: "warning",
          category: rule.category,
          suggestion: rule.suggestion,
          context: getContext(line, match.index + 1),
        });
      }
    }
  }

  const byCategory = categorizeByLine(errors);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      byCategory,
      bundleSize: code.length,
      estimatedSourceMapsSize: Math.ceil(code.length * 0.1),
    },
  };
}

export function formatValidationResult(result: ValidationResult): string {
  const parts: string[] = [];

  parts.push("═".repeat(60));
  parts.push("PT-SAFE VALIDATION REPORT");
  parts.push("═".repeat(60));
  parts.push(`Bundle size: ${result.summary.bundleSize.toLocaleString()} chars`);
  parts.push(`Source map estimate: ~${result.summary.estimatedSourceMapsSize.toLocaleString()} chars`);
  parts.push("");

  if (result.errors.length > 0) {
    parts.push("┼─ ERRORS (" + result.errors.length + ") ─────────────────────────────");
    const byCategory = result.summary.byCategory;
    const categories = Object.keys(byCategory);
    if (categories.length > 0) {
      parts.push("│ Categories: " + categories.map(c => `${c}:${byCategory[c]}`).join(", "));
    }
    parts.push("│");
    for (const err of result.errors) {
      parts.push(`├─ ${err.line}:${err.column} [${err.category}]`);
      parts.push(`│   ${err.message}`);
      if (err.context) {
        parts.push(`│   Context: ${err.context.split("\n")[0]}`);
        parts.push(`│            ${err.context.split("\n")[1] || ""}`);
      }
      if (err.suggestion) {
        parts.push(`│   → ${err.suggestion}`);
      }
      parts.push("│");
    }
  } else {
    parts.push("┼─ NO ERRORS ────────────────────────────────────────────");
  }

  if (result.warnings.length > 0) {
    parts.push("┼─ WARNINGS (" + result.warnings.length + ") ─────────────────────────────");
    for (const warn of result.warnings) {
      parts.push(`├─ ${warn.line}:${warn.column}`);
      parts.push(`│   ${warn.message}`);
      if (warn.suggestion) {
        parts.push(`│   → ${warn.suggestion}`);
      }
    }
    parts.push("│");
  }

  parts.push("─".repeat(60));
  if (result.valid) {
    parts.push("✓ PT-safe validation PASSED");
  } else {
    parts.push("✗ PT-safe validation FAILED");
  }
  parts.push("═".repeat(60));

  return parts.join("\n");
}

export function formatErrorCompact(error: ValidationError): string {
  let msg = `[${error.category}] ${error.line}:${error.column} - ${error.message}`;
  if (error.suggestion) {
    msg += ` (${error.suggestion})`;
  }
  return msg;
}