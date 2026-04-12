// ============================================================================
// EvidenceLedgerService - Trazabilidad completa de operaciones
// ============================================================================

import type {
  IEvidenceLedgerService,
  OperationRecord,
  OperationResult,
  OperationQuery,
  EvidenceStats,
  VerificationRecord,
} from './evidence-types.js';

/**
 * EvidenceLedgerService - maintains complete operation traceability
 */
export class EvidenceLedgerService implements IEvidenceLedgerService {
  private records: Map<string, OperationRecord> = new Map();
  private deviceIndex: Map<string, Set<string>> = new Map(); // device -> operation IDs

  /**
   * Registrar operación
   */
  record(op: Partial<OperationRecord>): string {
    const id = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const record: OperationRecord = {
      id,
      timestamp: new Date(),
      intent: op.intent || 'unknown',
      device: op.device || 'unknown',
      commands: op.commands || [],
      outputs: op.outputs || [],
      verifications: op.verifications || [],
      result: op.result || 'failed',
      drift: op.drift,
      durationMs: op.durationMs,
      error: op.error,
    };

    this.records.set(id, record);

    // Index by device
    if (!this.deviceIndex.has(record.device)) {
      this.deviceIndex.set(record.device, new Set());
    }
    this.deviceIndex.get(record.device)!.add(id);

    return id;
  }

  /**
   * Obtener operación por ID
   */
  get(operationId: string): OperationRecord | null {
    return this.records.get(operationId) || null;
  }

  /**
   * Obtener operaciones por device
   */
  getByDevice(device: string): OperationRecord[] {
    const ids = this.deviceIndex.get(device);
    if (!ids) return [];
    
    return Array.from(ids)
      .map(id => this.records.get(id))
      .filter((r): r is OperationRecord => r !== undefined)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Query de operaciones
   */
  query(query: OperationQuery): OperationRecord[] {
    let results = Array.from(this.records.values());

    if (query.device) {
      results = results.filter(r => r.device === query.device);
    }

    if (query.result) {
      results = results.filter(r => r.result === query.result);
    }

    if (query.startDate) {
      results = results.filter(r => r.timestamp >= query.startDate!);
    }

    if (query.endDate) {
      results = results.filter(r => r.timestamp <= query.endDate!);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Explicar resultado de operación
   */
  explain(operationId: string): string {
    const record = this.records.get(operationId);
    if (!record) {
      return `Operation ${operationId} not found`;
    }

    const parts: string[] = [];
    
    parts.push(`Operation: ${record.intent}`);
    parts.push(`Device: ${record.device}`);
    parts.push(`Result: ${record.result.toUpperCase()}`);
    parts.push(`Time: ${record.timestamp.toISOString()}`);

    if (record.durationMs) {
      parts.push(`Duration: ${record.durationMs}ms`);
    }

    parts.push(`\nCommands executed (${record.commands.length}):`);
    for (const cmd of record.commands) {
      parts.push(`  - ${cmd}`);
    }

    if (record.verifications.length > 0) {
      parts.push(`\nVerifications:`);
      for (const v of record.verifications) {
        const status = v.passed ? '✓' : '✗';
        parts.push(`  ${status} ${v.command}: ${v.passed ? 'passed' : 'failed'}`);
      }
    }

    if (record.drift && record.drift.length > 0) {
      parts.push(`\nDrift detected:`);
      for (const d of record.drift) {
        parts.push(`  - ${d}`);
      }
    }

    if (record.error) {
      parts.push(`\nError: ${record.error}`);
    }

    return parts.join('\n');
  }

  /**
   * Obtener estadísticas
   */
  getStats(): EvidenceStats {
    const records = Array.from(this.records.values());
    
    const successCount = records.filter(r => r.result === 'success').length;
    const partialCount = records.filter(r => r.result === 'partial').length;
    const failedCount = records.filter(r => r.result === 'failed').length;

    const durations = records
      .filter(r => r.durationMs !== undefined)
      .map(r => r.durationMs!);
    
    const avgDurationMs = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    return {
      totalOperations: records.length,
      successCount,
      partialCount,
      failedCount,
      devices: Array.from(this.deviceIndex.keys()),
      avgDurationMs: Math.round(avgDurationMs),
    };
  }

  /**
   * Limpiar todos los registros
   */
  clear(): void {
    this.records.clear();
    this.deviceIndex.clear();
  }

  /**
   * Obtener operación más reciente por device
   */
  getLatestByDevice(device: string): OperationRecord | null {
    const records = this.getByDevice(device);
    return records.length > 0 ? records[0] : null;
  }

  /**
   * Obtener operaciones fallidas recientes
   */
  getRecentFailures(limit: number = 10): OperationRecord[] {
    return this.query({ result: 'failed', limit });
  }

  /**
   * Exportar registros como JSON
   */
  export(): string {
    return JSON.stringify(Array.from(this.records.values()), null, 2);
  }

  /**
   * Importar registros desde JSON
   */
  import(json: string): void {
    try {
      const records = JSON.parse(json) as OperationRecord[];
      for (const record of records) {
        this.records.set(record.id, record);
        
        if (!this.deviceIndex.has(record.device)) {
          this.deviceIndex.set(record.device, new Set());
        }
        this.deviceIndex.get(record.device)!.add(record.id);
      }
    } catch (error) {
      throw new Error(`Failed to import: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Factory
 */
export function createEvidenceLedgerService(): EvidenceLedgerService {
  return new EvidenceLedgerService();
}