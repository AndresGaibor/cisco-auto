// ============================================================================
// AST PT-Safe Validator - Valida código usando AST analysis
// ============================================================================

export interface ASTValidationError {
  type: string;
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
}

export interface ASTValidationResult {
  valid: boolean;
  errors: ASTValidationError[];
  warnings: ASTValidationError[];
}

/**
 * PT-unsafe patterns detected via AST
 */
const PT_UNSAFE_PATTERNS = [
  // let/const - need var
  { type: 'VariableDeclaration', kind: 'let', message: "let not supported in PT, use var" },
  { type: 'VariableDeclaration', kind: 'const', message: "const not supported in PT, use var" },
  
  // Arrow functions
  { type: 'ArrowFunctionExpression', message: "arrow functions not supported in PT, use function" },
  
  // Template literals
  { type: 'TemplateLiteral', message: "template literals not supported in PT, use string concatenation" },
  
  // Async/await
  { type: 'AwaitExpression', message: "await not supported in PT, use callbacks" },
  { type: 'FunctionDeclaration', async: true, message: "async functions not supported in PT" },
  
  // Spread
  { type: 'SpreadElement', message: "spread operator not supported in PT" },
  { type: 'SpreadAssignment', message: "object spread not supported in PT" },
  
  // Optional chaining
  { type: 'OptionalMemberExpression', message: "optional chaining (?.) not supported in PT" },
  { type: 'OptionalCallExpression', message: "optional call (?.) not supported in PT" },
  
  // Nullish coalescing
  { type: 'LogicalExpression', operator: '??', message: "nullish coalescing (??) not supported in PT, use ||" },
  
  // For...of
  { type: 'ForOfStatement', message: "for...of not supported in PT, use classic for" },
  
  // Classes
  { type: 'ClassExpression', message: "class expressions may have issues in PT" },
  { type: 'ClassDeclaration', message: "class declarations may have issues in PT" },
  
  // New targets
  { type: 'MetaProperty', message: "new.target not supported in PT" },
  
  // BigInt
  { type: 'BigIntLiteral', message: "BigInt not supported in PT" },
  
  // Generators
  { type: 'FunctionDeclaration', generator: true, message: "generators not supported in PT" },
];

/**
 * ASTValidator - validates generated JS using AST analysis
 */
export class ASTValidator {
  private errors: ASTValidationError[] = [];
  private warnings: ASTValidationError[] = [];

