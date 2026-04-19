// Tipos para planners - Define cómo transformar intents en planes

import type { Intent } from "../../contracts/intent";
import type { ExecutionPlan } from "../../contracts/plan";

export interface Planner {
  buildPlan(intent: Intent): Promise<ExecutionPlan | null>;
}

export interface TopologyPlanner extends Planner {
  buildTopologyPlan(intent: Intent): Promise<ExecutionPlan | null>;
}

export interface IosPlanner extends Planner {
  buildIosConfigPlan(intent: Intent): Promise<ExecutionPlan | null>;
}

export interface ServicePlanner extends Planner {
  buildServicePlan(intent: Intent): Promise<ExecutionPlan | null>;
}

export interface VerificationPlanner extends Planner {
  buildVerificationPlan(intent: Intent): Promise<ExecutionPlan | null>;
}

export interface OmniPlanner extends Planner {
  buildOmniPlan(intent: Intent): Promise<ExecutionPlan | null>;
}