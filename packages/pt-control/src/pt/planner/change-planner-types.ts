// ============================================================================
// Change Planner - Types
// ============================================================================

/**
 * Tipo de operación de alto nivel
 */
export type OperationIntentType = 
  | 'router-on-a-stick'
  | 'vlan-segmentation'
  | 'dhcp-service'
  | 'routing-protocol'
  | 'acl-security'
  | 'site-to-site-vpn'
  | 'trunk-connection'
  | 'access-layer';

/**
 * Intención de operación de alto nivel
 */
export interface OperationIntent {
  type: OperationIntentType;
  devices: string[];
  parameters: Record<string, unknown>;
}

/**
 * Tipo de superficie de ejecución
 */
export type ExecutionSurface = 'ios' | 'hostport' | 'dhcp-appliance';

/**
 * Precheck - validación previa a la ejecución
 */
export interface Precheck {
  type: 'capability' | 'topology' | 'connectivity' | 'state';
  device?: string;
  check: string;
  required: boolean;
}

/**
 * Paso diferido del plan
 */
export interface DeferredStep {
  order: number;
  surface: ExecutionSurface;
  device: string;
  commands: string[];
  verification?: VerificationConfig;
  timeout: number;
  onError?: 'abort' | 'retry' | 'continue';
}

/**
 * Configuración de verificación
 */
export interface VerificationConfig {
  command: string;
  expectedPattern?: string;
  unexpectedPatterns?: string[];
  timeout?: number;
}

/**
 * Checkpoint - punto de verificación en el plan
 */
export interface Checkpoint {
  step: number;
  verify: string;
  onFail: 'rollback' | 'warn' | 'abort';
}

/**
 * Configuración de rollback
 */
export interface RollbackConfig {
  onStepFail: number;
  actions: string[];
  targetSurface?: ExecutionSurface;
}

/**
 * Plan de job diferido completo
 */
export interface DeferredJobPlan {
  id: string;
  intent: OperationIntent;
  prechecks: Precheck[];
  steps: DeferredStep[];
  checkpoints: Checkpoint[];
  rollback?: RollbackConfig;
  estimatedDuration?: number;
}

/**
 * Resultado de ejecución del plan
 */
export interface ExecutionResult {
  planId: string;
  success: boolean;
  completedSteps: number;
  failedStep?: number;
  errors: string[];
  verificationsPassed: boolean;
  executedAt: Date;
}

/**
 * Resultado de rollback
 */
export interface RollbackResult {
  planId: string;
  success: boolean;
  rolledBackSteps: number;
  remainingErrors: string[];
  executedAt: Date;
}

/**
 * Estado de ejecución
 */
export type ExecutionState = 'pending' | 'running' | 'completed' | 'failed' | 'rolled-back';

/**
 * Instancia de ejecución del plan
 */
export interface PlanExecutionInstance {
  id: string;
  plan: DeferredJobPlan;
  state: ExecutionState;
  currentStep: number;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Interfaz del Change Planner Service
 */
export interface IChangePlannerService {
  compileOperation(intent: OperationIntent): DeferredJobPlan;
  executeWithCheckpoint(plan: DeferredJobPlan): Promise<ExecutionResult>;
  rollback(plan: DeferredJobPlan, failureAt: number): Promise<RollbackResult>;
  getPlan(planId: string): DeferredJobPlan | null;
  listPlans(): DeferredJobPlan[];
}