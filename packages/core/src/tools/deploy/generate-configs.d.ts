/**
 * TOOL: pt_generate_configs
 *
 * Genera configuraciones de red para dispositivos Cisco IOS
 * a partir de un plan de topología.
 */
import type { Tool } from '../..';
/**
 * Formato de salida de configuración
 */
export type ConfigFormat = 'ios' | 'yaml' | 'json';
import type { DeployedDevice, DeploySummary } from '../..';
export type DeviceConfig = DeployedDevice;
export type ConfigSummary = DeploySummary;
export declare const ptGenerateConfigsTool: Tool;
//# sourceMappingURL=generate-configs.d.ts.map