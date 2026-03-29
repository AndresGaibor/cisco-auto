/**
 * LabExercise — defines a structured lab exercise with objectives, tasks, and constraints.
 *
 * Exercises are learner-facing units that guide a user through a networking
 * configuration goal in Packet Tracer, with validation at each step.
 */

import type { Hint } from "./hint.js";

// ============================================================================
// Objective — what the learner should achieve
// ============================================================================

export interface Objective {
  id: string;
  title: string;
  description: string;
  /** Optional verification check ID to confirm completion */
  verificationCheck?: string;
}

// ============================================================================
// Task — individual actionable step within an exercise
// ============================================================================

/**
 * TaskSpec — what command(s) or configuration should result from this task
 */
export interface TaskSpec {
  /** Device and port if applicable */
  device?: string;
  port?: string;
  /** Expected command patterns (regex) */
  expectedCommands?: string[];
  /** Expected configuration state after task is done */
  expectedState?: Record<string, unknown>;
  /** CLI context required (e.g., "global", "interface", "vlan") */
  requiredMode?: string;
}

/**
 * ExerciseTask — a single step the learner must complete
 */
export interface ExerciseTask {
  id: string;
  title: string;
  description: string;
  /** Hint group ID — used to retrieve progressive hints */
  hintGroupId: string;
  /** Specification of what the task requires */
  spec: TaskSpec;
  /** Dependencies: task IDs that must be complete first */
  dependsOn?: string[];
  /** Whether this task is blocking (must complete to continue) */
  blocking: boolean;
}

// ============================================================================
// Constraint — rules or restrictions for the exercise
// ============================================================================

export interface Constraint {
  id: string;
  type: "forbidden-command" | "required-command" | "max-attempts" | "time-limit" | "topology-lock";
  description: string;
  /** For forbidden/required commands: regex pattern */
  commandPattern?: string;
  device?: string;
  value?: number;
}

// ============================================================================
// LabExercise — the complete exercise definition
// ============================================================================

export interface LabExercise {
  id: string;
  title: string;
  description: string;
  /** Learning objectives for this exercise */
  objectives: Objective[];
  /** Ordered tasks the learner must complete */
  tasks: ExerciseTask[];
  /** Constraints that apply throughout the exercise */
  constraints: Constraint[];
  /** Device names that are in scope for this exercise */
  inScopeDevices: string[];
  /** Device names excluded from this exercise */
  outOfScopeDevices?: string[];
  /** Initial network state (optional baseline for reset) */
  baselineSnapshotId?: string;
  /** Metadata */
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes?: number;
}

// ============================================================================
// Factory helpers
// ============================================================================

export function createLabExercise(props: Omit<LabExercise, "tasks" | "constraints"> & {
  tasks?: ExerciseTask[];
  constraints?: Constraint[];
}): LabExercise {
  return {
    tasks: [],
    constraints: [],
    ...props,
  };
}

export function createObjective(
  id: string,
  title: string,
  description: string,
  verificationCheck?: string
): Objective {
  return { id, title, description, ...(verificationCheck && { verificationCheck }) };
}

export function createTask(
  id: string,
  title: string,
  description: string,
  hintGroupId: string,
  spec: TaskSpec,
  options?: { dependsOn?: string[]; blocking?: boolean }
): ExerciseTask {
  return {
    id,
    title,
    description,
    hintGroupId,
    spec,
    ...(options?.dependsOn && { dependsOn: options.dependsOn }),
    blocking: options?.blocking ?? true,
  };
}

export function createConstraint(
  id: string,
  type: Constraint["type"],
  description: string,
  options?: { commandPattern?: string; device?: string; value?: number }
): Constraint {
  return { id, type, description, ...options };
}
