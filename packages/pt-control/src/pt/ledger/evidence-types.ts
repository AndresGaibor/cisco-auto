// ============================================================================
// Evidence Ledger - Types
// ============================================================================

/**
 * Tipo de resultado de operación
 */
export type OperationResult = 'success' | 'partial' | 'failed';

/**
 * Verificación de una operación
 */
export interface VerificationRecord {
  command: string;
  output: string;
  passed: boolean;
  pattern?: string;
  timestamp: Date;
}

/**
 * Evidencia de una operación
 */
export interface Evidence {
  type: 'command' | 'verification' | 'state' | 'error';
  data: string;
  timestamp: Date;
}

/**
 * Registro de operación completo
 */
export interface OperationRecord {
  id: string;
  timestamp: Date;
  intent: string;
  device: string;
  commands: string[];
  outputs: string[];
  verifications: VerificationRecord[];
  result: OperationResult;
  drift?: string[];
  durationMs?: number;
  error?: string;
}

/**
 * Query de operaciones
 */
export interface OperationQuery {
  device?: string;
  result?: OperationResult;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

/**
 * Interfaz del Evidence Ledger Service
 */
export interface IEvidenceLedgerService {
  record(op: Partial<OperationRecord>): string;
  get(operationId: string): OperationRecord | null;
  getByDevice(device: string): OperationRecord[];
  query(query: OperationQuery): OperationRecord[];
  explain(operationId: string): string;
  getStats(): EvidenceStats;
  clear(): void;
}

/**
 * Estadísticas del ledger
 */
export interface EvidenceStats {
  totalOperations: number;
  successCount: number;
  partialCount: number;
  failedCount: number;
  devices: string[];
  avgDurationMs: number;
}