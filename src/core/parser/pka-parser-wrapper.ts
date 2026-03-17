/**
 * Wrapper del parser PKA con manejo de errores y fallback
 * 
 * Dado que los archivos .pka modernos no pueden parsearse,
 * este wrapper ofrece una experiencia graceful con mensajes claros.
 */

import { readFileSync } from 'fs';
import { decodePKA, PKADecoder } from './pka-decoder.ts';
import { loadLab, YAMLParser } from './yaml-parser.ts';

export interface ParseResult {
  success: boolean;
  type: 'pka' | 'yaml' | 'error';
  data?: any;
  message: string;
  suggestion?: string;
}

export class PKAParserWrapper {
  /**
   * Intenta parsear un archivo (PKA o YAML)
   * 
   * Si es .pka, intenta decodificarlo pero informa sobre la limitación
   * Si es .yaml/.yml, lo parsea normalmente
   */
  public static parseFile(filepath: string): ParseResult {
    const ext = filepath.split('.').pop()?.toLowerCase();
    
    if (ext === 'pka' || ext === 'pkt') {
      return this.parsePKA(filepath);
    } else if (ext === 'yaml' || ext === 'yml') {
      return this.parseYAML(filepath);
    } else {
      return {
        success: false,
        type: 'error',
        message: `Formato de archivo no soportado: ${ext}`,
        suggestion: 'Use archivos .pka, .pkt, .yaml, o .yml'
      };
    }
  }

  /**
   * Intenta parsear un archivo PKA
   * 
   * NOTA: Los archivos PKA modernos (8.x) no pueden decodificarse
   * debido a encriptación actualizada por Cisco.
   */
  private static parsePKA(filepath: string): ParseResult {
    try {
      console.log(`⚠️  Archivo PKA detectado: ${filepath}`);
      console.log('⚠️  NOTA: Los archivos PKA modernos (v8.x) usan encriptación avanzada');
      console.log('⚠️  Intentando decodificación...\n');
      
      const buffer = readFileSync(filepath);
      const result = decodePKA(buffer);
      
      if (result.success && result.xml) {
        // Extraer información útil del XML
        const devices = PKADecoder.extractDevices(result.xml);
        
        return {
          success: true,
          type: 'pka',
          data: {
            xml: result.xml,
            version: result.version,
            devices: devices,
            stagesCompleted: result.stagesCompleted
          },
          message: `✅ Archivo PKA decodificado exitosamente (v${result.version})`,
          suggestion: `Se completaron ${result.stagesCompleted.length} etapas de descifrado`
        };
      } else {
        return {
          success: false,
          type: 'error',
          message: '❌ No se pudo decodificar el archivo PKA',
          suggestion: `
Esto es normal para archivos de Packet Tracer 8.x+.

ALTERNATIVAS RECOMENDADAS:

1. Usar definición YAML manual (recomendado):
   cisco-auto init mi-lab
   cisco-auto parse mi-lab.yaml

2. Crear el lab en Packet Tracer y exportar la configuración:
   - Abrir el archivo en Packet Tracer
   - Copiar configuraciones de cada dispositivo
   - Crear archivo YAML basado en esas configuraciones

3. Usar la versión web de Packet Tracer (sin instalación)

Para más información: docs/REVERSE_ENGINEERING.md`
        };
      }
    } catch (error) {
      return {
        success: false,
        type: 'error',
        message: `Error al procesar PKA: ${error instanceof Error ? error.message : 'Unknown'}`,
        suggestion: 'Use archivos YAML para definir topologías'
      };
    }
  }

  /**
   * Parsea un archivo YAML
   */
  private static parseYAML(filepath: string): ParseResult {
    try {
      const parsedLab = loadLab(filepath);
      const summary = YAMLParser.getSummary(parsedLab);
      
      return {
        success: true,
        type: 'yaml',
        data: {
          lab: parsedLab.lab,
          summary: summary
        },
        message: `✅ Lab cargado: ${summary.name}`,
        suggestion: `${summary.deviceCount} dispositivos, ${summary.connectionCount} conexiones`
      };
    } catch (error) {
      return {
        success: false,
        type: 'error',
        message: `Error al parsear YAML: ${error instanceof Error ? error.message : 'Unknown'}`,
        suggestion: 'Verifique la sintaxis del archivo YAML'
      };
    }
  }

  /**
   * Muestra información sobre por qué los PKA no funcionan
   */
  public static showPKAInfo(): void {
    console.log(`
══════════════════════════════════════════════════════════════════════
  INFORMACIÓN SOBRE ARCHIVOS .PKA/.PKT
══════════════════════════════════════════════════════════════════════

Los archivos de Packet Tracer modernos (versión 8.x) utilizan un 
algoritmo de encriptación avanzado de 4 etapas:

  Stage 1: Reverse XOR posicional
  Stage 2: Twofish CBC decryption
  Stage 3: Forward XOR decreciente
  Stage 4: zlib decompress

Esta encriptación fue implementada por Cisco para proteger la 
intelectual property de sus labs y actividades.

══════════════════════════════════════════════════════════════════════
  ALTERNATIVA RECOMENDADA: YAML
══════════════════════════════════════════════════════════════════════

En lugar de intentar parsear archivos .pka, recomendamos definir
las topologías usando archivos YAML:

  Ventajas:
  ✅ Editable manualmente
  ✅ Version control (Git)
  ✅ Transparente y mantenible
  ✅ Compatible con CI/CD

  Ejemplo:
  
  metadata:
    name: "Mi Lab"
  
  topology:
    devices:
      - name: Router1
        type: router
        interfaces:
          - name: Gig0/0
            ip: 192.168.1.1/24

══════════════════════════════════════════════════════════════════════
  COMANDOS ÚTILES
══════════════════════════════════════════════════════════════════════

  Crear lab de ejemplo:
    cisco-auto init mi-lab

  Parsear lab YAML:
    cisco-auto parse mi-lab.yaml

  Generar configuraciones:
    cisco-auto config mi-lab.yaml --output ./output

══════════════════════════════════════════════════════════════════════
`);
  }
}

// Exportar función de conveniencia
export function parsePKAOrYAML(filepath: string): ParseResult {
  return PKAParserWrapper.parseFile(filepath);
}
