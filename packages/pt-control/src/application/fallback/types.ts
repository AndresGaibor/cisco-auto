// Tipos para fallback - Política de recuperación

import type { Intent } from "../../contracts/intent";

export type Strategy = "primitive" | "terminal-plan" | "omni-capability" | "abort";

export interface FallbackPolicy {
  selectStrategy(intent: Intent, previousResult: any): Promise<Strategy>;
  shouldRetry(attempt: number, error: any): boolean;
}

export interface RiskGate {
  isRiskAllowed(risk: string): boolean;
}

export interface StrategySelector {
  selectStrategy(intent: Intent, availableStrategies: Strategy[]): Promise<Strategy>;
}