/**
 * CTR (Counter) Mode para Twofish
 * 
 * CTR convierte un cifrado de bloque en un stream cipher
 * C_i = P_i ^ E_k(ctr_i)
 * P_i = C_i ^ E_k(ctr_i)
 */

import { makeKeySchedule } from './key-schedule.ts';
import { encryptBlock } from './block-cipher.ts';

const BLOCK_SIZE = 16;

/**
 * Incrementa un counter de 128 bits (16 bytes)
 * Tratado como entero little-endian
 */
function incrementCounter(counter: Uint8Array): void {
  for (let i = counter.length - 1; i >= 0; i--) {
    if (++counter[i] !== 0) {
      break; // No hay carry
    }
  }
}

/**
 * Encripta/Desencripta datos usando CTR mode
 * 
 * CTR es simétrico: encryptCTR = decryptCTR
 * 
 * @param input Datos a encriptar/desencriptar (puede ser cualquier tamaño)
 * @param key Clave de 16/24/32 bytes
 * @param nonce Nonce de 16 bytes (IV inicial)
 * @returns Datos procesados (mismo tamaño que input)
 */
export function encryptCTR(
  input: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array
): Uint8Array {
  if (nonce.length !== BLOCK_SIZE) {
    throw new Error(`Nonce must be ${BLOCK_SIZE} bytes, got ${nonce.length}`);
  }
  
  const keySchedule = makeKeySchedule(key);
  const numBlocks = Math.ceil(input.length / BLOCK_SIZE);
  const output = new Uint8Array(input.length);
  
  // Copiar nonce como counter inicial
  const counter = new Uint8Array(nonce);
  
  for (let i = 0; i < numBlocks; i++) {
    // Generar keystream encriptando el counter
    const keystream = encryptBlock(counter, keySchedule);
    
    // XOR con el input
    const blockStart = i * BLOCK_SIZE;
    const blockEnd = Math.min(blockStart + BLOCK_SIZE, input.length);
    
    for (let j = blockStart; j < blockEnd; j++) {
      output[j] = input[j] ^ keystream[j - blockStart];
    }
    
    // Incrementar counter para siguiente bloque
    incrementCounter(counter);
  }
  
  return output;
}

/**
 * Alias para decryptCTR (CTR es simétrico)
 */
export const decryptCTR = encryptCTR;

/**
 * CTR con acumulación de keystream (para optimización)
 * Pre-genera todo el keystream y luego hace XOR
 */
export function encryptCTROptimized(
  input: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array
): Uint8Array {
  if (nonce.length !== BLOCK_SIZE) {
    throw new Error(`Nonce must be ${BLOCK_SIZE} bytes`);
  }
  
  const keySchedule = makeKeySchedule(key);
  const numBlocks = Math.ceil(input.length / BLOCK_SIZE);
  
  // Pre-generar todo el keystream
  const fullKeystream = new Uint8Array(numBlocks * BLOCK_SIZE);
  const counter = new Uint8Array(nonce);
  
  for (let i = 0; i < numBlocks; i++) {
    const keystream = encryptBlock(counter, keySchedule);
    fullKeystream.set(keystream, i * BLOCK_SIZE);
    incrementCounter(counter);
  }
  
  // XOR con keystream
  const output = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) {
    output[i] = input[i] ^ fullKeystream[i];
  }
  
  return output;
}