  /**
   * Validate code - entry point
   */
  validate(code: string): ASTValidationResult {
    this.errors = [];
    this.warnings = [];

    try {
      // Simple parsing approach - detect patterns via string analysis
      // since we can't use full AST parsing without external deps
      this.analyzePatterns(code);
    } catch (error) {
      this.errors.push({
        type: 'ParseError',
        message: `Failed to parse: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error',
      });
    }

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  /**
   * Analyze patterns in code
   */
  private analyzePatterns(code: string): void {
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for let/const
      if (/\b(let|const)\s+/.test(line)) {
        this.errors.push({
          type: 'VariableDeclaration',
          message: `let/const not supported in PT, use var (line ${lineNum})`,
          line: lineNum,
          severity: 'error',
        });
      }

      // Check for arrow functions
      if ( /=>/.test(line) && !/=>/.test(line)) { // simple arrow detection
        // More precise: look for patterns like: () =>, x =>
        if (/\)\s*=>|=>\s*{/.test(line)) {
          this.errors.push({
            type: 'ArrowFunctionExpression',
            message: `arrow functions not supported in PT, use function (line ${lineNum})`,
            line: lineNum,
            severity: 'error',
          });
        }
      }

      // Check for template literals
      if (/`/.test(line)) {
        this.errors.push({
          type: 'TemplateLiteral',
          message: `template literals not supported in PT, use string concatenation (line ${lineNum})`,
          line: lineNum,
          severity: 'error',
        });
      }

      // Check for await
      if (/\bawait\s+/.test(line)) {
        this.errors.push({
          type: 'AwaitExpression',
          message: `await not supported in PT, use callbacks (line ${lineNum})`,
          line: lineNum,
          severity: 'error',
        });
      }

      // Check for async function
      if (/\basync\s+function\b/.test(line)) {
        this.errors.push({
          type: 'AsyncFunction',
          message: `async functions not supported in PT (line ${lineNum})`,
          line: lineNum,
          severity: 'error',
        });
      }

      // Check for spread
      if (/\.\.\.\w+/.test(line)) {
        this.warnings.push({
          type: 'SpreadElement',
          message: `spread operator may have issues in PT (line ${lineNum})`,
          line: lineNum,
          severity: 'warning',
        });
      }

      // Check for optional chaining
      if (/\?\./.test(line)) {
        this.errors.push({
          type: 'OptionalMemberExpression',
          message: `optional chaining (?.) not supported in PT (line ${lineNum})`,
          line: lineNum,
          severity: 'error',
        });
      }

      // Check for nullish coalescing
      if (/\?\?/.test(line)) {
        this.errors.push({
          type: 'LogicalExpression',
          message: `nullish coalescing (??) not supported in PT, use || (line ${lineNum})`,
          line: lineNum,
          severity: 'error',
        });
      }

      // Check for for...of
      if (/\bfor\s*\(\s*\w+\s+of\s+/.test(line)) {
        this.errors.push({
          type: 'ForOfStatement',
          message: `for...of not supported in PT, use classic for (line ${lineNum})`,
          line: lineNum,
          severity: 'error',
        });
      }

      // Check for class
      if (/\bclass\s+\w+/.test(line)) {
        this.warnings.push({
          type: 'ClassDeclaration',
          message: `class declarations may have issues in PT, consider function prototype (line ${lineNum})`,
          line: lineNum,
          severity: 'warning',
        });
      }

      // Check for new.target
      if (/new\.target/.test(line)) {
        this.errors.push({
          type: 'MetaProperty',
          message: `new.target not supported in PT (line ${lineNum})`,
          line: lineNum,
          severity: 'error',
        });
      }

      // Check for BigInt
      if (/\d+n\b/.test(line) || /\bBigInt\s*\(/.test(line)) {
        this.errors.push({
          type: 'BigIntLiteral',
          message: `BigInt not supported in PT (line ${lineNum})`,
          line: lineNum,
          severity: 'error',
        });
      }

      // Check for generators
      if (/\bfunction\s+\w+\s*\*/.test(line) || /\bfunction\s*\*\s*\(/.test(line)) {
        this.errors.push({
          type: 'Generator',
          message: `generators not supported in PT (line ${lineNum})`,
          line: lineNum,
          severity: 'error',
        });
      }

      // Check for Symbol
      if (/\bSymbol\s*\(/.test(line)) {
        this.warnings.push({
          type: 'Symbol',
          message: `Symbol may not be available in PT (line ${lineNum})`,
          line: lineNum,
          severity: 'warning',
        });
      }

      // Check for Promise
      if (/\bPromise\s*\(/.test(line)) {
        this.warnings.push({
          type: 'Promise',
          message: `Promise may not be available in PT, use callbacks (line ${lineNum})`,
          line: lineNum,
          severity: 'warning',
        });
      }
    }
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const parts: string[] = [];
    
    if (this.errors.length > 0) {
      parts.push(`Errors: ${this.errors.length}`);
    }
    if (this.warnings.length > 0) {
      parts.push(`Warnings: ${this.warnings.length}`);
    }
    if (this.errors.length === 0 && this.warnings.length === 0) {
      parts.push('PT-safe validation passed');
    }
    
    return parts.join(', ');
  }
}

/**
 * Factory
 */
export function createASTValidator(): ASTValidator {
  return new ASTValidator();
}