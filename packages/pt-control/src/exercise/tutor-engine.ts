/**
 * TutorEngine — provides contextual guidance without giving away answers.
 *
 * Guides the learner through exercises with progressive hints and
 * contextual feedback. Does not evaluate correctness directly;
 * that is handled by ExerciseEngine.
 */

import type { ExerciseTask } from "./lab-exercise.js";
import type { Hint } from "./hint.js";
import type { ExerciseEvent, AttemptResult } from "./exercise-engine.js";

// ============================================================================
// Attempt result
// ============================================================================

export interface TutorAttemptResult {
  feedback: string;
  hintsGiven: number;
  hintsRemaining: number;
  accepted: boolean;
}

// ============================================================================
// Progressive hint cache per task
// ============================================================================

interface HintCache {
  vague: Hint[];
  moderate: Hint[];
  explicit: Hint[];
}

// ============================================================================
// TutorEngine
// ============================================================================

export class TutorEngine {
  private hintCache: Map<string, HintCache> = new Map();
  private eventLog: ExerciseEvent[] = [];
  private hintsGivenPerTask: Map<string, number> = new Map();

  constructor(private hintRepository?: HintRepository) {}

  /**
   * Guide based on the current event — returns contextual message or null.
   * Called after each exercise event to provide inline guidance.
   */
  guide(event: ExerciseEvent): string | null {
    this.eventLog.push(event);

    switch (event.type) {
      case "exercise-started":
        return `Starting exercise: ${event.exercise.title}. ${event.exercise.description}`;

      case "objective-presented":
        return `Objective: ${event.objective.title}. ${event.objective.description}`;

      case "task-started":
        return this.guideTaskStart(event.task);

      case "command-result":
        return this.guideCommandResult(event.result);

      case "constraint-violated":
        return `Constraint violated: ${event.message}. Try a different approach.`;

      case "hint-requested":
        return this.guideHintRequest(event.taskId, event.level);

      default:
        return null;
    }
  }

  /**
   * Get progressive hints for a task at all three levels.
   * Returns an array of 3 hints: [vague, moderate, explicit].
   */
  getProgressiveHints(task: ExerciseTask): Hint[] {
    const cached = this.hintCache.get(task.hintGroupId);
    if (cached) {
      return [cached.vague[0]!, cached.moderate[0]!, cached.explicit[0]!];
    }

    // Generate hints from repository or create defaults
    const hints = this.hintRepository?.getHints(task.hintGroupId);
    if (hints) {
      return hints;
    }

    // Default hints based on task description
    return this.generateDefaultHints(task);
  }

  /**
   * Evaluate a learner's attempt at a task.
   * Returns feedback and determines if the attempt is acceptable.
   */
  evaluateAttempt(task: ExerciseTask, attempt: string): TutorAttemptResult {
    const hints = this.getProgressiveHints(task);
    const hintsGiven = this.hintsGivenPerTask.get(task.id) ?? 0;

    // Normalize attempt
    const normalized = attempt.trim().toLowerCase();

    // Check for empty input
    if (!normalized) {
      return {
        feedback: "Please enter a command. If you're unsure, request a hint.",
        hintsGiven: 0,
        hintsRemaining: hints.length,
        accepted: false,
      };
    }

    // Check if the attempt looks like a valid IOS command structure
    const isValidStructure = this.isValidIosCommandStructure(normalized, task);

    if (!isValidStructure) {
      const hintLevel = hintsGiven === 0 ? "vague" : hintsGiven === 1 ? "moderate" : "explicit";
      return {
        feedback: `That command doesn't look right for this task. ${this.getHintPrompt(hintLevel)}`,
        hintsGiven,
        hintsRemaining: hints.length - hintsGiven,
        accepted: false,
      };
    }

    // Command structure is valid but we don't evaluate correctness here
    // That is ExerciseEngine's job
    return {
      feedback: "Command structure looks good. Submit it to validate.",
      hintsGiven,
      hintsRemaining: hints.length - hintsGiven,
      accepted: true,
    };
  }

  /**
   * Record that hints were given for a task
   */
  recordHintsGiven(taskId: string, count: number): void {
    const current = this.hintsGivenPerTask.get(taskId) ?? 0;
    this.hintsGivenPerTask.set(taskId, current + count);
  }

