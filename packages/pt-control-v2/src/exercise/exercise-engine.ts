/**
 * ExerciseEngine — runs the exercise flow: present objective, execute, validate, feedback.
 *
 * Coordinates the learner's interaction loop: objective presentation,
 * command submission, step validation, and providing hints when requested.
 */

import type { LabExercise, ExerciseTask, Objective, Constraint } from "./lab-exercise.js";
import type { Hint } from "./hint.js";
import type { CommandResult } from "../domain/ios/session/command-result.js";

// ============================================================================
// Event types emitted during exercise flow
// ============================================================================

export type ExerciseEvent =
  | { type: "exercise-started"; exercise: LabExercise }
  | { type: "objective-presented"; objective: Objective }
  | { type: "task-started"; task: ExerciseTask }
  | { type: "command-submitted"; device: string; command: string }
  | { type: "command-result"; result: CommandResult }
  | { type: "step-validated"; taskId: string; result: ValidationResult }
  | { type: "task-completed"; taskId: string }
  | { type: "objective-completed"; objectiveId: string }
  | { type: "exercise-completed"; summary: ExerciseSummary }
  | { type: "exercise-failed"; reason: string }
  | { type: "hint-requested"; taskId: string; level: Hint["level"] }
  | { type: "constraint-violated"; constraintId: string; message: string };

// ============================================================================
// Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  message: string;
  details?: Record<string, unknown>;
  /** Task IDs that remain incomplete */
  remainingTasks?: string[];
}

export interface AttemptResult {
  accepted: boolean;
  message: string;
  hintsUsed: number;
  attemptsOnTask: number;
}

// ============================================================================
// Exercise state machine
// ============================================================================

export interface ExerciseState {
  exercise: LabExercise;
  currentObjectiveIndex: number;
  currentTaskIndex: number;
  completedTasks: Set<string>;
  completedObjectives: Set<string>;
  attemptsPerTask: Map<string, number>;
  hintsUsedPerTask: Map<string, number>;
  constraintViolations: string[];
  startedAt: number;
}

// ============================================================================
// ExerciseEngine
// ============================================================================

export class ExerciseEngine {
  private state: ExerciseState | null = null;
  private commandExecutor: CommandExecutor;

  constructor(executor: CommandExecutor) {
    this.commandExecutor = executor;
  }

  /**
   * Start an exercise and yield events as the flow progresses.
   * The caller iterates over the async generator to receive events.
   */
  async *start(exercise: LabExercise): AsyncGenerator<ExerciseEvent> {
    this.state = {
      exercise,
      currentObjectiveIndex: 0,
      currentTaskIndex: 0,
      completedTasks: new Set(),
      completedObjectives: new Set(),
      attemptsPerTask: new Map(),
      hintsUsedPerTask: new Map(),
      constraintViolations: [],
      startedAt: Date.now(),
    };

    yield { type: "exercise-started", exercise };

    // Present each objective and its tasks
    for (const objective of exercise.objectives) {
      yield { type: "objective-presented", objective };

      const objectiveTasks = exercise.tasks.filter((t) => {
        // Tasks belong to this objective if no dependsOn references a task from another objective
        // Simple heuristic: tasks are ordered, so we take contiguous blocks per objective
        return true; // TODO: link tasks to objectives via objectiveId field
      });

      for (const task of objectiveTasks) {
        yield { type: "task-started", task };
      }
    }

    // If no objectives, start with all tasks
    if (exercise.objectives.length === 0) {
      for (const task of exercise.tasks) {
        yield { type: "task-started", task };
      }
    }
  }

  /**
   * Submit a command for a device and return the result.
   */
  async submitCommand(device: string, command: string): Promise<CommandResult> {
    if (!this.state) {
      return { ok: false, raw: "", status: 1, error: "No exercise started" };
    }

    // Check constraints before executing
    const violation = this.checkConstraints(device, command);
    if (violation) {
      this.state.constraintViolations.push(violation.id);
      return {
        ok: false,
        raw: "",
        status: 1,
        error: `Constraint violated: ${violation.description}`,
      };
    }

    const result = await this.commandExecutor.execute(device, command);
    return result;
  }

  /**
   * Validate the current step (task) to determine if it is complete.
   */
  validateStep(taskId: string, attempt: string): ValidationResult {
    if (!this.state) {
      return { valid: false, message: "No exercise started" };
    }

    const task = this.state.exercise.tasks.find((t) => t.id === taskId);
    if (!task) {
      return { valid: false, message: `Task ${taskId} not found` };
    }

    // Check dependencies
    if (task.dependsOn) {
      for (const depId of task.dependsOn) {
        if (!this.state.completedTasks.has(depId)) {
          return {
            valid: false,
            message: `Task "${task.title}" depends on "${depId}" which is not complete`,
            remainingTasks: [depId],
          };
        }
      }
    }

    // Validate based on task spec
    const spec = task.spec;
    if (spec.expectedCommands && spec.expectedCommands.length > 0) {
      const matches = spec.expectedCommands.some((pattern) => {
        try {
          return new RegExp(pattern, "i").test(attempt);
        } catch {
          return pattern.toLowerCase() === attempt.toLowerCase();
        }
      });

      if (!matches) {
        return {
          valid: false,
          message: "The command does not match the expected configuration",
        };
      }
    }

    // Check required mode
    if (spec.requiredMode) {
      // Would be validated against actual CLI mode in real implementation
    }

    // Track attempts
    const attempts = this.state.attemptsPerTask.get(taskId) ?? 0;
    this.state.attemptsPerTask.set(taskId, attempts + 1);

    // Task is considered valid
    this.state.completedTasks.add(taskId);

    return {
      valid: true,
      message: `Task "${task.title}" completed successfully`,
    };
  }

  /**
   * Get hints for a task at a specific level
   */
  getHints(taskId: string, level: Hint["level"]): Hint[] {
    if (!this.state) return [];

    const task = this.state.exercise.tasks.find((t) => t.id === taskId);
    if (!task) return [];

    // In a full implementation, hints would be stored in a hint repository
    // keyed by hintGroupId. Here we return empty and delegate to TutorEngine.
    return [];
  }

  /**
   * Get current exercise state
   */
  getState(): ExerciseState | null {
    return this.state;
  }

  /**
   * Reset the exercise to initial state
   */
  reset(): void {
    this.state = null;
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  private checkConstraints(device: string, command: string): Constraint | null {
    if (!this.state) return null;

    for (const constraint of this.state.exercise.constraints) {
      if (constraint.type === "forbidden-command" && constraint.commandPattern) {
        try {
          if (new RegExp(constraint.commandPattern, "i").test(command)) {
            if (!constraint.device || constraint.device === device) {
              return constraint;
            }
          }
        } catch {
          // Invalid regex, skip
        }
      }

      if (constraint.type === "topology-lock" && constraint.device === device) {
        // Check if command modifies topology (add/remove links)
        if (/^no\s+(interface|link|cable)/i.test(command)) {
          return constraint;
        }
      }
    }

    return null;
  }
}

// ============================================================================
// Command executor abstraction
// ============================================================================

export interface CommandExecutor {
  execute(device: string, command: string): Promise<CommandResult>;
}

// ============================================================================
// Exercise summary
// ============================================================================

export interface ExerciseSummary {
  exerciseId: string;
  completedTasks: string[];
  remainingTasks: string[];
  totalTimeMs: number;
  hintsUsed: number;
  constraintViolations: number;
}
