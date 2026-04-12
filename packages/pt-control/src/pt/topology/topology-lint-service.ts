// ============================================================================
// TopologyLintService - Orquestador principal de topology lint
// ============================================================================

import type {
  ITopologyLintService,
  TopologyBlueprint,
  NetworkOperation,
  LintResult,
  DriftQueryResult,
  LintRule,
  ObservedState,
} from './topology-lint-types.js';
import { BlueprintStore } from './blueprint-store.js';
import { LintRuleEngine } from './lint-rule-engine.js';
import { DriftDetector } from './drift-detector.js';

/**
 * TopologyLintService - orchestrates topology linting and drift detection
 */
export class TopologyLintService implements ITopologyLintService {
  private blueprintStore: BlueprintStore;
  private lintEngine: LintRuleEngine;
  private driftDetector: DriftDetector;
  private observedState: ObservedState | null = null;

  constructor() {
    this.blueprintStore = new BlueprintStore();
    this.lintEngine = new LintRuleEngine();
    this.driftDetector = new DriftDetector();
  }

  /**
   * Registrar operación (construcción incremental del blueprint)
   */
  recordOperation(op: Omit<NetworkOperation, 'id' | 'timestamp'>): void {
    this.blueprintStore.recordOperation(op);
  }

  /**
   * Ejecutar lint completo
   */
  async lint(): Promise<LintResult[]> {
    const blueprint = this.blueprintStore.getBlueprint();
    const observed = this.observedState || this.createEmptyObservedState();

    // Run lint rules
    const results = this.lintEngine.run(blueprint, observed);

    // Also run drift detection
    const drift = this.driftDetector.compare(blueprint, observed);
    
    // Add drift results
    results.push(...drift.missing);
    results.push(...drift.conflicts);
    results.push(...drift.stale);

    return results;
  }

  /**
   * Query drift para entidad específica
   */
  async queryDrift(entity: string): Promise<DriftQueryResult> {
    const blueprint = this.blueprintStore.getBlueprint();
    const observed = this.observedState || this.createEmptyObservedState();

    return this.driftDetector.query(blueprint, observed, entity);
  }

  /**
   * Obtener blueprint actual
   */
  getBlueprint(): TopologyBlueprint {
    return this.blueprintStore.getBlueprint();
  }

  /**
   * Listar reglas disponibles
   */
  listRules(): LintRule[] {
    return this.lintEngine.getRules();
  }

  /**
   * Establecer estado observado (para comparación)
   */
  setObservedState(state: ObservedState): void {
    this.observedState = state;
  }

  /**
   * Obtener operaciones registradas
   */
  getOperations(): NetworkOperation[] {
    return this.blueprintStore.getOperations();
  }

  /**
   * Obtener operaciones por tipo
   */
  getOperationsByType(type: string): NetworkOperation[] {
    return this.blueprintStore.getOperationsByType(type);
  }

  /**
   * Obtener operaciones por device
   */
  getOperationsByDevice(device: string): NetworkOperation[] {
    return this.blueprintStore.getOperationsByDevice(device);
  }

  /**
   * Limpiar blueprint
   */
  clear(): void {
    this.blueprintStore.clear();
  }

  /**
   * Crear estado observado vacío
   */
  private createEmptyObservedState(): ObservedState {
    return {
      devices: {},
      links: [],
      vlans: [],
      routes: [],
      dhcpPools: [],
      acls: [],
    };
  }
}

/**
 * Factory para crear TopologyLintService
 */
export function createTopologyLintService(): TopologyLintService {
  return new TopologyLintService();
}