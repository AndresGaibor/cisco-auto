/**
 * Key Schedule para Twofish
 * Genera las subkeys y S-boxes a partir de la clave maestra
 * 
 * El key schedule de Twofish tiene dos partes:
 * 1. Generación de S-boxes usando la matriz RS (Reed-Solomon)
 * 2. Generación de 40 subkeys usando la función h()
 */

import { Q0_TABLE, Q1_TABLE, MDS_TABLE, RS_MATRIX } from './constants.ts';
import type { KeySchedule } from './types.ts';
export type { KeySchedule } from './types.ts';
import { getWordLE, rotateLeft, splitKeyEvenOdd, validateKeySize } from './utils.ts';

// ═══════════════════════════════════════════════════════════════════════════
// GENERACIÓN DE S-BOXES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera las 4 S-boxes de Twofish usando la matriz RS
 * 
 * Cada S-box tiene 256 entradas de 8 bits
 * Las S-boxes son key-dependent y se generan mediante:
 * S[i][j] = RS(multiple of key[i], j)
 */
export function generateSboxes(key: Uint8Array): Uint32Array[] {
  const k = key.length; // 16, 24, o 32 bytes
  const kWords = k / 4; // 4, 6, o 8 palabras
  
  // Tenemos 4 S-boxes
  const sBoxes: Uint32Array[] = [
    new Uint32Array(256),
    new Uint32Array(256),
    new Uint32Array(256),
    new Uint32Array(256)
  ];
  
  // Para cada S-box
  for (let i = 0; i < 4; i++) {
    // Para cada entrada de la S-box (0-255)
    for (let j = 0; j < 256; j++) {
      // Calcular el valor usando RS matrix
      // S[i][j] = RS(key[i*8..i*8+7], j)
      let value = 0;
      
      // Aplicar la multiplicación de matriz RS
      // RS tiene 8 columnas (para key de 128 bits)
      for (let col = 0; col < 8; col++) {
        const keyByte = key[i * 8 + col] || 0;
        const rsByte = RS_MATRIX[i * 8 + col] ?? 0;
        value ^= gfMultiply(rsByte, keyByte, 0x14D); // Polinomio de RS
      }

      sBoxes[i]![j] = value & 0xFF;
    }
  }
  
  return sBoxes;
}

/**
 * Multiplicación en campo de Galois GF(2^8)
 * Usa el polinomio irreducible especificado
 */