  /**
   * Get the number of hints used for a task
   */
  hintsUsedForTask(taskId: string): number {
    return this.hintsGivenPerTask.get(taskId) ?? 0;
  }

  /**
   * Clear all recorded state
   */
  reset(): void {
    this.eventLog = [];
    this.hintsGivenPerTask.clear();
  }

  // ==========================================================================
  // Private guidance helpers
  // ==========================================================================

  private guideTaskStart(task: ExerciseTask): string {
    const hints = this.getProgressiveHints(task);
    const hasHints = hints.length > 0;

    let guide = `${task.description}`;
    if (hasHints) {
      guide += ` Type 'hint' if you need help.`;
    }
    return guide;
  }

  private guideCommandResult(result: { ok: boolean; raw: string; error?: string }): string | null {
    if (!result.ok && result.error) {
      return `Error: ${result.error}`;
    }

    if (result.raw.includes("%") && result.raw.toUpperCase().includes("ERROR")) {
      return "The device returned an error. Check the command syntax.";
    }

    if (result.raw.toUpperCase().includes("INVALID")) {
      return "Invalid command. Check for typos or missing parameters.";
    }

    if (result.raw.toUpperCase().includes("INCOMPLETE")) {
      return "The command is incomplete. Check what parameters are required.";
    }

    return null;
  }

  private guideHintRequest(taskId: string, level: Hint["level"]): string | null {
    const hintsGiven = this.hintsGivenPerTask.get(taskId) ?? 0;
    const levelIndex = { vague: 0, moderate: 1, explicit: 2 }[level];

    if (hintsGiven >= levelIndex + 1) {
      // Already gave this level
      return null;
    }

    // Return the hint at the requested level
    // The actual hint is retrieved via getProgressiveHints
    return null;
  }

  private getHintPrompt(level: Hint["level"]): string {
    switch (level) {
      case "vague":
        return "Consider reviewing the concept: what parameters does this configuration need?";
      case "moderate":
        return "Look at the command mode and required parameters for this configuration.";
      case "explicit":
        return "The hint shows the general approach, not the exact command.";
    }
  }

  private isValidIosCommandStructure(cmd: string, task: ExerciseTask): boolean {
    // Basic structural checks
    const spec = task.spec;

    // If required mode is specified, check command starts with expected prefix
    if (spec.requiredMode) {
      const modePrefixes: Record<string, string[]> = {
        global: ["router", "ip", "interface", "vlan", "line", "hostname", "enable", "service"],
        "interface": ["ip", "description", "shutdown", "no", "switchport", "spanning-tree"],
        "router": ["network", "redistribute", "passive-interface", "default", "no"],
        "vlan": ["name", "no"],
        "line": ["password", "login", "no", "transport"],
      };

      const prefixes = modePrefixes[spec.requiredMode] ?? [];
      if (prefixes.length > 0) {
        const startsWithPrefix = prefixes.some((p) => cmd.startsWith(p));
        // Allow "no " prefix commands even in strict mode
        const isNoCommand = cmd.startsWith("no ");
        if (!startsWithPrefix && !isNoCommand) {
          return false;
        }
      }
    }

    // Command should not be empty or just whitespace
    if (!cmd.trim()) return false;

    // Should be reasonable length
    if (cmd.length > 200) return false;

    return true;
  }

  private generateDefaultHints(task: ExerciseTask): Hint[] {
    // Generate basic hints based on task description and spec
    const spec = task.spec;

    return [
      {
        level: "vague" as const,
        text: `For this task, consider what configuration mode you need and what parameters are required.`,
        ...(spec.device && { codeSnippet: `# Make sure you're on ${spec.device}` }),
      },
      {
        level: "moderate" as const,
        text: `This task requires configuring ${spec.requiredMode ?? "the device"} with specific parameters.`,
        ...(spec.requiredMode && { codeSnippet: `config t\n${spec.requiredMode === "interface" ? `(config)# interface <name>` : `(config)# ${spec.requiredMode} <params>`}` }),
      },
      {
        level: "explicit" as const,
        text: `Review the task description carefully and check the expected commands in the lab objectives.`,
      },
    ];
  }
}

// ============================================================================
// Hint repository interface
// ============================================================================

export interface HintRepository {
  getHints(hintGroupId: string): Hint[];
}
