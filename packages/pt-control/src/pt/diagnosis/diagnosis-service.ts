// ============================================================================
// DiagnosisService - Orquestador de diagnóstico (feature killer)
// ============================================================================

import type {
  IDiagnosisService,
  Symptom,
  DiagnosisOptions,
  DiagnosisResult,
  IDiagnosisEngine,
} from './diagnosis-types.js';
import { DiagnosisEngine } from './diagnosis-engine.js';

/**
 * DiagnosisService - orchestrates diagnosis across all services
 */
export class DiagnosisService implements IDiagnosisService {
  private engine: DiagnosisEngine;
  private history: Map<string, DiagnosisResult> = new Map();
  private maxHistory: number = 100;

  constructor() {
    this.engine = new DiagnosisEngine();
  }

  /**
   * Set command executor (injected from outside)
   */
  setCommandExecutor(executor: (device: string, command: string) => Promise<string>): void {
    this.engine.setCommandExecutor(executor);
  }

  /**
   * Set diagnosis engine (for advanced integration)
   */
  setEngine(engine: IDiagnosisEngine): void {
    this.engine = engine as DiagnosisEngine;
  }

  /**
   * Diagnóstico principal - orquestación completa
   */
  async diagnose(symptoms: Symptom[], options: DiagnosisOptions = {}): Promise<DiagnosisResult> {
    // Run diagnosis using engine
    const result = await this.engine.diagnose(symptoms, options);
    
    // Store in history
    this.history.set(result.id, result);
    this.pruneHistory();

    return result;
  }

  /**
   * Obtener historial de diagnósticos
   */
  getHistory(): DiagnosisResult[] {
    return Array.from(this.history.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Obtener diagnóstico por ID
   */
  getById(id: string): DiagnosisResult | null {
    return this.history.get(id) || null;
  }

  /**
   * Obtener últimos diagnósticos por categoría
   */
  getByCategory(category: string): DiagnosisResult[] {
    return this.getHistory().filter(r => 
      r.rootCauses.some(rc => rc.category === category)
    );
  }

  /**
   * Obtener diagnósticos fallidos (baja probabilidad de resolución)
   */
  getUnresolved(limit: number = 10): DiagnosisResult[] {
    return this.getHistory()
      .filter(r => r.resolutionProbability < 0.7)
      .slice(0, limit);
  }

  /**
   * Limpiar historial
   */
  clearHistory(): void {
    this.history.clear();
  }

  /**
   * Obtener estadísticas de diagnósticos
   */
  getStats(): {
    total: number;
    avgResolutionProbability: number;
    byCategory: Record<string, number>;
    avgExecutionTimeMs: number;
  } {
    const results = this.getHistory();
    
    if (results.length === 0) {
      return {
        total: 0,
        avgResolutionProbability: 0,
        byCategory: {},
        avgExecutionTimeMs: 0,
      };
    }

    const avgProbability = results.reduce((a, b) => a + b.resolutionProbability, 0) / results.length;
    const avgTime = results.reduce((a, b) => a + b.executionTimeMs, 0) / results.length;

    const byCategory: Record<string, number> = {};
    for (const result of results) {
      for (const cause of result.rootCauses) {
        byCategory[cause.category] = (byCategory[cause.category] || 0) + 1;
      }
    }

    return {
      total: results.length,
      avgResolutionProbability: Math.round(avgProbability * 100) / 100,
      byCategory,
      avgExecutionTimeMs: Math.round(avgTime),
    };
  }

  /**
   * Exportar historial
   */
  export(): string {
    return JSON.stringify(this.getHistory(), null, 2);
  }

  /**
   * Importar historial
   */
  import(json: string): void {
    try {
      const results = JSON.parse(json) as DiagnosisResult[];
      for (const result of results) {
        this.history.set(result.id, result);
      }
      this.pruneHistory();
    } catch (error) {
      throw new Error(`Failed to import: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Podar historial si excede el límite
   */
  private pruneHistory(): void {
    if (this.history.size > this.maxHistory) {
      const sorted = this.getHistory();
      const toRemove = sorted.slice(this.maxHistory);
      for (const r of toRemove) {
        this.history.delete(r.id);
      }
    }
  }
}

/**
 * Factory
 */
export function createDiagnosisService(): DiagnosisService {
  return new DiagnosisService();
}