/**
 * Parser YAML para archivos de definición de laboratorios
 * Usa js-yaml v4 API con Zod para validación
 */

import * as yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { Lab, validateLab, validateLabSafe, Device, Connection } from '../types/index.ts';

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

export class YAMLParser {
  /**
   * Carga y parsea un archivo YAML de laboratorio
   * @param filepath Ruta al archivo YAML
   * @returns ParsedLab con el lab validado
   */
  public static loadFile(filepath: string): ParsedLab {
    try {
      const raw = readFileSync(filepath, 'utf-8');
      return this.parse(raw, filepath);
    } catch (error) {
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
  public static parse(content: string, filepath: string = 'inline'): ParsedLab {
    try {
      // Parsear YAML usando js-yaml v4 API (load en lugar de safeLoad)
      const data = yaml.load(content) as Record<string, unknown>;
      
      if (!data || typeof data !== 'object') {
        throw new Error('El archivo YAML no contiene un objeto válido');
      }

      // Validar con Zod
      const lab = validateLab(data);

      return {
        lab,
        raw: content,
        filepath
      };
    } catch (error) {
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
  public static parseSafe(content: string, filepath: string = 'inline'): 
    | { success: true; lab: ParsedLab }
    | { success: false; error: ParseError } {
    
    try {
      const data = yaml.load(content) as Record<string, unknown>;
      
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
      } else {
        return {
          success: false,
          error: {
            filepath,
            message: 'Validación fallida',
            errors: validation.errors
          }
        };
      }
    } catch (error) {
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
  public static getSummary(parsedLab: ParsedLab): {
    name: string;
    deviceCount: number;
    connectionCount: number;
    deviceTypes: Record<string, number>;
  } {
    const devices = parsedLab.lab.topology.devices;
    const connections = parsedLab.lab.topology.connections || [];
    
    const deviceTypes = devices.reduce((acc, device) => {
      acc[device.type] = (acc[device.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

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
  public static getDevicesByType(parsedLab: ParsedLab, type: string): Device[] {
    return parsedLab.lab.topology.devices.filter(d => d.type === type);
  }

  /**
   * Obtiene las conexiones de un dispositivo específico
   */
  public static getDeviceConnections(parsedLab: ParsedLab, deviceName: string): Connection[] {
    const connections = parsedLab.lab.topology.connections || [];
    return connections.filter(
      c => c.from === deviceName || c.to === deviceName
    );
  }

  /**
   * Convierte un lab a formato YAML string
   */
  public static dump(lab: Lab): string {
    return yaml.dump(lab, {
      indent: 2,
      lineWidth: -1,  // Sin límite de ancho de línea
      noRefs: true,   // Sin referencias YAML
      sortKeys: false // Mantener orden de keys
    });
  }
}

// Exportar función de conveniencia
export function loadLab(filepath: string): ParsedLab {
  return YAMLParser.loadFile(filepath);
}

export function parseLab(content: string, filepath?: string): ParsedLab {
  return YAMLParser.parse(content, filepath);
}
