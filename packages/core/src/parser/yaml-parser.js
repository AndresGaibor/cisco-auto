/**
 * Parser YAML para archivos de definición de laboratorios
 * Usa js-yaml v4 API con Zod para validación
 */
import * as yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { zodValidateLab, validateLabSafe } from '@cisco-auto/types';
export class YAMLParser {
    /**
     * Carga y parsea un archivo YAML de laboratorio
     * @param filepath Ruta al archivo YAML
     * @returns ParsedLab con el lab validado
     */
    static loadFile(filepath) {
        try {
            const raw = readFileSync(filepath, 'utf-8');
            return this.parse(raw, filepath);
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Error al cargar archivo ${filepath}: ${error.message}`);
            }
            throw error;
        }
    }
    /**
     * Parsea contenido YAML string
     * @param content Contenido YAML
     * @param filepath Ruta del archivo (para metadata)
     * @returns ParsedLab con el lab validado
     */
    static parse(content, filepath = 'inline') {
        try {
            // Parsear YAML usando js-yaml v4 API (load en lugar de safeLoad)
            const data = yaml.load(content);
            if (!data || typeof data !== 'object') {
                throw new Error('El archivo YAML no contiene un objeto válido');
            }
            // Validar con Zod
            const lab = zodValidateLab(data);
            return {
                lab,
                raw: content,
                filepath
            };
        }
        catch (error) {
            if (error instanceof yaml.YAMLException) {
                throw new Error(`Error de sintaxis YAML: ${error.message}`);
            }
            throw error;
        }
    }
    /**
     * Parsea de forma segura, sin lanzar excepciones
     * @param content Contenido YAML
     * @param filepath Ruta del archivo
     * @returns Resultado de la operación
     */
    static parseSafe(content, filepath = 'inline') {
        try {
            const data = yaml.load(content);
            if (!data || typeof data !== 'object') {
                return {
                    success: false,
                    error: {
                        filepath,
                        message: 'El archivo YAML no contiene un objeto válido'
                    }
                };
            }
            const validation = validateLabSafe(data);
            if (validation.success && validation.data) {
                return {
                    success: true,
                    lab: {
                        lab: validation.data,
                        raw: content,
                        filepath
                    }
                };
            }
            else {
                return {
                    success: false,
                    error: {
                        filepath,
                        message: 'Validación fallida',
                        errors: validation.errors
                    }
                };
            }
        }
        catch (error) {
            return {
                success: false,
                error: {
                    filepath,
                    message: error instanceof Error ? error.message : 'Error desconocido'
                }
            };
        }
    }
    /**
     * Extrae información resumida del lab
     */
    static getSummary(parsedLab) {
        const devices = parsedLab.lab.topology.devices;
        const connections = parsedLab.lab.topology.connections || [];
        const deviceTypes = devices.reduce((acc, device) => {
            acc[device.type] = (acc[device.type] || 0) + 1;
            return acc;
        }, {});
        return {
            name: parsedLab.lab.metadata.name,
            deviceCount: devices.length,
            connectionCount: connections.length,
            deviceTypes
        };
    }
    /**
     * Lista todos los dispositivos de un tipo específico
     */
    static getDevicesByType(parsedLab, type) {
        return parsedLab.lab.topology.devices.filter(d => d.type === type);
    }
    /**
     * Obtiene las conexiones de un dispositivo específico
     */
    static getDeviceConnections(parsedLab, deviceName) {
        const connections = parsedLab.lab.topology.connections || [];
        return connections.filter(c => c.from === deviceName || c.to === deviceName);
    }
    /**
     * Convierte un lab a formato YAML string
     */
    static dump(lab) {
        return yaml.dump(lab, {
            indent: 2,
            lineWidth: -1, // Sin límite de ancho de línea
            noRefs: true, // Sin referencias YAML
            sortKeys: false // Mantener orden de keys
        });
    }
}
// Exportar función de conveniencia
export function loadLab(filepath) {
    return YAMLParser.loadFile(filepath);
}
export function parseLab(content, filepath) {
    return YAMLParser.parse(content, filepath);
}
//# sourceMappingURL=yaml-parser.js.map