function gfMultiply(a: number, b: number, poly: number): number {
  let result = 0;
  let temp = b & 0xFF;
  
  for (let i = 0; i < 8; i++) {
    if (a & (1 << i)) {
      result ^= temp;
    }
    // Verificar si el bit más alto está set
    if (temp & 0x80) {
      temp = ((temp << 1) ^ poly) & 0xFF;
    } else {
      temp = (temp << 1) & 0xFF;
    }
  }
  
  return result & 0xFF;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN h()
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Función h de Twofish
 * Es el corazón del key schedule
 * 
 * Toma una palabra X de 32 bits y un conjunto de key bytes (Me o Mo)
 * Retorna una palabra de 32 bits
 * 
 * h(X, L) = g(X) XOR MDS multiplication
 * donde g(X) aplica S-boxes a cada byte de X
 */
export function hFunction(
  X: number,
  L: Uint8Array,
  sBoxes: Uint32Array[]
): number {
  // Extraer los 4 bytes de X (little-endian)
  const x0 = X & 0xFF;
  const x1 = (X >>> 8) & 0xFF;
  const x2 = (X >>> 16) & 0xFF;
  const x3 = (X >>> 24) & 0xFF;
  
  // Aplicar S-boxes a cada byte
  // Para key de 128 bits, usamos los primeros 4 bytes de L
  const y0 = (sBoxes[0]?.[x0] ?? 0) ^ (L[0] ?? 0);
  const y1 = (sBoxes[1]?.[x1] ?? 0) ^ (L[1] ?? 0);
  const y2 = (sBoxes[2]?.[x2] ?? 0) ^ (L[2] ?? 0);
  const y3 = (sBoxes[3]?.[x3] ?? 0) ^ (L[3] ?? 0);

  // Aplicar tablas MDS pre-calculadas
  // Esto reemplaza la multiplicación completa en GF
  const result = (MDS_TABLE[0]?.[y0] ?? 0) ^
                 (MDS_TABLE[1]?.[y1] ?? 0) ^
                 (MDS_TABLE[2]?.[y2] ?? 0) ^
                 (MDS_TABLE[3]?.[y3] ?? 0);
  
  return result >>> 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERACIÓN DE KEY SCHEDULE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera el key schedule completo para Twofish
 * 
 * Retorna:
 * - 40 subkeys de 32 bits
 * - 4 S-boxes de 256 entradas
 */
export function makeKeySchedule(key: Uint8Array): KeySchedule {
  if (!validateKeySize(key.length)) {
    throw new Error(`Invalid key size: ${key.length}. Must be 16, 24, or 32 bytes.`);
  }
  
  // Generar S-boxes
  const sBoxes = generateSboxes(key);
  
  // Dividir key en Me (even) y Mo (odd)
  const { Me, Mo } = splitKeyEvenOdd(key);
  
  // Generar 40 subkeys
  const subkeys = new Uint32Array(40);
  
  // Para key de 128 bits: kWords = 4
  const kWords = key.length / 4;
  
  // Calcular Me y Mo como arrays de 32-bit words
  const meWords = new Uint8Array(8); // Extended for h function
  const moWords = new Uint8Array(8);
  
  // Copiar datos
  for (let i = 0; i < Me.length && i < 8; i++) {
    meWords[i] = Me[i] ?? 0;
  }
  for (let i = 0; i < Mo.length && i < 8; i++) {
    moWords[i] = Mo[i] ?? 0;
  }
  
  // Generar subkeys
  for (let i = 0; i < 20; i++) {
    // A = h(2*i, Me)
    // B = h(2*i+1, Mo)
    const A = hFunction((2 * i) >>> 0, meWords, sBoxes);
    const B = hFunction((2 * i + 1) >>> 0, moWords, sBoxes);
    
    // Rotar B 8 bits a la izquierda
    const Brot = rotateLeft(B, 8);
    
    // PHT(A + Brot, A + 2*Brot)
    const sumAB = (A + Brot) >>> 0;
    const sum2AB = (A + (2 * Brot)) >>> 0;
    const pht0 = sumAB;
    const pht1 = (sumAB + sum2AB) >>> 0;
    
    // K[2*i] = pht0
    // K[2*i+1] = rotateLeft(pht1, 9)
    subkeys[2 * i] = pht0;
    subkeys[2 * i + 1] = rotateLeft(pht1, 9) ?? 0;
  }
  
  return { subkeys, sBoxes };
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN g()
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Función g de Twofish
 * Aplica S-boxes a una palabra de 32 bits
 * 
 * Esta es la función usada en cada ronda del cifrado
 * g(X) = concatenación de S0[x0], S1[x1], S2[x2], S3[x3]
 */
export function gFunction(X: number, sBoxes: Uint32Array[]): number {
  const x0 = X & 0xFF;
  const x1 = (X >>> 8) & 0xFF;
  const x2 = (X >>> 16) & 0xFF;
  const x3 = (X >>> 24) & 0xFF;
  
  // Aplicar S-boxes y luego MDS
  return (MDS_TABLE[0]?.[sBoxes[0]?.[x0] ?? 0] ?? 0) ^
         (MDS_TABLE[1]?.[sBoxes[1]?.[x1] ?? 0] ?? 0) ^
         (MDS_TABLE[2]?.[sBoxes[2]?.[x2] ?? 0] ?? 0) ^
         (MDS_TABLE[3]?.[sBoxes[3]?.[x3] ?? 0] ?? 0);
}
