/**
 * CMAC (Cipher-based Message Authentication Code) para Twofish
 * Basado en RFC 4493
 * 
 * CMAC es usado en EAX mode para autenticación
 */

import { makeKeySchedule } from './key-schedule.ts';
import { encryptBlock } from './block-cipher.ts';
import { xorBuffers } from './utils.ts';

const BLOCK_SIZE = 16;
const R_CONSTANT = 0x87; // Constante para GF(2^128)

/**
 * Realiza left shift de 1 bit en un bloque de 16 bytes
 * El bit más significativo se pierde, y el LSB del último byte
 * determina si se aplica XOR con R_CONSTANT
 */
function leftShiftOne(block: Uint8Array): Uint8Array {
  const result = new Uint8Array(BLOCK_SIZE);
  let carry = 0;
  
  for (let i = BLOCK_SIZE - 1; i >= 0; i--) {
    const newCarry = (block[i] ?? 0) & 0x80 ? 1 : 0;
    result[i] = (((block[i] ?? 0) << 1) | carry) & 0xFF;
    carry = newCarry;
  }
  
  return result;
}

/**
 * Genera las subkeys K1 y K2 para CMAC
 * 
 * L = encrypt_block(0^128, key)
 * K1 = L << 1; if msb(L) == 1 then K1 ^= R
 * K2 = K1 << 1; if msb(K1) == 1 then K2 ^= R
 */
function generateSubkeys(key: Uint8Array): [Uint8Array, Uint8Array] {
  const keySchedule = makeKeySchedule(key);
  
  // L = encrypt_block(0^128)
  const zeroBlock = new Uint8Array(BLOCK_SIZE);
  const L = encryptBlock(zeroBlock, keySchedule);
  
  // K1 = L << 1
  const K1 = leftShiftOne(L);
  if ((L[0] ?? 0) & 0x80) {
    K1[BLOCK_SIZE - 1]! ^= R_CONSTANT;
  }
  
  // K2 = K1 << 1
  const K2 = leftShiftOne(K1);
  if ((K1[0] ?? 0) & 0x80) {
    K2[BLOCK_SIZE - 1]! ^= R_CONSTANT;
  }
  
  return [K1, K2];
}

/**
 * Aplica PKCS#7 padding a un mensaje
 * Siempre agrega padding, incluso si el mensaje es múltiplo del bloque
 */
function padBuffer(buffer: Uint8Array): Uint8Array {
  const padding = BLOCK_SIZE - (buffer.length % BLOCK_SIZE);
  const padded = new Uint8Array(buffer.length + padding);
  padded.set(buffer);
  padded.fill(padding, buffer.length);
  return padded;
}

/**
 * Calcula el CMAC de un mensaje
 * 
 * @param message Mensaje a autenticar
 * @param key Clave de 16 bytes
 * @returns Tag de autenticación de 16 bytes
 */
export function cmac(message: Uint8Array, key: Uint8Array): Uint8Array {
  const keySchedule = makeKeySchedule(key);
  const [K1, K2] = generateSubkeys(key);
  
  const n = Math.ceil(message.length / BLOCK_SIZE);
  const lastBlockComplete = (message.length % BLOCK_SIZE === 0) && (message.length > 0);
  
  let X: Uint8Array = new Uint8Array(BLOCK_SIZE); // Estado inicial = 0
  
  // Procesar todos los bloques excepto el último
  for (let i = 0; i < n - 1; i++) {
    const block = message.slice(i * BLOCK_SIZE, (i + 1) * BLOCK_SIZE);
    X = encryptBlock(xorBuffers(X, block), keySchedule);
  }
  
  // Procesar último bloque
  let lastBlock: Uint8Array = message.slice((n - 1) * BLOCK_SIZE);
  
  if (lastBlockComplete) {
    // Mensaje completo: XOR con K1
    lastBlock = xorBuffers(lastBlock, K1);
  } else {
    // Mensaje incompleto: pad y XOR con K2
    lastBlock = padBuffer(lastBlock);
    // Solo usamos los primeros bytes del padded buffer que corresponden al bloque
    const paddedSlice = lastBlock.slice(0, BLOCK_SIZE);
    lastBlock = xorBuffers(paddedSlice, K2);
  }
  
  X = encryptBlock(xorBuffers(X, lastBlock), keySchedule);
  
  return X; // Tag de autenticación
}

/**
 * OMAC (One-key MAC) - Variante de CMAC para EAX
 * 
 * Similar a CMAC pero prepends un byte tag al mensaje
 * tag = 0 para nonce
 * tag = 1 para associated data
 * tag = 2 para ciphertext
 */
export function omac(message: Uint8Array, key: Uint8Array, tag: number): Uint8Array {
  const taggedMessage = new Uint8Array(message.length + 1);
  taggedMessage[0] = tag;
  taggedMessage.set(message, 1);
  return cmac(taggedMessage, key);
}

/**
 * Verifica un tag CMAC en tiempo constante
 * Previene timing attacks
 */
export function verifyCMAC(message: Uint8Array, key: Uint8Array, expectedTag: Uint8Array): boolean {
  const computedTag = cmac(message, key);
  
  // Comparación en tiempo constante
  let result = 0;
  for (let i = 0; i < BLOCK_SIZE; i++) {
    result |= (computedTag[i] ?? 0) ^ (expectedTag[i] ?? 0);
  }
  
  return result === 0;
}
