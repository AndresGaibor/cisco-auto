/**
 * VALIDADOR POST-DEPLOY
 * Ejecuta validaciones después del despliegue
 */
import type { ConnectionCredentials, ValidationResult } from './types';
import type { DeviceSpec } from '../canonical';
export interface DeviceValidationSpec {
    device: DeviceSpec;
    credentials: ConnectionCredentials;
    checks: {
        ping?: {
            destination: string;
            expected: boolean;
        }[];
        interfaces?: {
            name: string;
            expectedUp: boolean;
        }[];
        vlans?: {
            id: number;
            name?: string;
        }[];
        routing?: {
            destination: string;
        }[];
    };
}
export declare class ValidationExecutor {
    /**
     * Valida un dispositivo después del despliegue
     */
    validate(spec: DeviceValidationSpec): Promise<ValidationResult>;
    /**
     * Valida conectividad via ping
     */
    private validatePing;
    /**
     * Valida estado de interfaz
     */
    private validateInterface;
    /**
     * Valida existencia de VLAN
     */
    private validateVlan;
    /**
     * Valida existencia de ruta
     */
    private validateRoute;
    /**
     * Valida múltiples dispositivos en paralelo
     */
    validateAll(specs: DeviceValidationSpec[], concurrency?: number): Promise<Map<string, ValidationResult>>;
}
/**
 * Genera especificación de validación automática desde un LabSpec
 */
export declare function generateValidationSpec(device: DeviceSpec, credentials: ConnectionCredentials): DeviceValidationSpec;
//# sourceMappingURL=validation.executor.d.ts.map