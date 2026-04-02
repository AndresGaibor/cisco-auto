/**
 * DEPLOY TYPES
 *
 * Tipos para configuración de dispositivos y despliegue
 */
import type { ToolError } from './tool-core';
export interface DeployedDevice {
    deviceId: string;
    deviceName: string;
    deviceType: 'router' | 'switch' | 'multilayer-switch' | 'pc' | 'server';
    iosConfig: string;
    yamlConfig?: string;
    jsonConfig?: string;
}
export interface FailedDevice {
    deviceId: string;
    deviceName?: string;
    reason: string;
    error?: ToolError;
}
export interface DeploySummary {
    totalDevices: number;
    routerCount: number;
    switchCount: number;
    pcCount: number;
    serverCount: number;
    totalLines: number;
    unconfiguredDevices: string[];
    deployedCount?: number;
    failedCount?: number;
    failedDevices?: FailedDevice[];
}
//# sourceMappingURL=deploy-types.d.ts.map