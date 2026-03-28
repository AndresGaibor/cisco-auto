/**
 * PKA Encoder - Codifica XML/YAML a formato PKA encriptado
 * 
 * Implementa las 4 etapas inversas del decoder:
 * Stage 1: zlib compress
 * Stage 2: Twofish EAX encryption
 * Stage 3: Forward obfuscation XOR
 * Stage 4: Reverse obfuscation XOR
 */

import { deflateSync } from 'zlib';
import { encryptEAX } from '@cisco-auto/crypto/twofish/eax-mode.ts';

/**
 * Constantes para encriptación PKA
 */
const PKA_TWOFISH_KEY = new Uint8Array(16).fill(0x89);
const PKA_TWOFISH_IV = new Uint8Array(16).fill(0x10);

export interface PKAEncodeResult {
  success: boolean;
  data?: Uint8Array;
  error?: string;
  stagesCompleted: number[];
  executionTimeMs?: number;
}

/**
 * Stage 1: Zlib Compress
 * 
 * Comprime el XML con zlib (formato qCompress de Qt)
 * - 4 bytes: tamaño descomprimido (big-endian)
 * - resto: zlib compressed data
 */
function stage1ZlibCompress(xml: string): Uint8Array {
  // Convertir XML a bytes
  const xmlBytes = new TextEncoder().encode(xml);
  
  // Comprimir con zlib (compression level 6 = default)
  const compressed = deflateSync(Buffer.from(xmlBytes), { level: 6 });
  
  // Crear buffer con tamaño descomprimido (big-endian)
  const result = new Uint8Array(4 + compressed.length);
  
  // Tamaño descomprimido en big-endian
  result[0] = (xmlBytes.length >> 24) & 0xFF;
  result[1] = (xmlBytes.length >> 16) & 0xFF;
  result[2] = (xmlBytes.length >> 8) & 0xFF;
  result[3] = xmlBytes.length & 0xFF;
  
  // Copiar datos comprimidos
  result.set(compressed, 4);
  
  return result;
}

/**
 * Stage 2: Twofish EAX Encryption
 * 
 * Encripta usando Twofish en modo EAX con autenticación
 * - Ciphertext + 16-byte authentication tag
 */
function stage2TwofishEAXEncrypt(input: Uint8Array): Uint8Array {
  console.log('[PKA Encoder] Stage 2: Twofish EAX encrypt...');
  console.log(`  Input: ${input.length} bytes`);
  
  // Encriptar usando EAX mode
  const { ciphertext, tag } = encryptEAX(input, PKA_TWOFISH_KEY, PKA_TWOFISH_IV);
  
  console.log(`  Ciphertext: ${ciphertext.length} bytes`);
  console.log(`  Tag: ${Buffer.from(tag).toString('hex')}`);
  
  // Concatenar ciphertext + tag
  const result = new Uint8Array(ciphertext.length + tag.length);
  result.set(ciphertext, 0);
  result.set(tag, ciphertext.length);
  
  return result;
}

/**
 * Stage 3: Forward Obfuscation XOR
 * 
 * XOR con contador decreciente: byte[i] XOR (length - i)
 * (Inverso del stage 3 del decoder)
 */
function stage3ForwardObfuscate(input: Uint8Array): Uint8Array {
  const length = input.length;
  const result = new Uint8Array(length);
  
  for (let i = 0; i < length; i++) {
    const key = (length - i) & 0xFF;
    result[i] = input[i] ^ key;
  }
  
  return result;
}

/**
 * Stage 4: Reverse Obfuscation XOR
 * 
 * Inverso del decoder stage 1:
 * Decoder: processed[i] = input[length - i - 1] ^ (length - i * length)
 * Encoder: output[length - i - 1] = input[i] ^ (length - i * length)
 */
function stage4ReverseObfuscate(input: Uint8Array): Uint8Array {
  const length = input.length;
  const result = new Uint8Array(length);
  
  for (let i = 0; i < length; i++) {
    // Usar la misma fórmula del decoder stage 1 pero invirtiendo
    const key = (length - i * length) & 0xFF;
    result[length - i - 1] = input[i] ^ key;
  }
  
  return result;
}

/**
 * Codifica un XML a formato PKA
 * 
 * @param xml Contenido XML del archivo PKA
 * @returns Datos binarios encriptados
 */
export function encodePKA(xml: string): PKAEncodeResult {
  const startTime = Date.now();
  const stagesCompleted: number[] = [];
  
  try {
    console.log(`[PKA Encoder] Starting encode of ${xml.length} chars`);
    
    // Stage 1: Zlib compress
    console.log('[PKA Encoder] Stage 1: Zlib compress...');
    let buffer = stage1ZlibCompress(xml);
    stagesCompleted.push(1);
    console.log(`  Completed, buffer size: ${buffer.length}`);
    
    // Stage 2: Twofish EAX encryption
    console.log('[PKA Encoder] Stage 2: Twofish EAX...');
    buffer = stage2TwofishEAXEncrypt(buffer);
    stagesCompleted.push(2);
    console.log(`  Completed, buffer size: ${buffer.length}`);
    
    // Stage 3: Forward obfuscation
    console.log('[PKA Encoder] Stage 3: Forward obfuscation...');
    buffer = stage3ForwardObfuscate(buffer);
    stagesCompleted.push(3);
    console.log(`  Completed, buffer size: ${buffer.length}`);
    
    // Stage 4: Reverse obfuscation
    console.log('[PKA Encoder] Stage 4: Reverse obfuscation...');
    buffer = stage4ReverseObfuscate(buffer);
    stagesCompleted.push(4);
    console.log(`  Completed, buffer size: ${buffer.length}`);
    
    console.log(`[PKA Encoder] Success! Encoded in ${Date.now() - startTime}ms`);
    
    return {
      success: true,
      data: buffer,
      stagesCompleted,
      executionTimeMs: Date.now() - startTime
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[PKA Encoder] Failed: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      stagesCompleted
    };
  }
}

/**
 * Codifica XML y guarda a archivo
 */
export async function encodePKAFile(xml: string, filepath: string): Promise<PKAEncodeResult> {
  const result = encodePKA(xml);
  
  if (result.success && result.data) {
    try {
      const { writeFile } = await import('fs/promises');
      await writeFile(filepath, Buffer.from(result.data));
      console.log(`[PKA Encoder] Saved to ${filepath}`);
    } catch (error) {
      return {
        success: false,
        error: `Failed to write file: ${error}`,
        stagesCompleted: result.stagesCompleted
      };
    }
  }
  
  return result;
}

// Exportar funciones de stages para uso directo
export {
  stage1ZlibCompress,
  stage2TwofishEAXEncrypt,
  stage3ForwardObfuscate,
  stage4ReverseObfuscate
};
