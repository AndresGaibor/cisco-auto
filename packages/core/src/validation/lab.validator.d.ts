/**
 * LAB VALIDATOR - Validación avanzada de laboratorios
 *
 * Valida:
 * - Estructura del YAML
 * - Compatibilidad de cables/puertos
 * - Conflictos de IP
 * - Consistencia de subredes
 * - Topología de red
 */
import type { LabSpec } from '../canonical/index.ts';
export interface ValidationIssue {
    severity: 'error' | 'warning' | 'info';
    category: 'structure' | 'physical' | 'logical' | 'topology' | 'best-practice';
    message: string;
    device?: string;
    connection?: string;
    suggestion?: string;
}
export interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
    summary: {
        errors: number;
        warnings: number;
        info: number;
    };
}
export declare class LabValidator {
    private issues;
    /**
     * Valida un laboratorio completo
     */
    validate(lab: LabSpec): ValidationResult;
    /**
     * Validaciones de estructura
     */
    private validateStructure;
    /**
     * Validaciones de dispositivos
     */
    private validateDevices;
    /**
     * Validaciones de conexiones
     */
    private validateConnections;
    /**
     * Validaciones de topología
     */
    private validateTopology;
    /**
     * Validar conflictos de IP
     */
    private validateIPConflicts;
    /**
     * Validar mejores prácticas
     */
    private validateBestPractices;
    /**
     * Validar formato de IP
     */
    private validateIPFormat;
    private addError;
    private addWarning;
    private addInfo;
}
/**
 * Función de conveniencia
 */
export declare function validateLab(lab: LabSpec): ValidationResult;
//# sourceMappingURL=lab.validator.d.ts.map