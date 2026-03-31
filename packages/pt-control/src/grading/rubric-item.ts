// ============================================================================
// Rubric Item - Grading Criterion Types
// ============================================================================

/**
 * Individual grading criterion within a rubric
 */
export interface RubricItem {
  id: string;
  description: string;
  /** Weight of this item in the overall score (0-1) */
  weight: number;
  /** Human-readable criteria for passing */
  criteria: string;
}

/**
 * Collection of rubric items forming a complete grading rubric
 */
export interface Rubric {
  id: string;
  name: string;
  items: RubricItem[];
}

/**
 * Result of grading a single rubric item
 */
export interface Grade {
  itemId: string;
  passed: boolean;
  score: number;
  feedback?: string;
}
