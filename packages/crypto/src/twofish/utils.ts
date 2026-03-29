/**
 * Utilidades para implementación de Twofish
 * Funciones helper para operaciones de bajo nivel
 */

import { SUPPORTED_KEY_SIZES } from './types.ts';

// ═══════════════════════════════════════════════════════════════════════════
// OPERACIONES DE ENDIANNESS
// Twofish usa palabras de 32 bits en little-endian
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lee una palabra de 32 bits (4 bytes) de un buffer en little-endian
 */
export function getWordLE(data: Uint8Array, offset: number): number {
  return (
    (data[offset] ?? 0) |
    ((data[offset + 1] ?? 0) << 8) |
    ((data[offset + 2] ?? 0) << 16) |
    ((data[offset + 3] ?? 0) << 24)
  ) >>> 0; // >>> 0 para forzar unsigned
}

/**
 * Escribe una palabra de 32 bits (4 bytes) en un buffer en little-endian
 */
export function setWordLE(data: Uint8Array, offset: number, value: number): void {
  data[offset] = value & 0xFF;
  data[offset + 1] = (value >>> 8) & 0xFF;
  data[offset + 2] = (value >>> 16) & 0xFF;
  data[offset + 3] = (value >>> 24) & 0xFF;
}

/**
 * Convierte un Uint8Array a Uint32Array (little-endian)
 */
export function bytesToWords(bytes: Uint8Array): Uint32Array {
  const words = new Uint32Array(bytes.length / 4);
  for (let i = 0; i < words.length; i++) {
    words[i] = getWordLE(bytes, i * 4);
  }
  return words;
}

/**
 * Convierte un Uint32Array a Uint8Array (little-endian)
 */
export function wordsToBytes(words: Uint32Array): Uint8Array {
  const bytes = new Uint8Array(words.length * 4);
  for (let i = 0; i < words.length; i++) {
    setWordLE(bytes, i * 4, words[i]!);
  }
  return bytes;
}

// ═══════════════════════════════════════════════════════════════════════════
// OPERACIONES DE BITS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rotación circular a la izquierda de 32 bits
 */
export function rotateLeft(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}

/**
 * Rotación circular a la derecha de 32 bits
 */
export function rotateRight(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// PSEUDO-HADAMARD TRANSFORM (PHT)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pseudo-Hadamard Transform
 * Usado en la red Feistel de Twofish
 * 
 * PHT(a, b) = (a + b, a + 2*b) mod 2^32
 */
export function pht(a: number, b: number): [number, number] {
  const sum = (a + b) >>> 0;
  const doubled = (a + 2 * b) >>> 0;
  return [sum, doubled];
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES PARA KEYS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Valida que un tamaño de clave sea soportado
 */
export function validateKeySize(keySize: number): boolean {
  return SUPPORTED_KEY_SIZES.includes(keySize as 16 | 24 | 32);
}

/**
 * Extiende o trunca una clave al tamaño especificado
 */
export function padKey(key: Uint8Array, targetSize: number): Uint8Array {
  if (key.length === targetSize) {
    return key;
  }
  
  const padded = new Uint8Array(targetSize);
  
  if (key.length < targetSize) {
    // Rellenar con ceros
    padded.set(key);
    // El resto queda en cero
  } else {
    // Truncar
    padded.set(key.slice(0, targetSize));
  }
  
  return padded;
}

/**
 * Divide una clave en palabras (little-endian words)
 */
export function keyToWords(key: Uint8Array): Uint32Array {
  return bytesToWords(key);
}

/**
 * Extrae los bytes pares (even) e impares (odd) de una clave
 * Esto es parte del key schedule de Twofish
 */
export function splitKeyEvenOdd(key: Uint8Array): { Me: Uint8Array; Mo: Uint8Array } {
  const k = key.length / 4; // Número de palabras de 32 bits
  const Me = new Uint8Array(4 * Math.ceil(k / 2));
  const Mo = new Uint8Array(4 * Math.floor(k / 2));

  let meIndex = 0;
  let moIndex = 0;

  for (let i = 0; i < k; i++) {
    const wordOffset = i * 4;
    if (i % 2 === 0) {
      // Par: va a Me
      for (let j = 0; j < 4; j++) {
        Me[meIndex++] = key[wordOffset + j]!;
      }
    } else {
      // Impar: va a Mo
      for (let j = 0; j < 4; j++) {
        Mo[moIndex++] = key[wordOffset + j]!;
      }
    }
  }

  return { Me, Mo };
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES PARA BUFFERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Concatena múltiples Uint8Arrays
 */
export function concatBuffers(...buffers: Uint8Array[]): Uint8Array {
  const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
  const result = new Uint8Array(totalLength);
  
  let offset = 0;
  for (const buf of buffers) {
    result.set(buf, offset);
    offset += buf.length;
  }
  
  return result;
}

/**
 * XOR de dos buffers byte a byte
 * Los buffers deben tener la misma longitud
 */
export function xorBuffers(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length !== b.length) {
    throw new Error('Buffers must have the same length for XOR');
  }

  const result = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = (a[i] ?? 0) ^ (b[i] ?? 0);
  }

  return result;
}

/**
 * Aplica PKCS#7 padding a un buffer
 * El padding agrega bytes con valor igual al número de bytes agregados
 */
export function applyPKCS7Padding(data: Uint8Array, blockSize: number): Uint8Array {
  const padding = blockSize - (data.length % blockSize);
  const padded = new Uint8Array(data.length + padding);
  
  padded.set(data);
  padded.fill(padding, data.length);
  
  return padded;
}

/**
 * Remueve PKCS#7 padding de un buffer
 * Retorna el buffer sin padding o null si el padding es inválido
 */
export function removePKCS7Padding(data: Uint8Array): Uint8Array | null {
  if (data.length === 0) return data;

  const padding = data[data.length - 1] ?? 0;

  // Validar que el padding sea razonable
  if (padding === 0 || padding > 16 || padding > data.length) {
    return null;
  }

  // Verificar que todos los bytes de padding tengan el mismo valor
  for (let i = data.length - padding; i < data.length; i++) {
    if ((data[i] ?? 0) !== padding) {
      return null;
    }
  }

  return data.slice(0, data.length - padding);
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES DE DEBUG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convierte un buffer a string hexadecimal para debugging
 */
export function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convierte un string hexadecimal a buffer
 */
export function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Imprime información de debug de un buffer
 */
export function debugBuffer(name: string, buffer: Uint8Array): void {
  console.log(`${name}: ${bufferToHex(buffer)} (${buffer.length} bytes)`);
}
