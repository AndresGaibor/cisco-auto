// ============================================================================
// Diagnostic Types for Validation Engine
// ============================================================================

export type DiagnosticSeverity = "info" | "warning" | "error";

export interface DiagnosticTarget {
  device?: string;
  interface?: string;
  field?: string;
  zone?: string;
}

export interface Diagnostic {
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  blocking: boolean;
  target?: DiagnosticTarget;
  suggestedFix?: string;
  related?: string[];
  metadata?: Record<string, unknown>;
}

export function createDiagnostic(params: {
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  blocking?: boolean;
  target?: DiagnosticTarget;
  suggestedFix?: string;
  related?: string[];
  metadata?: Record<string, unknown>;
}): Diagnostic {
  return {
    code: params.code,
    severity: params.severity,
    message: params.message,
    blocking: params.blocking ?? false,
    target: params.target,
    suggestedFix: params.suggestedFix,
    related: params.related,
    metadata: params.metadata,
  };
}
