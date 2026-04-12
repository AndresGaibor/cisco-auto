// ============================================================================
// Diagnosis Service - Types
// ============================================================================

/**
 * Categoría de diagnóstico
 */
export type DiagnosisCategory = 
  | 'connectivity'
  | 'routing'
  | 'switching'
  | 'dhcp'
  | 'acl'
  | 'interface'
  | 'configuration';

/**
 * Nivel de severidad
 */
export type Severity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Síntoma reportado
 */
export interface Symptom {
  type: 'ping-fails' | 'no-dhcp' | 'no-access' | 'slow-performance' | 'packet-loss' | 'acl-block' | 'unknown';
  devices?: string[];
  interfaces?: string[];
  details?: string;
}

/**
 * Información de diagnóstico de un dispositivo
 */
export interface DeviceDiagnosis {
  device: string;
  issues: DeviceIssue[];
  checks: DiagnosticCheck[];
}

/**
 * Issue específico de dispositivo
 */
export interface DeviceIssue {
  category: DiagnosisCategory;
  severity: Severity;
  description: string;
  likelyCause: string;
  evidence: string[];
  recommendedAction: string;
}

/**
 * Verificación de diagnóstico
 */
export interface DiagnosticCheck {
  name: string;
  passed: boolean;
  output?: string;
  expected?: string;
}

/**
 * Resultado de diagnóstico
 */
export interface DiagnosisResult {
  id: string;
  timestamp: Date;
  symptoms: Symptom[];
  deviceDiagnoses: DeviceDiagnosis[];
  rootCauses: RootCause[];
  recommendations: Recommendation[];
  resolutionProbability: number;
  executionTimeMs: number;
}

/**
 * Causa raíz identificada
 */
export interface RootCause {
  device: string;
  category: DiagnosisCategory;
  description: string;
  confidence: number; // 0-1
  relatedSymptoms: string[];
}

/**
 * Recomendación de remediación
 */
export interface Recommendation {
  priority: number;
  description: string;
  action: string;
  expectedOutcome: string;
  risk: 'low' | 'medium' | 'high';
}

/**
 * Opciones de diagnóstico
 */
export interface DiagnosisOptions {
  deep?: boolean;
  includeChecks?: boolean;
  maxDevices?: number;
  timeout?: number;
}

/**
 * Interfaz del Diagnosis Engine
 */
export interface IDiagnosisEngine {
  diagnose(symptoms: Symptom[], options?: DiagnosisOptions): Promise<DiagnosisResult>;
  checkDevice(device: string, symptoms: Symptom[]): Promise<DeviceDiagnosis>;
  runDiagnosticChecks(device: string, checks: string[]): Promise<DiagnosticCheck[]>;
}

/**
 * Interfaz del Diagnosis Service (orquestador)
 */
export interface IDiagnosisService {
  diagnose(symptoms: Symptom[], options?: DiagnosisOptions): Promise<DiagnosisResult>;
  getHistory(): DiagnosisResult[];
  getById(id: string): DiagnosisResult | null;
  clearHistory(): void;
}