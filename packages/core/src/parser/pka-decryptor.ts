/**
 * PKA File Decryptor
 * 
 * Implementa el algoritmo de 4 etapas para desencriptar archivos .pka de Packet Tracer
 * Basado en investigación de reverse engineering por Ferib y otros
 * 
 * Algoritmo:
 * Stage 1: Reverse XOR
 * Stage 2: TwoFish Decryption (CBC mode)
 * Stage 3: Forward XOR
 * Stage 4: Zlib Decompress
 */

import { Twofish } from 'twofish-ts';
import * as zlib from 'zlib';

export class PKADecryptor {
  // Key para TwoFish (Packet Tracer Saves) - 16 bytes
  private static readonly TWOFISH_KEY = new Uint8Array([
    0x89, 0x89, 0x89, 0x89, 0x89, 0x89, 0x89, 0x89,
    0x89, 0x89, 0x89, 0x89, 0x89, 0x89, 0x89, 0x89
  ]);

  // IV para TwoFish (Packet Tracer Saves) - 16 bytes
  private static readonly TWOFISH_IV = new Uint8Array([
    0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10,
    0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10
  ]);

  /**
   * Desencripta un archivo .pka completo
   */
  public static decrypt(buffer: Buffer): Buffer {
    try {
      // Stage 1: Reverse XOR
      let data = this.stage1ReverseXOR(buffer);
      
      // Stage 2: TwoFish Decryption
      data = this.stage2TwoFishDecrypt(data);
      
      // Stage 3: Forward XOR
      data = this.stage3ForwardXOR(data);
      
      // Stage 4: Zlib Decompress
      data = this.stage4ZlibDecompress(data);
      
      return data;
    } catch (error) {
      throw new Error(`Failed to decrypt PKA file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stage 1: Reverse XOR
   * Basado en análisis de ferib.dev
   * 
   * El algoritmo XOR en orden inverso:
   * Recorre el buffer de atrás hacia adelante
   * Aplica XOR con key calculada
   * 
   * key = length * i (mod 256)
   * buffer[i] = encrypted[length-i-1] XOR (length - key)
   */
  private static stage1ReverseXOR(encrypted: Buffer): Buffer {
    const length = encrypted.length;
    const result = Buffer.alloc(length);
    const key = length & 0xFF;  // Key base = tamaño del archivo mod 256
    
    for (let i = 0; i < length; i++) {
      // Posición inversa
      const pos = length - i - 1;
      const encryptedByte = encrypted[pos];
      
      // Calcular XOR key: (length - (key * i)) & 0xFF
      const xorKey = ((length - (key * i)) & 0xFF);
      
      result[i] = encryptedByte ^ xorKey;
    }
    
    return result;
  }

  /**
   * Stage 2: TwoFish Decryption (CBC mode)
   * Usa twofish-ts con key e IV específicos
   * 
   * NOTA: twofish-ts solo implementa el algoritmo de bloque básico.
   * El modo CBC debe implementarse manualmente.
   */
  private static stage2TwoFishDecrypt(data: Buffer): Buffer {
    const { makeSession, decrypt } = require('twofish-ts');
    
    // Crear sesión con la clave
    const session = makeSession(this.TWOFISH_KEY);
    
    // Crear buffer de salida
    const decrypted = Buffer.alloc(data.length);
    
    // Usar CBC mode manual
    let previousBlock = Buffer.from(this.TWOFISH_IV);
    const blockSize = 16; // Twofish block size
    
    // Procesar cada bloque
    for (let i = 0; i < data.length; i += blockSize) {
      // Asegurar que tenemos un bloque completo
      const endPos = Math.min(i + blockSize, data.length);
      const cipherBlock = data.slice(i, endPos);
      
      // Si el bloque es menor que blockSize, rellenar con ceros
      const paddedCipherBlock = Buffer.alloc(blockSize);
      cipherBlock.copy(paddedCipherBlock);
      
      // Buffer para el plaintext
      const plainBlock = Buffer.alloc(blockSize);
      
      // Decrypt block
      decrypt(paddedCipherBlock, 0, plainBlock, 0, session);
      
      // XOR con el bloque anterior (CBC)
      for (let j = 0; j < blockSize && (i + j) < data.length; j++) {
        decrypted[i + j] = plainBlock[j] ^ previousBlock[j];
      }
      
      // Actualizar bloque anterior para la siguiente iteración
      previousBlock = paddedCipherBlock;
    }
    
    return decrypted;
  }

  /**
   * Stage 3: Forward XOR
   * XOR en orden normal usando el tamaño del buffer como clave
   * 
   * for i from 0 to length-1:
   *   key = (length - i) mod 256
   *   result[i] = buffer[i] XOR key
   */
  private static stage3ForwardXOR(data: Buffer): Buffer {
    const length = data.length;
    const result = Buffer.alloc(length);
    
    for (let i = 0; i < length; i++) {
      const key = ((length - i) & 0xFF);
      result[i] = data[i] ^ key;
    }
    
    return result;
  }

  /**
   * Stage 4: Zlib Decompress
   * Primeros 4 bytes = tamaño descomprimido
   * Resto = datos comprimidos con zlib (header 78 9C)
   */
  private static stage4ZlibDecompress(data: Buffer): Buffer {
    if (data.length < 4) {
      throw new Error('Buffer too small for Stage 4');
    }
    
    // Primeros 4 bytes = tamaño descomprimido (big endian)
    const uncompressedSize = 
      (data[0] << 24) | 
      (data[1] << 16) | 
      (data[2] << 8) | 
      (data[3]);
    
    // Verificar header zlib (78 9C = default compression)
    if (data.length < 6 || data[4] !== 0x78 || data[5] !== 0x9C) {
      throw new Error('Invalid zlib header. Expected 78 9C');
    }
    
    // Extraer datos comprimidos (sin los primeros 4 bytes)
    const compressed = data.slice(4);
    
    // Descomprimir
    const decompressed = zlib.inflateSync(compressed);
    
    // Arreglar caracteres inválidos (0x03 -> 0x3F)
    for (let i = 0; i < decompressed.length; i++) {
      if (decompressed[i] < 0x09) {
        decompressed[i] = 0x3F; // '?'
      }
    }
    
    return decompressed;
  }

  /**
   * Alternativa: Intentar solo Stage 1 + Stage 4 (para archivos v5.x)
   */
  public static decryptV5(buffer: Buffer): Buffer {
    try {
      // Solo Stage 1 + Stage 4 (sin TwoFish)
      let data = this.stage1ReverseXOR(buffer);
      data = this.stage4ZlibDecompress(data);
      return data;
    } catch (error) {
      throw new Error(`Failed to decrypt PKA v5 file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
