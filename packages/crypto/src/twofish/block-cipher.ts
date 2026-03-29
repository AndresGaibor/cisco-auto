/**
 * Block Cipher Twofish
 * Implementa el cifrado y descifrado de bloques de 128 bits
 * 
 * Twofish usa una red Feistel de 16 rondas con whitening de entrada y salida
 */

import type { KeySchedule } from './types.ts';
import { getWordLE, setWordLE, rotateLeft, rotateRight } from './utils.ts';
import { gFunction, makeKeySchedule } from './key-schedule.ts';

// ═══════════════════════════════════════════════════════════════════════════
// CIFRADO DE BLOQUES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cifra un bloque de 16 bytes usando Twofish
 * 
 * Proceso:
 * 1. Input whitening (XOR con subkeys 0-3)
 * 2. 16 rondas de Feistel
 * 3. Output whitening (XOR con subkeys 4-7, con swap)
 */
export function encryptBlock(
  plaintext: Uint8Array,
  keySchedule: KeySchedule
): Uint8Array {
  const { subkeys: K, sBoxes: S } = keySchedule;
  
  // Input whitening: XOR con K[0..3]
  let R0 = getWordLE(plaintext, 0) ^ K[0]!;
  let R1 = getWordLE(plaintext, 4) ^ K[1]!;
  let R2 = getWordLE(plaintext, 8) ^ K[2]!;
  let R3 = getWordLE(plaintext, 12) ^ K[3]!;
  
  // 16 rondas de Feistel
  for (let r = 0; r < 16; r++) {
    // Función F
    const T0 = gFunction(R0, S);
    const T1 = gFunction(rotateLeft(R1, 8), S);
    
    // PHT y suma de subkeys
    const F0 = (T0 + T1 + K[2 * r + 8]!) >>> 0;
    const F1 = (T0 + (2 * T1) + K[2 * r + 9]!) >>> 0;
    
    // Actualizar registros con swap Feistel
    const newR2 = rotateRight(R2 ^ F0, 1);
    const newR3 = (R3 ^ F1) >>> 0;
    const newR0 = R2;
    const newR1 = R3;
    
    R0 = newR0;
    R1 = newR1;
    R2 = newR2;
    R3 = newR3;
  }
  
  // Output whitening (con swap de la última ronda)
  const result = new Uint8Array(16);
  
  // Después de 16 rondas, hay un swap implícito
  // Los registros están cruzados
  setWordLE(result, 0, R2 ^ K[6]!);
  setWordLE(result, 4, R3 ^ K[7]!);
  setWordLE(result, 8, R0 ^ K[4]!);
  setWordLE(result, 12, R1 ^ K[5]!);
  
  return result;
}

/**
 * Descifra un bloque de 16 bytes usando Twofish
 * 
 * Proceso inverso:
 * 1. Invertir output whitening
 * 2. 16 rondas inversas
 * 3. Invertir input whitening
 */
export function decryptBlock(
  ciphertext: Uint8Array,
  keySchedule: KeySchedule
): Uint8Array {
  const { subkeys: K, sBoxes: S } = keySchedule;
  
  // Invertir output whitening (con swap)
  let R0 = getWordLE(ciphertext, 8) ^ K[4]!;
  let R1 = getWordLE(ciphertext, 12) ^ K[5]!;
  let R2 = getWordLE(ciphertext, 0) ^ K[6]!;
  let R3 = getWordLE(ciphertext, 4) ^ K[7]!;
  
  // 16 rondas inversas
  for (let r = 15; r >= 0; r--) {
    // Invertir el swap de la ronda
    const oldR0 = R2;
    const oldR1 = R3;
    const oldR2 = R0;
    const oldR3 = R1;
    
    // Calcular F de la ronda r
    const T0 = gFunction(oldR0, S);
    const T1 = gFunction(rotateLeft(oldR1, 8), S);
    
    const F0 = (T0 + T1 + K[2 * r + 8]!) >>> 0;
    const F1 = (T0 + (2 * T1) + K[2 * r + 9]!) >>> 0;
    
    // Invertir la transformación
    R0 = oldR0;
    R1 = oldR1;
    R2 = rotateLeft(oldR2, 1) ^ F0;
    R3 = oldR3 ^ F1;
  }
  
  // Invertir input whitening
  const result = new Uint8Array(16);
  setWordLE(result, 0, R0 ^ K[0]!);
  setWordLE(result, 4, R1 ^ K[1]!);
  setWordLE(result, 8, R2 ^ K[2]!);
  setWordLE(result, 12, R3 ^ K[3]!);
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE CONVENIENCIA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cifra un bloque usando una clave directamente
 * Crea el key schedule internamente
 */
export function encryptBlockWithKey(
  plaintext: Uint8Array,
  key: Uint8Array
): Uint8Array {
  const keySchedule = makeKeySchedule(key);
  return encryptBlock(plaintext, keySchedule);
}

/**
 * Descifra un bloque usando una clave directamente
 */
export function decryptBlockWithKey(
  ciphertext: Uint8Array,
  key: Uint8Array
): Uint8Array {
  const keySchedule = makeKeySchedule(key);
  return decryptBlock(ciphertext, keySchedule);
}

/**
 * Verifica que el cifrado/descifrado funciona correctamente
 * Útil para testing
 */
export function testRoundTrip(plaintext: Uint8Array, key: Uint8Array): boolean {
  const keySchedule = makeKeySchedule(key);
  const encrypted = encryptBlock(plaintext, keySchedule);
  const decrypted = decryptBlock(encrypted, keySchedule);
  
  // Comparar byte a byte
  for (let i = 0; i < plaintext.length; i++) {
    if (plaintext[i] !== decrypted[i]) {
      return false;
    }
  }
  
  return true;
}
