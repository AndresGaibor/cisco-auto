/**
 * Parser PKA - Punto de entrada unificado
 * 
 * Usa pka2xml externo para decodificación confiable
 * El parser interno de Twofish queda como fallback/teaching
 */

import { decodePKAExternal, isPka2XmlAvailable, encodePKAExternal } from './pka-external.ts';
import { PKADecoder } from './decoder.ts';
import { decodePKA as decodePKAInternal, PKADecodeResult as InternalResult } from './pka-decoder-v2.ts';

export interface PKAParseResult {
  success: boolean;
  xml?: string;
  version?: string;
  error?: string;
  executionTimeMs?: number;
  devices?: Array<{
    type: string;
    model: string;
    name: string;
  }>;
  method?: 'external' | 'internal';
}

/**
 * Parsea un archivo PKA
 * 
 * Prioridad:
 * 1. Usar pka2xml externo (más confiable)
 * 2. Fallback a implementación interna (experimental)
 * 
 * @param filepath Ruta al archivo .pka
 * @returns Resultado del parseo
 */
export async function parsePKA(filepath: string): Promise<PKAParseResult> {
  const startTime = Date.now();
  
  // Intentar con pka2xml externo primero
  if (isPka2XmlAvailable()) {
    console.log('[PKA Parser] Using external pka2xml...');
    
    const result = await decodePKAExternal(filepath);
    
    if (result.success) {
      const devices = result.xml ? PKADecoder.extractDevices(result.xml) : [];
      
      return {
        success: true,
        xml: result.xml,
        version: result.version,
        executionTimeMs: result.executionTimeMs,
        devices,
        method: 'external'
      };
    }
    
    console.log('[PKA Parser] External pka2xml failed, trying internal...');
  }
  
  // Fallback a implementación interna (con limitaciones conocidas)
  console.log('[PKA Parser] Using internal implementation (experimental)...');
  
  const result = decodePKAInternal(new Uint8Array(
    await Bun.file(filepath).arrayBuffer()
  ));
  
  // Extraer dispositivos si tenemos XML
  let devices: PKAParseResult['devices'] = [];
  if (result.xml) {
    devices = PKADecoder.extractDevices(result.xml);
  }
  
  return {
    success: result.success,
    xml: result.xml,
    version: result.version,
    error: result.error,
    executionTimeMs: result.executionTimeMs,
    devices,
    method: 'internal'
  };
}

/**
 * Parsea un archivo PKA síncrono (para casos simples)
 * Requiere que pka2xml esté disponible
 * 
 * @throws Error si pka2xml no está disponible
 */
export function parsePKASync(filepath: string): Promise<PKAParseResult> {
  if (!isPka2XmlAvailable()) {
    throw new Error('pka2xml not available. Use parsePKA() for async with fallback.');
  }
  
  return parsePKA(filepath);
}

// Re-exportar funciones útiles
export { isPka2XmlAvailable, encodePKAExternal };
export type { PKADecodeResult as InternalPKADecodeResult } from './pka-decoder-v2.ts';
