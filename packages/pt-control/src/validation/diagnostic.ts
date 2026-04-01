/**
 * Diagnostic Types - Tipos para resultados de diagnóstico del sistema de validación
 */

export type DiagnosticSeverity = "info" | "warning" | "error";

export interface DiagnosticTarget {
  device?: string;
  interface?: string;
  link?: string;
  zone?: string;
}

export interface Diagnostic {
  code: string;
  severity: DiagnosticSeverity;
  blocking: boolean;
  message: string;
  target: DiagnosticTarget;
  metadata?: Record<string, unknown>;
}