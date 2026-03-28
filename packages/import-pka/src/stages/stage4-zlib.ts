/**
 * Stage 4: Zlib Decompress
 * 
 * Formato qCompress de Qt (usado por Packet Tracer):
 * - Primeros 4 bytes: tamaño descomprimido (big-endian, uint32)
 * - Resto: datos zlib comprimidos
 * 
 * Después de descomprimir, se debe sanear caracteres de control
 * (reemplazar < 0x09 con 0x3F '?')
 */

import { inflateSync, constants as zlibConstants } from 'zlib';

export interface Stage4Result {
  success: boolean;
  data?: Uint8Array;
  xml?: string;
  error?: string;
  uncompressedSize?: number;
  actualSize?: number;
}

/**
 * Descomprime datos en formato qCompress
 * 
 * @param input Buffer comprimido (después de stage 3)
 * @returns Resultado con datos descomprimidos o error
 */
export function stage4ZlibDecompress(input: Uint8Array): Stage4Result {
  // Verificar tamaño mínimo
  if (input.length < 4) {
    return {
      success: false,
      error: `Input too small: ${input.length} bytes (minimum 4)`
    };
  }
  
  // Leer tamaño descomprimido (big-endian, 4 bytes)
  const uncompressedSize = 
    (input[0] << 24) |
    (input[1] << 16) |
    (input[2] << 8) |
    input[3];
  
  // Validar tamaño
  if (uncompressedSize > 100 * 1024 * 1024) { // 100MB max
    return {
      success: false,
      error: `Uncompressed size too large: ${uncompressedSize} bytes`,
      uncompressedSize
    };
  }
  
  if (uncompressedSize === 0) {
    return {
      success: false,
      error: 'Uncompressed size is 0',
      uncompressedSize
    };
  }
  
  try {
    // Extraer datos comprimidos (después de los primeros 4 bytes)
    const compressed = input.slice(4);
    
    // Verificar magic bytes de zlib
    if (compressed.length < 2) {
      return {
        success: false,
        error: 'Compressed data too small',
        uncompressedSize
      };
    }
    
    // Descomprimir usando zlib
    const decompressed = inflateSync(compressed);
    
    // Saneamiento: reemplazar caracteres de control (< 0x09) con '?'
    for (let i = 0; i < decompressed.length; i++) {
      if (decompressed[i] < 0x09) {
        decompressed[i] = 0x3F; // '?'
      }
    }
    
    // Convertir a string XML
    const xml = decompressed.toString('utf-8');
    
    return {
      success: true,
      data: decompressed,
      xml,
      uncompressedSize,
      actualSize: decompressed.length
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Zlib decompression failed',
      uncompressedSize
    };
  }
}

/**
 * Verifica si el buffer tiene formato qCompress válido
 * (útil para detectar si es stage 4 válido)
 */
export function isQCompressFormat(input: Uint8Array): boolean {
  if (input.length < 6) return false;
  
  // Verificar magic bytes de zlib (0x78 0x9C = default compression)
  // Después del header de 4 bytes
  const magic1 = input[4] ^ (input.length - 4);
  const magic2 = input[5] ^ (input.length - 5);
  
  return magic1 === 0x78 && magic2 === 0x9C;
}

/**
 * Obtiene información del header qCompress sin descomprimir
 */
export function getQCompressInfo(input: Uint8Array): {
  isValid: boolean;
  uncompressedSize?: number;
  compressedSize?: number;
  magicBytes?: string;
} {
  if (input.length < 4) {
    return { isValid: false };
  }
  
  const uncompressedSize = 
    (input[0] << 24) |
    (input[1] << 16) |
    (input[2] << 8) |
    input[3];
  
  const compressedSize = input.length - 4;
  
  // Aplicar stage 3 a los primeros bytes para ver magic
  const magic1 = input.length >= 6 ? input[4] ^ (input.length - 4) : 0;
  const magic2 = input.length >= 6 ? input[5] ^ (input.length - 5) : 0;
  
  return {
    isValid: uncompressedSize > 0 && uncompressedSize < 100 * 1024 * 1024,
    uncompressedSize,
    compressedSize,
    magicBytes: `${magic1.toString(16).padStart(2, '0')} ${magic2.toString(16).padStart(2, '0')}`
  };
}
