/**
 * Validate types - Laboratory validation types
 */

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'structure' | 'physical' | 'logical' | 'topology' | 'best-practice';
  message: string;
  device?: string;
  connection?: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

export interface ValidateUseCaseResult {
  ok: boolean;
  data?: ValidationResult;
  error?: { message: string };
}