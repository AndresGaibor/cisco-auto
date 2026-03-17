/**
 * Parser de archivos .pka/.pkt de Cisco Packet Tracer
 * Implementa el algoritmo de 4 etapas de desencriptación basado en reverse engineering
 * 
 * Referencias:
 * - https://github.com/axcheron/ptexplorer (versión 5.x)
 * - https://ferib.dev/blog/protecting-Packet-Tracer-myself-because-no-one-gives-a-fuck/ (versión 7.x)
 * - https://github.com/mircodz/pka2xml
 */

import { readFileSync } from 'fs';
import { inflateSync } from 'zlib';

// NOTA: Twofish requiere implementación CBC mode
// Por ahora usamos una aproximación con XOR para versión 5.x

export interface PKAFileInfo {
  fileSize: number;
  uncompressedSize: number;
  version: string;
  xmlContent?: string;
}

export class PKAParser {
  /**
   * Parsea un archivo .pka/.pkt y extrae el contenido XML
   * Implementación basada en ptexplorer para versiones 5.x
   * 
   * Para versiones 7.x+ se requiere implementación completa de TwoFish
   */
  public static parseFile(filePath: string): PKAFileInfo {
    const fileBuffer = readFileSync(filePath);
    const fileSize = fileBuffer.length;

    console.log(`[PKA Parser] Archivo: ${filePath}`);
    console.log(`[PKA Parser] Tamaño: ${fileSize} bytes`);

    // Intentar decodificar con el algoritmo de versión 5.x (XOR simple + zlib)
    try {
      return this.decodeVersion5(fileBuffer, filePath);
    } catch (error) {
      console.log('[PKA Parser] Algoritmo v5.x falló, intentando análisis alternativo...');
      
      // Para versiones más nuevas, necesitamos implementar las 4 etapas
      // Por ahora devolvemos información básica
      return {
        fileSize,
        uncompressedSize: 0,
        version: 'unknown',
        xmlContent: undefined
      };
    }
  }

  /**
   * Stage 1: Reverse XOR (basado en código C# de Ferib)
   * 
   * Algoritmo:
   * - Recorrer buffer de atrás hacia adelante
   * - key = file_size & 0xFF
   * - a = key * i
   * - c = file_size - a
   * - result[i] = encrypted[length-i-1] XOR c
   * 
   * C# Reference:
   * byte k = (byte)this.Buffer.Length;
   * for (int i = 0; i < this.Buffer.Length; i++) {
   *   byte ch = this.Buffer[this.Buffer.Length - i - 1];
   *   byte a = (byte)(k * (byte)i);
   *   byte c = (byte)(this.Buffer.Length - a);
   *   c ^= ch;
   *   this.Buffer[i] = c;
   * }
   */
  private static stage1ReverseXOR(encrypted: Buffer): Buffer {
    const length = encrypted.length;
    const key = length & 0xFF;  // Key base = tamaño del archivo mod 256
    const result = Buffer.alloc(length);
    
    for (let i = 0; i < length; i++) {
      // Obtener byte del final del buffer (orden inverso)
      const encryptedByte = encrypted[length - i - 1];
      
      // Calcular: a = key * i
      const a = (key * i) & 0xFF;
      
      // Calcular: c = length - a
      const c = (length - a) & 0xFF;
      
      // XOR: result[i] = encryptedByte XOR c
      result[i] = encryptedByte ^ c;
    }
    
    return result;
  }

  /**
   * Decodificación para archivos versión 7.x+
   * Implementa las 4 etapas completas
   */
  private static decodeVersion7(fileBuffer: Buffer): PKAFileInfo {
    console.log(`[PKA Parser] Intentando decodificación completa (4 etapas)...`);
    
    // Stage 1: Reverse XOR
    let data = this.stage1ReverseXOR(fileBuffer);
    console.log(`[PKA Parser] Stage 1 completado. Primeros 8 bytes: ${data.slice(0, 8).toString('hex')}`);
    
    // Stage 2: TwoFish Decryption (CBC)
    // TODO: Implementar TwoFish CBC
    console.log(`[PKA Parser] Stage 2 (TwoFish) no implementado aún`);
    
    // Por ahora, intentar interpretar como si fuera v5
    throw new Error('Decodificación v7 requiere TwoFish CBC');
  }

