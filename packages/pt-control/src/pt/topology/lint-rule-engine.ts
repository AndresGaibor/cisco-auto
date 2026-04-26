// ============================================================================
// LintRuleEngine - Thin re-export for backwards compatibility
// ============================================================================

/**
 * @deprecated Use import from './lint/rule-engine.js' instead
 */
export { LintRuleEngine } from './lint/rule-engine.js';

export type {
  LintRule,
  LintResult,
  TopologyBlueprint,
  ObservedState,
} from './topology-lint-types.js';