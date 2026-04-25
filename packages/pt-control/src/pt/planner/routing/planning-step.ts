// ============================================================================
// Routing Planner Types - Tipos compartidos para planners de routing
// ============================================================================

/**
 * Paso de planificación genérico
 */
export interface PlanningStep {
  device: string;
  command: string;
  expectMode?: string;
}