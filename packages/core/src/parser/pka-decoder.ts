/**
 * PKA/PKT File Decoder - Implementación completa de 4 etapas
 * 
 * Basado en investigación de reverse engineering:
 * - ptexplorer (axcheron) - versión 5.x
 * - Ferib.dev - versión 7.x
 * - pka2xml (mircodz) - versión 7.x Linux
 * 
 * Algoritmo de 4 etapas para archivos modernos (6.x/7.x/8.x):
 * Stage 1: Reverse XOR posicional
 * Stage 2: Twofish decryption (CBC mode)
 * Stage 3: Forward XOR decreciente
 * Stage 4: zlib decompress (qCompress format)
 */

import { inflateSync } from 'zlib';
import { makeSession, decrypt } from 'twofish-ts';

export interface PKADecodeResult {
  success: boolean;
  xml?: string;
  version?: string;
  error?: string;
  stagesCompleted: number[];
}

export class PKADecoder {
  // Clave e IV para Twofish - "Packet Tracer Saves"
  // Extraídos de ingeniería inversa del binario de PT 7.2.1
  private static readonly TWOFISH_KEY = new Uint8Array([
    0x89, 0x89, 0x89, 0x89, 0x89, 0x89, 0x89, 0x89,
    0x89, 0x89, 0x89, 0x89, 0x89, 0x89, 0x89, 0x89
  ]);

  private static readonly TWOFISH_IV = new Uint8Array([
    0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10,
    0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10
  ]);

  /**
   * Intenta decodificar el archivo PKA/PKT
   * Primero intenta el algoritmo de 4 etapas (versiones modernas)
   * Si falla, intenta el algoritmo de 2 etapas (versión 5.x)
   */
  public static decode(data: Buffer): PKADecodeResult {
    const stagesCompleted: number[] = [];
    
    try {
      // Intentar algoritmo de 4 etapas (versiones 6.x/7.x/8.x)
      return this.decodeV7(data, stagesCompleted);
    } catch (error) {
      console.log('[PKA Decoder] Algoritmo v7 falló, intentando v5...');
      
      try {
        // Intentar algoritmo de 2 etapas (versión 5.x)
        return this.decodeV5(data, stagesCompleted);
      } catch (v5Error) {
        return {
          success: false,
          error: `Falló algoritmo v7: ${error instanceof Error ? error.message : 'Unknown'}\n` +
                 `Falló algoritmo v5: ${v5Error instanceof Error ? v5Error.message : 'Unknown'}`,
          stagesCompleted
        };
      }
    }
  }

  /**
   * Algoritmo de 4 etapas para versiones 6.x/7.x/8.x
   * 
   * Stage 1: Reverse XOR posicional (con key generada)
   * Stage 2: Twofish decryption (CBC mode)
   * Stage 3: Forward XOR decreciente
   * Stage 4: zlib decompress (formato qCompress)
   */
  private static decodeV7(data: Buffer, stagesCompleted: number[]): PKADecodeResult {
    console.log('[PKA Decoder] Intentando decodificación v7 (4 etapas)...');
    
    // Stage 1: Reverse XOR posicional
    console.log('[PKA Decoder] Stage 1: Reverse XOR posicional...');
    let buffer = this.stage1ReverseXOR(data);
    stagesCompleted.push(1);
    
    // Verificar si el resultado parece válido
    if (!this.looksLikeValidData(buffer)) {
      throw new Error('Stage 1 no produjo datos válidos');
    }
    
    // Stage 2: Twofish decryption
    console.log('[PKA Decoder] Stage 2: Twofish CBC decryption...');
    buffer = this.stage2TwofishDecrypt(buffer);
    stagesCompleted.push(2);
    
    // Stage 3: Forward XOR decreciente
    console.log('[PKA Decoder] Stage 3: Forward XOR decreciente...');
    buffer = this.stage3ForwardXOR(buffer);
    stagesCompleted.push(3);
    
    // Stage 4: zlib decompress
    console.log('[PKA Decoder] Stage 4: zlib decompress...');
    const xml = this.stage4ZlibDecompress(buffer);
    stagesCompleted.push(4);
    
    // Extraer versión
    const version = this.extractVersion(xml);
    
    return {
      success: true,
      xml,
      version,
      stagesCompleted
    };
  }

