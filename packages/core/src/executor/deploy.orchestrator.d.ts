/**
 * ORQUESTADOR DE DESPLIEGUE
 * Coordina el despliegue de configuraciones a múltiples dispositivos
 */
import type { DeviceSpec, LabSpec } from '../canonical';
import type { ConnectionCredentials, DeployOptions, DeployResult, DeviceDeployResult, DeployPlan } from './types';
export declare class DeployOrchestrator {
    private options;
    constructor(options?: Partial<DeployOptions>);
    /**
     * Despliega un laboratorio completo
     */
    deployLab(lab: LabSpec, getCredentials: (device: DeviceSpec) => ConnectionCredentials | null): Promise<DeployResult>;
    /**
     * Despliega un solo dispositivo
     */
    deployDevice(device: DeviceSpec, credentials: ConnectionCredentials | null): Promise<DeviceDeployResult>;
    /**
     * Genera configuración para un dispositivo
     */
    private generateConfig;
    /**
     * Extrae comandos de configuración de las líneas generadas
     */
    private extractConfigCommands;
    /**
     * Guarda backup de la configuración actual
     */
    private saveBackup;
    /**
     * Ejecuta rollback desde backup
     */
    private rollback;
    /**
     * Crea plan de despliegue basado en topología
     */
    createDeployPlan(lab: LabSpec): DeployPlan;
}
/**
 * Despliega a un solo dispositivo
 */
export declare function deployToDevice(device: DeviceSpec, credentials: ConnectionCredentials, options?: Partial<DeployOptions>): Promise<DeviceDeployResult>;
//# sourceMappingURL=deploy.orchestrator.d.ts.map