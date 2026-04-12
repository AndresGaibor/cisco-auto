// packages/pt-runtime/src/build/validate-pt-safe.ts
// Validate generated JS is PT-safe

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

const PT_FORBIDDEN_PATTERNS = [
  { pattern: /\bimport\s+/g, message: "import statements not allowed" },
  { pattern: /\bexport\s+/g, message: "export statements not allowed" },
  { pattern: /\brequire\s*\(/g, message: "require() not allowed" },
  { pattern: /\bprocess\b/g, message: "process global not available" },
  { pattern: /\bBuffer\b/g, message: "Buffer not available" },
  { pattern: /\bconsole\.(log|error|warn|info|debug)/g, message: "console not available, use dprint" },
  { pattern: /\basync\s+function/g, message: "async/await may not work in PT" },
  { pattern: /\bawait\s+/g, message: "await may not work in PT" },
];

const PT_WARNING_PATTERNS = [
  { pattern: /\bclass\s+\w+\s+extends\b/g, message: "class extends may have issues in PT" },
  { pattern: /\.\.\.(\w+)/g, message: "spread operator may have issues in PT" },
];

export function validatePtSafe(code: string): ValidationResult {
  const lines = code.split("\n");
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    
    for (const { pattern, message } of PT_FORBIDDEN_PATTERNS) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        errors.push({
          line: lineNum + 1,
          column: match.index + 1,
          message,
          severity: "error",
        });
      }
    }
    
    for (const { pattern, message } of PT_WARNING_PATTERNS) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        warnings.push({
          line: lineNum + 1,
          column: match.index + 1,
          message,
          severity: "warning",
        });
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function formatValidationResult(result: ValidationResult): string {
  const parts: string[] = [];
  
  if (result.errors.length > 0) {
    parts.push("ERRORS:");
    for (const err of result.errors) {
      parts.push(`  ${err.line}:${err.column}: ${err.message}`);
    }
  }
  
  if (result.warnings.length > 0) {
    parts.push("WARNINGS:");
    for (const warn of result.warnings) {
      parts.push(`  ${warn.line}:${warn.column}: ${warn.message}`);
    }
  }
  
  if (result.valid) {
    parts.push("PT-safe validation passed");
  }
  
  return parts.join("\n");
}