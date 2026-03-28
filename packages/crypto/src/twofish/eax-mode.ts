/**
 * EAX Mode para Twofish
 * 
 * EAX es un modo autenticado de operación que combina:
 * - CMAC para autenticación
 * - CTR para confidencialidad
 * 
 * Proporciona tanto encriptación como autenticación (AEAD)
 */

import { omac } from './cmac.ts';
import { encryptCTR, decryptCTR } from './ctr-mode.ts';

const BLOCK_SIZE = 16;
const TAG_LENGTH = 16; // Tamaño del tag de autenticación

export interface EAXResult {
  ciphertext: Uint8Array;
  tag: Uint8Array;
}

/**
 * Encripta usando EAX mode
 * 
 * Algoritmo:
 * 1. N = OMAC(nonce, 0)
 * 2. H = OMAC(associatedData, 1) [si hay]
 * 3. C = CTR_encrypt(plaintext) usando N como IV
 * 4. MAC = OMAC(C, 2)
 * 5. Tag = N ^ H ^ MAC
 * 
 * @param plaintext Datos a encriptar
 * @param key Clave de 16 bytes
 * @param nonce Nonce de 16 bytes (IV)
 * @param associatedData Datos asociados (opcional, para autenticación)
 * @returns Ciphertext + Tag de autenticación
 */
export function encryptEAX(
  plaintext: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  associatedData: Uint8Array = new Uint8Array(0)
): EAXResult {
  // 1. N = OMAC(nonce, 0)
  const N = omac(nonce, key, 0);
  
  // 2. H = OMAC(associatedData, 1)
  const H = omac(associatedData, key, 1);
  
  // 3. C = CTR_encrypt(plaintext) usando N como IV
  const C = encryptCTR(plaintext, key, N);
  
  // 4. MAC = OMAC(C, 2)
  const MAC_C = omac(C, key, 2);
  
  // 5. Tag = N ^ H ^ MAC (primeros TAG_LENGTH bytes)
  const tag = new Uint8Array(TAG_LENGTH);
  for (let i = 0; i < TAG_LENGTH; i++) {
    tag[i] = N[i] ^ H[i] ^ MAC_C[i];
  }
  
  return { ciphertext: C, tag };
}

/**
 * Desencripta usando EAX mode con verificación de autenticación
 * 
 * Algoritmo:
 * 1. N = OMAC(nonce, 0)
 * 2. H = OMAC(associatedData, 1)
 * 3. Calcular tag esperado = N ^ H ^ OMAC(ciphertext, 2)
 * 4. Verificar tag recibido vs esperado
 * 5. Si OK: P = CTR_decrypt(ciphertext) usando N
 * 
 * @param ciphertext Datos cifrados (sin el tag)
 * @param key Clave de 16 bytes
 * @param nonce Nonce de 16 bytes
 * @param receivedTag Tag de autenticación recibido
 * @param associatedData Datos asociados (opcional)
 * @returns Plaintext desencriptado
 * @throws Error si la autenticación falla
 */
export function decryptEAX(
  ciphertext: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  receivedTag: Uint8Array,
  associatedData: Uint8Array = new Uint8Array(0)
): Uint8Array {
  if (receivedTag.length !== TAG_LENGTH) {
    throw new Error(`Tag must be ${TAG_LENGTH} bytes, got ${receivedTag.length}`);
  }
  
  // 1. N = OMAC(nonce, 0)
  const N = omac(nonce, key, 0);
  
  // 2. H = OMAC(associatedData, 1)
  const H = omac(associatedData, key, 1);
  
  // 3. Calcular tag esperado
  const MAC_C = omac(ciphertext, key, 2);
  const expectedTag = new Uint8Array(TAG_LENGTH);
  for (let i = 0; i < TAG_LENGTH; i++) {
    expectedTag[i] = N[i] ^ H[i] ^ MAC_C[i];
  }
  
  // 4. Verificar tag (comparación en tiempo constante)
  if (!constantTimeEquals(receivedTag, expectedTag)) {
    throw new Error('EAX authentication failed: invalid tag');
  }
  
  // 5. P = CTR_decrypt(ciphertext) usando N
  const plaintext = decryptCTR(ciphertext, key, N);
  
  return plaintext;
}

/**
 * Comparación en tiempo constante para prevenir timing attacks
 */
function constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  
  return result === 0;
}

/**
 * Encripta y concatena ciphertext + tag
 * Formato: ciphertext || tag
 */
export function encryptEAXWithTag(
  plaintext: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  associatedData: Uint8Array = new Uint8Array(0)
): Uint8Array {
  const { ciphertext, tag } = encryptEAX(plaintext, key, nonce, associatedData);
  
  // Concatenar ciphertext + tag
  const result = new Uint8Array(ciphertext.length + tag.length);
  result.set(ciphertext, 0);
  result.set(tag, ciphertext.length);
  
  return result;
}

/**
 * Desencripta buffer que contiene ciphertext || tag
 * Extrae el tag automáticamente
 */
export function decryptEAXWithTag(
  data: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  associatedData: Uint8Array = new Uint8Array(0)
): Uint8Array {
  if (data.length < TAG_LENGTH) {
    throw new Error(`Data too small: ${data.length} bytes (minimum ${TAG_LENGTH})`);
  }
  
  const ciphertext = data.slice(0, -TAG_LENGTH);
  const tag = data.slice(-TAG_LENGTH);
  
  return decryptEAX(ciphertext, key, nonce, tag, associatedData);
}
