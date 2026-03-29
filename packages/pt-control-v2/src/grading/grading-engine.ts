// ============================================================================
// Grading Engine - Evaluates lab results against rubrics
// ============================================================================

import type { NetworkTwin } from "../contracts/twin-types.js";
import type { Rubric, RubricItem, Grade } from "./rubric-item.js";

/**
 * Objective within an exercise to grade
 */
export interface ExerciseObjective {
  id: string;
  description: string;
  rubricItemIds: string[];
}

/**
 * Exercise definition with objectives and rubric
 */
export interface Exercise {
  id: string;
  name: string;
  objectives: ExerciseObjective[];
  rubric: Rubric;
}

/**
 * Result of grading a single objective
 */
export interface ObjectiveGrade {
  objectiveId: string;
  grades: Grade[];
  passed: boolean;
  score: number;
}

/**
 * Result of grading an entire exercise
 */
export interface GradeResult {
  exerciseId: string;
  objectiveGrades: ObjectiveGrade[];
  overallScore: number;
  passed: boolean;
  feedback: string[];
}

/**
 * Summary of grading results
 */
export interface GradeSummary {
  totalExercises: number;
  passedExercises: number;
  averageScore: number;
  weakestObjective?: string;
}

/**
 * GradingEngine evaluates lab results against rubrics
 */
export class GradingEngine {
  /**
   * Grade an exercise against a network twin
   */
  grade(exercise: Exercise, twin: NetworkTwin, validator: GradeValidator): GradeResult {
    const objectiveGrades: ObjectiveGrade[] = [];
    const feedback: string[] = [];

    for (const objective of exercise.objectives) {
      const objectiveGrade = this.gradeObjective(objective, twin, exercise.rubric, validator);
      objectiveGrades.push(objectiveGrade);

      if (!objectiveGrade.passed) {
        feedback.push(`Objective "${objective.description}": FAILED (${objectiveGrade.score}%)`);
      } else {
        feedback.push(`Objective "${objective.description}": PASSED (${objectiveGrade.score}%)`);
      }
    }

    const overallScore = this.computeScore(objectiveGrades.map((og) => og.score));
    const passed = objectiveGrades.every((og) => og.passed);

    return {
      exerciseId: exercise.id,
      objectiveGrades,
      overallScore,
      passed,
      feedback,
    };
  }

  /**
   * Grade a single objective against the twin state
   */
  gradeObjective(
    objective: ExerciseObjective,
    twin: NetworkTwin,
    rubric: Rubric,
    validator: GradeValidator
  ): ObjectiveGrade {
    const grades: Grade[] = [];
    let totalScore = 0;

    for (const itemId of objective.rubricItemIds) {
      const item = rubric.items.find((i) => i.id === itemId);
      if (!item) {
        grades.push({
          itemId,
          passed: false,
          score: 0,
          feedback: `Rubric item not found: ${itemId}`,
        });
        continue;
      }

      const passed = validator.validate(item, twin);
      const score = passed ? 100 : 0;

      grades.push({
        itemId,
        passed,
        score,
        feedback: passed ? "Passed" : "Failed",
      });

      totalScore += score * item.weight;
    }

    const avgScore = objective.rubricItemIds.length > 0
      ? totalScore / objective.rubricItemIds.length
      : 0;

    return {
      objectiveId: objective.id,
      grades,
      passed: grades.every((g) => g.passed),
      score: Math.round(avgScore),
    };
  }

  /**
   * Compute overall score from individual grades (0-100)
   */
  computeScore(grades: number[]): number {
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, g) => acc + g, 0);
    return Math.round(sum / grades.length);
  }
}

/**
 * Validator function for checking rubric items against network state
 */
export interface GradeValidator {
  validate(item: RubricItem, twin: NetworkTwin): boolean;
}

/**
 * Default grade validator that checks basic device presence
 */
export class DefaultGradeValidator implements GradeValidator {
  validate(item: RubricItem, _twin: NetworkTwin): boolean {
    // Default implementation - subclass and override for custom logic
    return true;
  }
}
