// LabPlanPersistence - Persistencia y recuperación del estado de ejecución
// Fase 6: Persistencia de progreso del plan

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import type { LabPlan, LabOperation } from "./lab-plan-types.js";

export interface PlanExecutionState {
  planId: string;
  labSpecPath: string;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
  status: "pending" | "in-progress" | "completed" | "failed" | "cancelled";
  operations: OperationState[];
  summary: {
    total: number;
    completed: number;
    failed: number;
    skipped: number;
  };
  lastError?: string;
}

export interface OperationState {
  id: string;
  type: LabOperation["type"];
  status: "pending" | "in-progress" | "completed" | "failed" | "skipped";
  device?: string;
  resourceId?: string;
  executedAt?: number;
  completedAt?: number;
  error?: string;
  retryCount: number;
  result?: Record<string, unknown>;
}

export class LabPlanPersistence {
  private stateDir: string;

  constructor(stateDir?: string) {
    this.stateDir = stateDir ?? "./lab-state";
  }

  save(state: PlanExecutionState): void {
    const path = this.getStatePath(state.planId);
    this.ensureDir(dirname(path));
    state.updatedAt = Date.now();
    writeFileSync(path, JSON.stringify(state, null, 2), "utf-8");
  }

  load(planId: string): PlanExecutionState | null {
    const path = this.getStatePath(planId);
    if (!existsSync(path)) {
      return null;
    }
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content) as PlanExecutionState;
  }

  exists(planId: string): boolean {
    return existsSync(this.getStatePath(planId));
  }

  delete(planId: string): void {
    const path = this.getStatePath(planId);
    if (existsSync(path)) {
      const { unlinkSync } = require("node:fs");
      unlinkSync(path);
    }
  }

  list(): PlanExecutionState[] {
    const { readdirSync } = require("node:fs");
    if (!existsSync(this.stateDir)) {
      return [];
    }
    const files = readdirSync(this.stateDir).filter((f: string) => f.endsWith(".json"));
    return files
      .map((f: string) => {
        const content = readFileSync(resolve(this.stateDir, f), "utf-8");
        return JSON.parse(content) as PlanExecutionState;
      })
      .sort((a: PlanExecutionState, b: PlanExecutionState) => b.updatedAt - a.updatedAt);
  }

  createFromPlan(plan: LabPlan, labSpecPath: string): PlanExecutionState {
    return {
      planId: plan.planId,
      labSpecPath,
      startedAt: Date.now(),
      updatedAt: Date.now(),
      status: "pending",
      operations: plan.operations.map((op) => ({
        id: op.id,
        type: op.type,
        status: "pending",
        device: op.device,
        resourceId: op.resourceId,
        retryCount: 0,
      })),
      summary: {
        total: plan.operations.length,
        completed: 0,
        failed: 0,
        skipped: 0,
      },
    };
  }

  markOperationStarted(state: PlanExecutionState, operationId: string): PlanExecutionState {
    const operation = state.operations.find((op) => op.id === operationId);
    if (operation) {
      operation.status = "in-progress";
      operation.executedAt = Date.now();
    }
    state.status = "in-progress";
    this.save(state);
    return state;
  }

  markOperationCompleted(
    state: PlanExecutionState,
    operationId: string,
    result?: Record<string, unknown>
  ): PlanExecutionState {
    const operation = state.operations.find((op) => op.id === operationId);
    if (operation) {
      operation.status = "completed";
      operation.completedAt = Date.now();
      operation.result = result;
    }
    this.recalcSummary(state);
    this.save(state);
    return state;
  }

  markOperationFailed(
    state: PlanExecutionState,
    operationId: string,
    error: string
  ): PlanExecutionState {
    const operation = state.operations.find((op) => op.id === operationId);
    if (operation) {
      operation.status = "failed";
      operation.completedAt = Date.now();
      operation.error = error;
      operation.retryCount++;
    }
    this.recalcSummary(state);
    this.save(state);
    return state;
  }

  markOperationSkipped(state: PlanExecutionState, operationId: string): PlanExecutionState {
    const operation = state.operations.find((op) => op.id === operationId);
    if (operation) {
      operation.status = "skipped";
      operation.completedAt = Date.now();
    }
    this.recalcSummary(state);
    this.save(state);
    return state;
  }

  markCompleted(state: PlanExecutionState): PlanExecutionState {
    state.status = "completed";
    state.completedAt = Date.now();
    this.recalcSummary(state);
    this.save(state);
    return state;
  }

  markFailed(state: PlanExecutionState, error: string): PlanExecutionState {
    state.status = "failed";
    state.completedAt = Date.now();
    state.lastError = error;
    this.save(state);
    return state;
  }

  getPendingOperations(state: PlanExecutionState): OperationState[] {
    return state.operations.filter(
      (op) => op.status === "pending" || op.status === "in-progress"
    );
  }

  getResumeOperations(state: PlanExecutionState): OperationState[] {
    return state.operations.filter(
      (op) => op.status === "pending" || (op.status === "failed" && op.retryCount < 3)
    );
  }

  private recalcSummary(state: PlanExecutionState): void {
    state.summary = {
      total: state.operations.length,
      completed: state.operations.filter((op) => op.status === "completed").length,
      failed: state.operations.filter((op) => op.status === "failed").length,
      skipped: state.operations.filter((op) => op.status === "skipped").length,
    };
  }

  private getStatePath(planId: string): string {
    return resolve(this.stateDir, `${planId}.json`);
  }

  private ensureDir(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}
