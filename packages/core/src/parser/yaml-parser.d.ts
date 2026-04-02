/**
 * Parser YAML para archivos de definición de laboratorios
 * Usa js-yaml v4 API con Zod para validación
 */
import type { Lab, Device, Connection } from '@cisco-auto/types';
export interface ParsedLab {
    lab: Lab;
    raw: string;
    filepath: string;
}
export interface ParseError {
    filepath: string;
    message: string;
    errors?: string[];
}
export declare class YAMLParser {
    /**
     * Carga y parsea un archivo YAML de laboratorio
     * @param filepath Ruta al archivo YAML
     * @returns ParsedLab con el lab validado
     */
    static loadFile(filepath: string): ParsedLab;
    /**
     * Parsea contenido YAML string
     * @param content Contenido YAML
     * @param filepath Ruta del archivo (para metadata)
     * @returns ParsedLab con el lab validado
     */
    static parse(content: string, filepath?: string): ParsedLab;
    /**
     * Parsea de forma segura, sin lanzar excepciones
     * @param content Contenido YAML
     * @param filepath Ruta del archivo
     * @returns Resultado de la operación
     */
    static parseSafe(content: string, filepath?: string): {
        success: true;
        lab: ParsedLab;
    } | {
        success: false;
        error: ParseError;
    };
    /**
     * Extrae información resumida del lab
     */
    static getSummary(parsedLab: ParsedLab): {
        name: string;
        deviceCount: number;
        connectionCount: number;
        deviceTypes: Record<string, number>;
    };
    /**
     * Lista todos los dispositivos de un tipo específico
     */
    static getDevicesByType(parsedLab: ParsedLab, type: string): Device[];
    /**
     * Obtiene las conexiones de un dispositivo específico
     */
    static getDeviceConnections(parsedLab: ParsedLab, deviceName: string): Connection[];
    /**
     * Convierte un lab a formato YAML string
     */
    static dump(lab: Lab): string;
}
export declare function loadLab(filepath: string): ParsedLab;
export declare function parseLab(content: string, filepath?: string): ParsedLab;
//# sourceMappingURL=yaml-parser.d.ts.map