  /**
   * Algoritmo de 2 etapas para versión 5.x
   * 
   * Stage 1: XOR simple con tamaño de archivo
   * Stage 2: zlib decompress (formato qCompress)
   */
  private static decodeV5(data: Buffer, stagesCompleted: number[]): PKADecodeResult {
    console.log('[PKA Decoder] Intentando decodificación v5 (2 etapas)...');
    
    const fileSize = data.length;
    
    // Stage 1: XOR simple
    console.log(`[PKA Decoder] Stage 1: XOR con file_size=${fileSize}...`);
    const decrypted = Buffer.alloc(fileSize);
    for (let i = 0; i < fileSize; i++) {
      const key = (fileSize - i) & 0xFF;
      decrypted[i] = (data[i] ?? 0) ^ key;
    }
    stagesCompleted.push(1);
    
    // Stage 2: zlib decompress
    console.log('[PKA Decoder] Stage 2: zlib decompress...');
    const xml = this.stage4ZlibDecompress(decrypted);
    stagesCompleted.push(2);
    
    // Extraer versión
    const version = this.extractVersion(xml);
    
    return {
      success: true,
      xml,
      version,
      stagesCompleted
    };
  }

  /**
   * Stage 1: Reverse XOR posicional
   * 
   * Basado en código C# de Ferib:
   * ```csharp
   * byte k = (byte)this.Buffer.Length;
   * for (int i = 0; i < this.Buffer.Length; i++) {
   *   byte ch = this.Buffer[this.Buffer.Length - i - 1];
   *   byte a = (byte)(k * (byte)i);
   *   byte c = (byte)(this.Buffer.Length - a);
   *   c ^= ch;
   *   this.Buffer[i] = c;
   * }
   * ```
   */
  private static stage1ReverseXOR(data: Buffer): Buffer {
    const length = data.length;
    const key = length & 0xFF;
    const result = Buffer.alloc(length);
    
    for (let i = 0; i < length; i++) {
      // Obtener byte del final (orden inverso)
      const ch = data[length - i - 1] ?? 0;

      // Calcular: a = key * i
      const a = (key * i) & 0xFF;

      // Calcular: c = length - a
      const c = (length - a) & 0xFF;

      // XOR: result[i] = c ^ ch
      result[i] = c ^ ch;
    }
    
    return result;
  }

  /**
   * Stage 2: Twofish decryption (CBC mode)
   * 
   * Usa la librería twofish-ts con key e IV específicos
   * de "Packet Tracer Saves"
   */
  private static stage2TwofishDecrypt(data: Buffer): Buffer {
    const session = makeSession(this.TWOFISH_KEY);
    const blockSize = 16; // Twofish block size
    
    // El buffer debe ser múltiplo del tamaño de bloque
    if (data.length % blockSize !== 0) {
      // Padding si es necesario
      const paddedLength = Math.ceil(data.length / blockSize) * blockSize;
      const padded = Buffer.alloc(paddedLength);
      data.copy(padded);
      data = padded;
    }
    
    const decrypted = Buffer.alloc(data.length);
    let previousBlock = Buffer.from(this.TWOFISH_IV);
    
    for (let i = 0; i < data.length; i += blockSize) {
      const cipherBlock = data.slice(i, i + blockSize);
      const plainBlock = Buffer.alloc(blockSize);
      
      // Decrypt block
      decrypt(cipherBlock, 0, plainBlock, 0, session);
      
      // XOR con bloque anterior (CBC)
      for (let j = 0; j < blockSize; j++) {
        decrypted[i + j] = (plainBlock[j] ?? 0) ^ (previousBlock[j] ?? 0);
      }
      
      // Actualizar bloque anterior
      previousBlock = cipherBlock;
    }
    
    return decrypted;
  }

