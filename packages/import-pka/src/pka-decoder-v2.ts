/**
 * PKA Decoder V2
 * Implementación completa del algoritmo de 4 etapas basado en pka2xml
 * 
 * Algoritmo:
 * 1. Stage 1: Reverse deobfuscation XOR
 * 2. Stage 2: Twofish EAX decryption (STUB - implementar)
 * 3. Stage 3: Forward deobfuscation XOR
 * 4. Stage 4: zlib decompress
 */

import { readFileSync } from 'fs';
import { stage1Deobfuscate } from './stages/stage1-deobfuscate';
import { stage3Deobfuscate } from './stages/stage3-deobfuscate';
import { stage4ZlibDecompress } from './stages/stage4-zlib';
import { decryptEAX } from '@cisco-auto/crypto';

export interface PKADecodeResult {
  success: boolean;
  xml?: string;
  version?: string;
  error?: string;
  stagesCompleted: number[];
  executionTimeMs?: number;
  stage2Data?: {
    ciphertextLength?: number;
    tagLength?: number;
  };
}

/**
 * Stage 2: Twofish EAX Decryption
 * 
 * Usa la implementación completa de EAX mode
 * Key: 0x89 * 16, IV: 0x10 * 16
 */
const PKA_TWOFISH_KEY = new Uint8Array(16).fill(0x89);
const PKA_TWOFISH_IV = new Uint8Array(16).fill(0x10);

function stage2TwofishEAXDecrypt(input: Uint8Array): Uint8Array {
  // Verificar que hay suficientes datos para tag (16 bytes) + ciphertext
  const TAG_LENGTH = 16;
  if (input.length < TAG_LENGTH + 16) {
    throw new Error(`Stage 2: Input too small for EAX format. Got ${input.length} bytes`);
  }
  
  // En EAX, los últimos 16 bytes son el tag de autenticación
  const ciphertext = input.slice(0, -TAG_LENGTH);
  const tag = input.slice(-TAG_LENGTH);
  
  console.log('[PKA Decoder] Stage 2: Twofish EAX decrypt...');
  console.log(`  Ciphertext: ${ciphertext.length} bytes`);
  console.log(`  Tag: ${Buffer.from(tag).toString('hex')}`);
  
  // Desencriptar usando EAX
  const plaintext = decryptEAX(ciphertext, PKA_TWOFISH_KEY, PKA_TWOFISH_IV, tag);
  
  console.log(`  Decrypted: ${plaintext.length} bytes`);
  
  return plaintext;
}

/**
 * Decodifica un archivo PKA completo
 * 
 * @param data Buffer del archivo PKA
 * @returns Resultado de la decodificación
 */
export function decodePKA(data: Uint8Array): PKADecodeResult {
  const startTime = Date.now();
  const stagesCompleted: number[] = [];
  
  try {
    console.log(`[PKA Decoder] Starting decode of ${data.length} bytes`);
    
    // Stage 1: Reverse deobfuscation
    console.log('[PKA Decoder] Stage 1: Reverse deobfuscation...');
    let buffer = stage1Deobfuscate(data);
    stagesCompleted.push(1);
    console.log(`  Completed, buffer size: ${buffer.length}`);
    
    // Stage 2: Twofish EAX decryption
    console.log('[PKA Decoder] Stage 2: Twofish EAX...');
    buffer = stage2TwofishEAXDecrypt(buffer);
    stagesCompleted.push(2);
    console.log(`  Completed, buffer size: ${buffer.length}`);
    
    // Stage 3: Forward deobfuscation
    console.log('[PKA Decoder] Stage 3: Forward deobfuscation...');
    buffer = stage3Deobfuscate(buffer);
    stagesCompleted.push(3);
    console.log(`  Completed, buffer size: ${buffer.length}`);
    
    // Stage 4: Zlib decompress
    console.log('[PKA Decoder] Stage 4: Zlib decompress...');
    const result = stage4ZlibDecompress(buffer);
    
    if (!result.success) {
      throw new Error(`Stage 4 failed: ${result.error}`);
    }
    
    stagesCompleted.push(4);
    
    // Extraer versión del XML
    const version = extractVersion(result.xml || '');
    
    console.log(`[PKA Decoder] Success! Decoded in ${Date.now() - startTime}ms`);
    console.log(`  Version: ${version || 'unknown'}`);
    console.log(`  XML size: ${result.actualSize} bytes`);
    
    return {
      success: true,
      xml: result.xml,
      version,
      stagesCompleted,
      executionTimeMs: Date.now() - startTime
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[PKA Decoder] Failed: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      stagesCompleted
    };
  }
}

/**
 * Decodifica un archivo PKA desde ruta de archivo
 * 
 * @param filepath Ruta al archivo .pka
 * @returns Resultado de la decodificación
 */
export function decodePKAFile(filepath: string): PKADecodeResult {
  try {
    const data = readFileSync(filepath);
    return decodePKA(new Uint8Array(data));
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read file',
      stagesCompleted: []
    };
  }
}

/**
 * Extrae la versión del XML
 */
function extractVersion(xml: string): string | undefined {
  const match = xml.match(/<VERSION>([^<]+)<\/VERSION>/i);
  return match ? match[1] : undefined;
}

/**
 * Detecta si un archivo es formato PKA antiguo (v5.x) o nuevo (v7.x+)
 * 
 * @param data Primeros bytes del archivo
 * @returns 'v5' | 'v7' | 'unknown'
 */
export function detectPKAVersion(data: Uint8Array): 'v5' | 'v7' | 'unknown' {
  if (data.length < 16) return 'unknown';
  
  // Aplicar stage 1 y verificar magic bytes
  const stage1 = stage1Deobfuscate(data);
  
  // Verificar si parece v5 (XOR simple + zlib)
  // En v5, después de XOR deberían verse los magic bytes de zlib
  const xorV5 = new Uint8Array(data.length);
  const fileSize = data.length;
  for (let i = 0; i < data.length; i++) {
    xorV5[i] = data[i] ^ ((fileSize - i) & 0xFF);
  }
  
  // Si bytes 4-5 son 78 9C, es v5
  if (xorV5[4] === 0x78 && xorV5[5] === 0x9C) {
    return 'v5';
  }
  
  // Si no, probablemente v7 (Twofish EAX)
  return 'v7';
}

// Exportar funciones de stages para uso directo
export { stage1Deobfuscate, stage3Deobfuscate, stage4ZlibDecompress };
