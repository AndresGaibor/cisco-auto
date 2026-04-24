// ============================================================================
// Real Run Types - Modelo para corridas reales de verification
// ============================================================================
// Tipos para modelar la ejecución real de verification runs, scenarios y steps
// dentro del orchestration brain de pt-control.

import type { CapabilitySupportStatus, CleanupStatus, EnvironmentFingerprint } from "../omni/capability-types.js";

export type { EnvironmentFingerprint };

// ============================================================================
// Status y Outcomes
// ============================================================================

// Estado global de una corrida completa
export type RealRunStatus = "passed" | "partial" | "degraded" | "failed" | "aborted";

// Resultado de ejecucion de un step individual o scenario
export type ExecutionOutcome = "passed" | "partial" | "failed" | "recovered" | "skipped" | "aborted";

// Politica de recuperacion ante fallos
export type FailurePolicy =
  | "continue"           // Continuar con el siguiente step
  | "recover-and-continue" // Intentar recuperacion y continuar
  | "skip-dependent"     // Saltar steps que dependen del fallido
  | "abort-scenario"     // Abortar solo el scenario actual
  | "abort-run";         // Abortar toda la corrida

// Politica para manejar dependencias entre steps
export type DependencyPolicy = "skip-dependent" | "continue-independent";

// Salud del entorno de ejecucion
export type EnvironmentHealthStatus = "healthy" | "degraded" | "unusable";

// Nivel de confianza en la verificacion de un resultado
export type VerificationStrength = "observed" | "state-verified" | "behavior-verified" | "cross-verified";

// ============================================================================
// Entorno y Recuperacion
// ============================================================================

// Estado de salud del entorno de ejecucion
export interface RealEnvironmentHealth {
  status: EnvironmentHealthStatus;
  bridgeOk: boolean;
  snapshotOk: boolean;
  iosOk: boolean;
  hostTerminalOk: boolean;
  warnings: string[];
}

// Intento de recuperacion ante un fallo
export interface RealRecoveryAttempt {
  stepId: string;
  reason: string;
  attemptedAt: number;
  ok: boolean;
  notes?: string;
}

// ============================================================================
// Resultados Parciales
// ============================================================================

// Resultado de un step individual
export interface RealStepResult {
  stepId: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  outcome: ExecutionOutcome;
  warnings: string[];
  artifacts: string[];
  error?: string;
}

// Resultado completo de un scenario
export interface RealScenarioResult {
  scenarioId: string;
  title: string;
  profile: string[];
  tags: string[];
  startedAt: number;
  endedAt: number;
  durationMs: number;
  outcome: ExecutionOutcome;
  degraded: boolean;
  contaminated: boolean;
  failedSteps: string[];
  skippedSteps: string[];
  recoveryAttempts: RealRecoveryAttempt[];
  warnings: string[];
  artifacts: string[];
  verificationStrength: VerificationStrength;
  error?: string;
}

// ============================================================================
// Corrida Completa
// ============================================================================

// Manifiesto inicial de una corrida (metadata de inicio)
export interface RealRunManifest {
  runId: string;
  profile: string;
  label?: string;
  startedAt: number;
  endedAt?: number;
  status: RealRunStatus;
  continueOnError: boolean;
  attemptRecovery: boolean;
  maxRecoveryAttempts: number;
  environment: EnvironmentFingerprint;
  scenarioIds: string[];
  artifactsRoot: string;
  totalScenarios: number;
  totalSteps: number;
}

// Resumen consolidado de una corrida completada
export interface RealRunSummary {
  runId: string;
  profile: string;
  label?: string;
  status: RealRunStatus;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  scenarioCounts: {
    total: number;
    passed: number;
    partial: number;
    failed: number;
    recovered: number;
    skipped: number;
    aborted: number;
  };
  recoveryCounts: {
    attempted: number;
    succeeded: number;
    failed: number;
  };
  skippedCounts: number;
  fatalErrors: string[];
  warnings: string[];
  environmentDegraded: boolean;
  artifactsRoot: string;
  scenarios: RealScenarioResult[];
}

// ============================================================================
// Execution Source & Capability Results
// ============================================================================

// Fuente de ejecucion de un resultado
export type ExecutionSource = "scenario" | "capability" | "post-verification" | "topology-check" | "terminal-check";

// Resultado de una capability ejecutada dentro de una corrida real
export interface RealCapabilityResult {
  capabilityId: string;
  suiteId?: string;
  runId: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  outcome: ExecutionOutcome;
  supportStatus: CapabilitySupportStatus;
  verificationStrength: VerificationStrength;
  cleanupStatus: CleanupStatus;
  source: ExecutionSource;
  warnings: string[];
  errors: string[];
  recoveryAttempts: RealRecoveryAttempt[];
  artifacts: string[];
  confidence: number;
}

// Razon por la que se skippeo algo por dependencia
export interface DependencySkipReason {
  skippedId: string;
  dependedOnId: string;
  reason: string;
}

// Veredicto de verificacion cruzada
export interface CrossVerificationVerdict {
  ok: boolean;
  strength: VerificationStrength;
  sources: string[];
  details: string;
}

// Summary extendido con breakdown por capability
export interface RealRunSummaryExtended extends RealRunSummary {
  capabilityResults: RealCapabilityResult[];
  capabilityCounts: {
    total: number;
    passed: number;
    partial: number;
    failed: number;
    skipped: number;
    aborted: number;
  };
  verificationStrengthCounts: {
    observed: number;
    "state-verified": number;
    "behavior-verified": number;
    "cross-verified": number;
  };
  dependencySkips: DependencySkipReason[];
  crossVerifications: CrossVerificationVerdict[];
}
