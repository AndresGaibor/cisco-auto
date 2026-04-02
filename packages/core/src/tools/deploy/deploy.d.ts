/**
 * TOOL: pt_deploy
 *
 * Despliega configuraciones de dispositivos al portapapeles o archivo.
 */
import type { Tool } from '../..';
import type { FailedDevice, DeploySummary } from '../..';
export interface DeployOutput {
    summary: DeploySummary;
    outputPath?: string;
    charCount?: number;
    failedDevices?: FailedDevice[];
    message?: string;
}
/**
 * Tool para desplegar configuraciones de dispositivos
 */
export declare const ptDeployTool: Tool;
//# sourceMappingURL=deploy.d.ts.map