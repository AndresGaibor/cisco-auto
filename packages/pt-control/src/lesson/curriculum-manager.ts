import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { DeviceTwin } from "../contracts/twin-types.js";

// ============================================================================
// Lesson Mode Types
// ============================================================================
//
// Lesson Mode provides a guided, interactive learning experience for
// network automation. Users progress through curriculum modules containing
// theory blocks and hands-on demo steps.
//
// Architecture:
// - CurriculumManager: loads and manages curriculum definitions
// - LessonEngine: executes lessons step-by-step on a device
// - TheoryBlock: renders educational content
// - DemoStep: plays pre-recorded demonstration sequences

// ============================================================================
// TheoryBlock — Educational Content Block
// ============================================================================

export const TheoryBlockSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  content: z.string(), // markdown or html content
  diagramType: z.enum(["ascii", "image", "none"]).default("none"),
  diagramContent: z.string().optional(), // ascii art or image url
});
export type TheoryBlock = z.infer<typeof TheoryBlockSchema>;

// ============================================================================
// DemoStep — Pre-recorded Demonstration Step
// ============================================================================

export const DemoStepSchema = z.object({
  id: z.string(),
  description: z.string(),
  /**
   * Command to execute (may be empty for info-only steps).
   * If empty, the step is considered "informational" and auto-advances.
   */
  command: z.string().optional(),
  /**
   * Expected output pattern (optional). Used for validation.
   */
  expectedOutput: z.string().optional(),
  /**
   * Delay in ms before auto-advancing to next step.
   * If 0 or undefined, step requires manual advancement.
   */
  autoAdvanceDelay: z.number().default(0),
  /**
   * Whether this step requires user acknowledgment to proceed.
   */
  requiresAck: z.boolean().default(false),
});
export type DemoStep = z.infer<typeof DemoStepSchema>;

// ============================================================================
// Step — Union of All Step Types
// ============================================================================

export const StepSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("theory"),
    ...TheoryBlockSchema.shape,
  }),
  z.object({
    type: z.literal("demo"),
    ...DemoStepSchema.shape,
  }),
]);
export type Step = z.infer<typeof StepSchema>;

// ============================================================================
// Lesson — A Learning Module
// ============================================================================

export const LessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  /**
   * Device family this lesson applies to.
   * @example "switch-l2" | "router" | "switch-l3"
   */
  targetDeviceFamily: z.string().optional(),
  /**
   * Minimum knowledge level required.
   * @example "beginner" | "intermediate" | "advanced"
   */
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  steps: z.array(StepSchema),
  /**
   * Tags for filtering/searching lessons.
   */
  tags: z.array(z.string()).default([]),
});
export type Lesson = z.infer<typeof LessonSchema>;

// ============================================================================
// Curriculum — Collection of Lessons
// ============================================================================

export const CurriculumSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string().default("1.0"),
  lessons: z.array(LessonSchema),
  metadata: z.object({
    author: z.string().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
  }).optional(),
});
export type Curriculum = z.infer<typeof CurriculumSchema>;

// ============================================================================
// CurriculumManager — Loads and Manages Curriculum Definitions
// ============================================================================

/**
 * CurriculumManager loads lesson curricula from JSON/YAML files
 * and provides access to lessons by ID.
 */
export class CurriculumManager {
  private curricula: Map<string, Curriculum> = new Map();

  /**
   * Load a curriculum from a JSON or YAML file.
   */
  async loadCurriculum(path: string): Promise<Curriculum> {
    const content = await readFile(path, "utf-8");
    const data = JSON.parse(content);
    const curriculum = CurriculumSchema.parse(data);

    this.curricula.set(curriculum.id, curriculum);
    return curriculum;
  }

  /**
   * Register a curriculum programmatically.
   */
  registerCurriculum(curriculum: Curriculum): void {
    this.curricula.set(curriculum.id, curriculum);
  }

  /**
   * Get a lesson by curriculum ID and lesson ID.
   */
  getLesson(curriculumId: string, lessonId: string): Lesson | null {
    const curriculum = this.curricula.get(curriculumId);
    if (!curriculum) return null;
    return curriculum.lessons.find(l => l.id === lessonId) ?? null;
  }

  /**
   * List all lessons in a curriculum.
   */
  listLessons(curriculumId: string): Lesson[] {
    const curriculum = this.curricula.get(curriculumId);
    return curriculum?.lessons ?? [];
  }

  /**
   * List all curricula.
   */
  listCurricula(): Curriculum[] {
    return [...this.curricula.values()];
  }

  /**
   * Find a lesson across all loaded curricula.
   */
  findLesson(lessonId: string): { curriculumId: string; lesson: Lesson } | null {
    for (const [curriculumId, curriculum] of this.curricula) {
      const lesson = curriculum.lessons.find(l => l.id === lessonId);
      if (lesson) {
        return { curriculumId, lesson };
      }
    }
    return null;
  }

  /**
   * Find lessons by tag.
   */
  findByTag(tag: string): Lesson[] {
    const results: Lesson[] = [];
    for (const curriculum of this.curricula.values()) {
      for (const lesson of curriculum.lessons) {
        if (lesson.tags.includes(tag)) {
          results.push(lesson);
        }
      }
    }
    return results;
  }

  /**
   * Find lessons by target device family.
   */
  findByDeviceFamily(family: string): Lesson[] {
    const results: Lesson[] = [];
    for (const curriculum of this.curricula.values()) {
      for (const lesson of curriculum.lessons) {
        if (lesson.targetDeviceFamily === family) {
          results.push(lesson);
        }
      }
    }
    return results;
  }
}