  /**
   * Stage 3: Forward XOR decreciente
   * 
   * XOR con contador decreciente: (length - i) como key
   */
  private static stage3ForwardXOR(data: Buffer): Buffer {
    const length = data.length;
    const result = Buffer.alloc(length);
    
    for (let i = 0; i < length; i++) {
      const key = (length - i) & 0xFF;
      result[i] = (data[i] ?? 0) ^ key;
    }
    
    return result;
  }

  /**
   * Stage 4: zlib decompress (formato qCompress de Qt)
   * 
   * Los primeros 4 bytes son el tamaño descomprimido (big-endian)
   * El resto es zlib compressed con header 78 9C
   */
  private static stage4ZlibDecompress(data: Buffer): string {
    if (data.length < 4) {
      throw new Error('Buffer demasiado pequeño');
    }
    
    // Leer tamaño descomprimido (big-endian, qCompress)
    const uncompressedSize = ((data[0] ?? 0) << 24) | ((data[1] ?? 0) << 16) | ((data[2] ?? 0) << 8) | (data[3] ?? 0);
    
    // Verificar que el tamaño sea razonable
    if (uncompressedSize > 100 * 1024 * 1024 || uncompressedSize === 0) {
      throw new Error(`Tamaño descomprimido inválido: ${uncompressedSize}`);
    }
    
    console.log(`[PKA Decoder] Tamaño descomprimido esperado: ${uncompressedSize} bytes`);
    
    // Extraer datos comprimidos (sin los 4 bytes de tamaño)
    const compressed = data.slice(4);
    
    // Verificar magic bytes de zlib (78 9C = default compression)
    if (compressed.length < 2 || compressed[0] !== 0x78 || compressed[1] !== 0x9C) {
      console.log(`[PKA Decoder] Magic bytes: ${compressed.slice(0, 2).toString('hex')}`);
      throw new Error('Magic bytes de zlib no encontrados');
    }
    
    // Descomprimir
    const decompressed = inflateSync(compressed);

    // Convertir a string UTF-8
    // Reemplazar caracteres inválidos (menores a 0x09)
    for (let i = 0; i < decompressed.length; i++) {
      if ((decompressed[i] ?? 0) < 0x09) {
        decompressed[i] = 0x3F; // '?'
      }
    }
    
    return decompressed.toString('utf-8');
  }

  /**
   * Verifica si los datos parecen válidos
   * Busca patrones que indiquen que el descifrado funcionó
   */
  private static looksLikeValidData(data: Buffer): boolean {
    // Verificar que no sea todo ceros o todo unos
    let hasVariation = false;
    for (let i = 0; i < Math.min(100, data.length); i++) {
      if (data[i] !== 0 && data[i] !== 0xFF) {
        hasVariation = true;
        break;
      }
    }
    
    return hasVariation;
  }

  /**
   * Extrae la versión del XML
   */
  private static extractVersion(xml: string): string | undefined {
    const match = xml.match(/<VERSION>([^<]+)<\/VERSION>/i);
    return match ? match[1] : undefined;
  }

  /**
   * Extrae información de dispositivos del XML
   */
  public static extractDevices(xml: string): any[] {
    const devices: any[] = [];
    
    // Parsear dispositivos
    const deviceRegex = /<DEVICE>.*?<\/DEVICE>/gs;
    const matches = xml.match(deviceRegex);
    
    if (matches) {
      for (const deviceXml of matches) {
        const device: any = {};
        
        // Extraer tipo y modelo
        const typeMatch = deviceXml.match(/<TYPE model="([^"]*)"[^>]*>([^<]*)<\/TYPE>/);
        if (typeMatch) {
          device.model = typeMatch[1];
          device.type = typeMatch[2];
        }
        
        // Extraer nombre
        const nameMatch = deviceXml.match(/<NAME[^>]*>([^<]*)<\/NAME>/);
        if (nameMatch) {
          device.name = nameMatch[1];
        }
        
        devices.push(device);
      }
    }
    
    return devices;
  }
}

// Exportar función de conveniencia
export function decodePKA(data: Buffer): PKADecodeResult {
  return PKADecoder.decode(data);
}
