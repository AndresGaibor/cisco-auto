/**
 * Lint Rule Engine - Ejecuta todas las reglas de lint
 */

import type {
  LintRule,
  LintResult,
  TopologyBlueprint,
  ObservedState,
} from './topology-lint-types.js';
import { buildRuleRegistry } from './rule-registry.js';

/**
 * LintRuleEngine - ejecuta todas las reglas de lint
 */
export class LintRuleEngine {
  private readonly rules: LintRule[];

  constructor() {
    this.rules = buildRuleRegistry();
  }

  /**
   * Obtener todas las reglas
   */
  getRules(): LintRule[] {
    return [...this.rules];
  }

  /**
   * Ejecutar todas las reglas
   */
  run(blueprint: TopologyBlueprint, observed: ObservedState): LintResult[] {
    const results: LintResult[] = [];

    for (const rule of this.rules) {
      try {
        const ruleResults = rule.check(blueprint, observed);
        results.push(...ruleResults);
      } catch (error) {
        console.warn(`Rule ${rule.id} failed:`, error);
      }
    }

    return results;
  }
}