  /**
   * Decodificación para archivos versión 5.x
   * Algoritmo basado en ptexplorer de axcheron:
   * - XOR: encrypted_byte XOR (file_size - index)
   * - Los primeros 4 bytes son el tamaño descomprimido (big-endian)
   * - El resto es zlib comprimido
   */
  private static decodeVersion5(fileBuffer: Buffer, filePath: string): PKAFileInfo {
    const fileSize = fileBuffer.length;
    console.log(`[PKA Parser] Aplicando XOR simple con file_size=${fileSize}...`);
    
    // Stage 1: XOR simple (versión 5.x usa algoritmo diferente)
    const decrypted = Buffer.alloc(fileSize);
    for (let i = 0; i < fileSize; i++) {
      const key = (fileSize - i) & 0xFF;
      decrypted[i] = fileBuffer[i] ^ key;
    }
    
    // Debug: mostrar primeros bytes
    console.log(`[PKA Parser] Primeros 8 bytes después de XOR: ${decrypted.slice(0, 8).toString('hex')}`);

    // Los primeros 4 bytes contienen el tamaño descomprimido (big-endian)
    const uncompressedSize = 
      (decrypted[0] << 24) |
      (decrypted[1] << 16) |
      (decrypted[2] << 8) |
      decrypted[3];
      
    // Convertir a unsigned
    const unsignedSize = uncompressedSize >>> 0;

    console.log(`[PKA Parser] Tamaño descomprimido esperado: ${unsignedSize} bytes`);

    // Verificar si el tamaño es razonable (no negativo ni excesivamente grande)
    if (unsignedSize > 100 * 1024 * 1024 || unsignedSize === 0) {
      throw new Error(`Tamaño descomprimido inválido: ${unsignedSize}. Posible archivo encriptado con TwoFish.`);
    }

    // Extraer datos comprimidos (después de los primeros 4 bytes)
    const compressedData = decrypted.slice(4);
    
    // Verificar magic bytes de zlib (78 9C = default compression)
    console.log(`[PKA Parser] Magic bytes zlib: ${compressedData.slice(0, 2).toString('hex')}`);
    
    // Intentar descomprimir
    let xmlBuffer: Buffer;
    try {
      xmlBuffer = inflateSync(compressedData);
    } catch (e) {
      // Si falla, intentar sin verificar el header
      console.log(`[PKA Parser] Primer intento de zlib falló, intentando alternativa...`);
      xmlBuffer = inflateSync(compressedData, { windowBits: 15 });
    }
    
    const xmlContent = xmlBuffer.toString('utf-8');

    // Extraer versión del XML
    const versionMatch = xmlContent.match(/<VERSION>([^<]+)<\/VERSION>/i);
    const version = versionMatch ? versionMatch[1] : 'unknown';

    console.log(`[PKA Parser] Versión detectada: ${version}`);
    console.log(`[PKA Parser] XML extraído (${xmlBuffer.length} bytes):`);
    console.log(xmlContent.substring(0, 500) + '...');

    return {
      fileSize,
      uncompressedSize: unsignedSize,
      version,
      xmlContent
    };
  }

  /**
   * Para versiones 7.x+, implementación de las 4 etapas completas:
   * 
   * Stage 1: Reverse XOR con key generada
   * Stage 2: TwoFish decryption (CBC mode)
   * Stage 3: Forward XOR
   * Stage 4: Zlib decompress
   * 
   * NOTA: Requiere implementación completa de TwoFish
   */
  private static decodeVersion7(fileBuffer: Buffer): PKAFileInfo {
    // Implementación futura con TwoFish
    // Keys conocidas para versión 7.2.1:
    // - Key: ABABABABABABABABABABABABABABABAB
    // - IV: CDCDCDCDCDCDCDCDCDCDCDCDCDCDCDCD
    
    throw new Error('Versión 7.x+ requiere implementación de TwoFish CBC');
  }

  /**
   * Extrae información de dispositivos del XML parseado
   */
  public static extractDevices(xmlContent: string): any[] {
    const devices: any[] = [];
    
    // Parsear dispositivos del XML
    const deviceRegex = /<DEVICE>.*?<\/DEVICE>/gs;
    const matches = xmlContent.match(deviceRegex);

    if (matches) {
      for (const deviceXml of matches) {
        const device: any = {};
        
        // Extraer tipo
        const typeMatch = deviceXml.match(/<TYPE model="([^"]+)"[^>]*>([^<]+)<\/TYPE>/);
        if (typeMatch) {
          device.model = typeMatch[1];
          device.type = typeMatch[2];
        }

        // Extraer nombre
        const nameMatch = deviceXml.match(/<NAME[^>]*>([^<]+)<\/NAME>/);
        if (nameMatch) {
          device.name = nameMatch[1];
        }

        // Extraer módulos/interfaces
        const moduleMatches = deviceXml.match(/<MODULE>.*?<\/MODULE>/gs);
        if (moduleMatches) {
          device.modules = moduleMatches.map((mod: string) => {
            const typeMatch = mod.match(/<TYPE>([^<]+)<\/TYPE>/);
            return typeMatch ? typeMatch[1] : 'unknown';
          });
        }

        devices.push(device);
      }
    }

    return devices;
  }

  /**
   * Detecta la versión del archivo basado en el contenido
   */
  public static detectVersion(fileBuffer: Buffer): string {
    // Verificar si es versión 5.x (formato simple)
    // o versión 7.x+ (formato con TwoFish)
    
    // Intentar XOR simple
    const testBuffer = Buffer.alloc(2);
    const fileSize = fileBuffer.length;
    
    for (let i = 4; i < 6; i++) {
      const key = (fileSize - i) & 0xFF;
      testBuffer[i - 4] = fileBuffer[i] ^ key;
    }
    
    // Si los bytes 4-5 son 78 9C (zlib magic), es versión 5.x
    if (testBuffer[0] === 0x78 && testBuffer[1] === 0x9C) {
      return '5.x';
    }
    
    return '7.x+';
  }
}

// Exportar función de conveniencia
export function parsePKAFile(filePath: string): PKAFileInfo {
  return PKAParser.parseFile(filePath);
}
