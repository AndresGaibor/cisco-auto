// PT-Safe Build Gate
// Valida que el runtime generado no usa features de JS no compatibles con Packet Tracer

export interface PtSafeViolation {
  file: string;
  line: number;
  id: string;
  message: string;
}

export interface PtSafeWarning {
  file: string;
  line: number;
  message: string;
}

export interface PtSafeCheckResult {
  safe: boolean;
  errors: PtSafeViolation[];
  warnings: PtSafeWarning[];
}

export interface FileContent {
  path: string;
  content: string;
}

const FORBIDDEN_PATTERNS = [
  { id: "let", regex: /\blet\s+/, message: "Use var, not let" },
  { id: "const", regex: /\bconst\s+/, message: "Use var, not const" },
  { id: "arrow", regex: /=>/, message: "Arrow functions are not PT-safe" },
  { id: "async", regex: /\basync\s+/, message: "async is not PT-safe" },
  { id: "await", regex: /\bawait\b/, message: "await is not PT-safe" },
  { id: "optional-chaining", regex: /\?\./, message: "Optional chaining is not PT-safe" },
  { id: "nullish", regex: /\?\?/, message: "Nullish coalescing is not PT-safe" },
  { id: "spread", regex: /\.\.\./, message: "Spread is not PT-safe" },
  { id: "template", regex: /`/, message: "Template strings are not PT-safe" },
  { id: "destructuring", regex: /\{[^}]*\}/, message: "Destructuring may not be PT-safe" },
  { id: "for-of", regex: /\bfor\s*\(\s*\w+\s+of\b/, message: "for...of is not PT-safe" },
  { id: "generators", regex: /\bfunction\s*\*|\byield\b/, message: "Generators/yield not PT-safe" },
  { id: "classes", regex: /\bclass\s+\w+/, message: "ES6 classes not PT-safe" },
];

function isInCommentOrString(line: string, matchStart: number): boolean {
  const beforeMatch = line.slice(0, matchStart);
  const singleQuotes = (beforeMatch.match(/'/g) || []).length;
  const doubleQuotes = (beforeMatch.match(/"/g) || []).length;
  const backticks = (beforeMatch.match(/`/g) || []).length;
  const lineComments = beforeMatch.includes("//");
  const blockComments = (beforeMatch.match(/\/\*/g) || []).length;
  const blockCommentEnds = (beforeMatch.match(/\*\//g) || []).length;

  if (lineComments && singleQuotes % 2 === 0 && doubleQuotes % 2 === 0 && backticks % 2 === 0) {
    return true;
  }
  if (blockComments > blockCommentEnds) {
    return true;
  }
  return false;
}

function checkLineForPattern(
  line: string,
  lineNumber: number,
  file: string,
  pattern: { id: string; regex: RegExp; message: string }
): PtSafeViolation | null {
  const trimmed = line.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
    return null;
  }

  let match;
  const regex = new RegExp(pattern.regex.source, "g");
  while ((match = regex.exec(line)) !== null) {
    if (isInCommentOrString(line, match.index)) {
      continue;
    }
    return {
      file,
      line: lineNumber,
      id: pattern.id,
      message: pattern.message,
    };
  }
  return null;
}

export function checkFilesForPTSafety(files: FileContent[]): PtSafeCheckResult {
  const errors: PtSafeViolation[] = [];
  const warnings: PtSafeWarning[] = [];

  for (const { path: filePath, content } of files) {
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      for (const pattern of FORBIDDEN_PATTERNS) {
        const violation = checkLineForPattern(line, lineNumber, filePath, pattern);
        if (violation) {
          errors.push(violation);
        }
      }
    }
  }

  return {
    safe: errors.length === 0,
    errors,
    warnings,
  };
}

export function formatBuildGateResult(result: PtSafeCheckResult, totalFiles: number): string {
  const lines: string[] = [];
  lines.push(`Checking ${totalFiles} file${totalFiles !== 1 ? "s" : ""}...`);
  lines.push("");

  if (result.errors.length === 0) {
    lines.push("PASS: No PT-unsafe patterns found");
    return lines.join("\n");
  }

  lines.push("ERRORS:");
  for (const err of result.errors) {
    lines.push(`  - ${err.file}:${err.line} - ${err.message}`);
  }
  lines.push("");
  lines.push(`FAIL: ${result.errors.length} violation${result.errors.length !== 1 ? "s" : ""} found`);

  return lines.join("\n");
}
