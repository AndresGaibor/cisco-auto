/**
 * TOOL: pt_generate_script
 *
 * Genera un script de Packet Tracer (JavaScript o Python) a partir de un
 * TopologyPlan. El script incluye comandos para:
 * - Añadir dispositivos
 * - Crear enlaces
 * - Configurar routers y switches (IOS)
 * - Configurar IPs en PCs
 */
import type { Tool, DevicePlan } from '../..';
/**
 * Comando generado para un dispositivo
 */
export interface Command {
    deviceId: string;
    deviceName: string;
    type: 'addDevice' | 'addLink' | 'configureIos' | 'configurePc';
    command: string;
    params: Record<string, unknown>;
}
/**
 * Resultado de la generación del script
 */
export interface GenerateScriptResult {
    script: string;
    commands: Command[];
    format: 'javascript' | 'python';
    deviceCount: number;
    linkCount: number;
}
/**
 * Genera los comandos IOS completos para un dispositivo
 */
export declare function generateIosCommands(device: DevicePlan): string[];
export declare const ptGenerateScriptTool: Tool;
//# sourceMappingURL=generate-script.d.ts.map