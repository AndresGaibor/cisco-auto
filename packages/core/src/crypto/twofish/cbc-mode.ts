/**
 * Modo CBC (Cipher Block Chaining) para Twofish
 * 
 * En modo CBC:
 * - C_i = Encrypt(P_i XOR C_{i-1})
 * - P_i = Decrypt(C_i) XOR C_{i-1}
 * - C_0 = IV (Initialization Vector)
 */

import { encryptBlock, decryptBlock } from './block-cipher.ts';
import { KeySchedule, makeKeySchedule } from './key-schedule.ts';
import { xorBuffers, applyPKCS7Padding, removePKCS7Padding } from './utils.ts';

/**
 * Cifra datos usando Twofish en modo CBC
 * 
 * @param plaintext - Datos a cifrar
 * @param key - Clave de 16/24/32 bytes
 * @param iv - Vector de inicialización de 16 bytes
 * @param usePadding - Si se debe aplicar PKCS#7 padding (default: true)
 * @returns Datos cifrados
 */
export function encryptCBC(
  plaintext: Uint8Array,
  key: Uint8Array,
  iv: Uint8Array,
  usePadding: boolean = true
): Uint8Array {
  // Validar tamaños
  if (iv.length !== 16) {
    throw new Error('IV must be 16 bytes');
  }
  
  const keySchedule = makeKeySchedule(key);
  const blockSize = 16;
  
  // Aplicar padding si es necesario
  let data: Uint8Array;
  if (usePadding) {
    data = applyPKCS7Padding(plaintext, blockSize);
  } else {
    // Verificar que la longitud sea múltiplo del bloque
    if (plaintext.length % blockSize !== 0) {
      throw new Error('Plaintext length must be multiple of block size when not using padding');
    }
    data = plaintext;
  }
  
  const numBlocks = data.length / blockSize;
  const ciphertext = new Uint8Array(data.length);
  
  let previousBlock = new Uint8Array(iv);
  
  for (let i = 0; i < numBlocks; i++) {
    const offset = i * blockSize;
    
    // Extraer bloque actual
    const block = data.slice(offset, offset + blockSize);
    
    // XOR con bloque anterior (o IV para el primer bloque)
    const xored = xorBuffers(block, previousBlock);
    
    // Cifrar
    const encrypted = encryptBlock(xored, keySchedule);
    
    // Guardar en ciphertext
    ciphertext.set(encrypted, offset);
    
    // Actualizar previousBlock para siguiente iteración
    previousBlock = encrypted;
  }
  
  return ciphertext;
}

/**
 * Descifra datos usando Twofish en modo CBC
 * 
 * @param ciphertext - Datos cifrados
 * @param key - Clave de 16/24/32 bytes
 * @param iv - Vector de inicialización de 16 bytes
 * @param usePadding - Si se debe remover PKCS#7 padding (default: true)
 * @returns Datos descifrados
 */
export function decryptCBC(
  ciphertext: Uint8Array,
  key: Uint8Array,
  iv: Uint8Array,
  usePadding: boolean = true
): Uint8Array {
  // Validar tamaños
  if (iv.length !== 16) {
    throw new Error('IV must be 16 bytes');
  }
  
  if (ciphertext.length % 16 !== 0) {
    throw new Error('Ciphertext length must be multiple of block size (16 bytes)');
  }
  
  const keySchedule = makeKeySchedule(key);
  const blockSize = 16;
  const numBlocks = ciphertext.length / blockSize;
  
  const plaintext = new Uint8Array(ciphertext.length);
  let previousBlock = new Uint8Array(iv);
  
  for (let i = 0; i < numBlocks; i++) {
    const offset = i * blockSize;
    
    // Extraer bloque cifrado
    const cipherBlock = ciphertext.slice(offset, offset + blockSize);
    
    // Descifrar
    const decrypted = decryptBlock(cipherBlock, keySchedule);
    
    // XOR con bloque anterior (o IV)
    const plainBlock = xorBuffers(decrypted, previousBlock);
    
    // Guardar en plaintext
    plaintext.set(plainBlock, offset);
    
    // Actualizar previousBlock para siguiente iteración
    previousBlock = cipherBlock;
  }
  
  // Remover padding si es necesario
  if (usePadding) {
    const result = removePKCS7Padding(plaintext);
    if (result === null) {
      throw new Error('Invalid PKCS#7 padding');
    }
    return result;
  }
  
  return plaintext;
}

/**
 * Cifra datos de forma incremental (útil para streaming)
 * Mantiene estado entre llamadas
 */
export class CBCEncryptor {
  private keySchedule: KeySchedule;
  private previousBlock: Uint8Array;
  private buffer: Uint8Array;
  private blockSize: number = 16;
  
  constructor(key: Uint8Array, iv: Uint8Array) {
    if (iv.length !== 16) {
      throw new Error('IV must be 16 bytes');
    }
    this.keySchedule = makeKeySchedule(key);
    this.previousBlock = new Uint8Array(iv);
    this.buffer = new Uint8Array(0);
  }
  
  /**
   * Procesa un chunk de datos
   * Retorna los bloques completos cifrados
   * Los bytes restantes se guardan en buffer interno
   */
  process(chunk: Uint8Array): Uint8Array {
    // Concatenar con buffer previo
    const combined = new Uint8Array(this.buffer.length + chunk.length);
    combined.set(this.buffer);
    combined.set(chunk, this.buffer.length);
    
    // Calcular cuántos bloques completos tenemos
    const numCompleteBlocks = Math.floor(combined.length / this.blockSize);
    const processedLength = numCompleteBlocks * this.blockSize;
    
    if (numCompleteBlocks === 0) {
      // No hay bloques completos, guardar todo en buffer
      this.buffer = combined;
      return new Uint8Array(0);
    }
    
    // Cifrar bloques completos
    const result = new Uint8Array(processedLength);
    
    for (let i = 0; i < numCompleteBlocks; i++) {
      const offset = i * this.blockSize;
      const block = combined.slice(offset, offset + this.blockSize);
      
      // XOR con previous
      const xored = xorBuffers(block, this.previousBlock);
      
      // Cifrar
      const encrypted = encryptBlock(xored, this.keySchedule);
      
      // Guardar
      result.set(encrypted, offset);
      
      // Actualizar previous
      this.previousBlock = encrypted;
    }
    
    // Guardar bytes restantes en buffer
    this.buffer = combined.slice(processedLength);
    
    return result;
  }
  
  /**
   * Finaliza el cifrado aplicando padding
   */
  finalize(): Uint8Array {
    // Aplicar PKCS#7 padding al buffer restante
    const padded = applyPKCS7Padding(this.buffer, this.blockSize);
    
    // Cifrar el bloque con padding
    const result = new Uint8Array(padded.length);
    
    for (let i = 0; i < padded.length; i += this.blockSize) {
      const block = padded.slice(i, i + this.blockSize);
      const xored = xorBuffers(block, this.previousBlock);
      const encrypted = encryptBlock(xored, this.keySchedule);
      result.set(encrypted, i);
      this.previousBlock = encrypted;
    }
    
    return result;
  }
}

/**
 * Descifra datos de forma incremental
 */
export class CBCDecryptor {
  private keySchedule: KeySchedule;
  private previousBlock: Uint8Array;
  private buffer: Uint8Array;
  private blockSize: number = 16;
  
  constructor(key: Uint8Array, iv: Uint8Array) {
    if (iv.length !== 16) {
      throw new Error('IV must be 16 bytes');
    }
    this.keySchedule = makeKeySchedule(key);
    this.previousBlock = new Uint8Array(iv);
    this.buffer = new Uint8Array(0);
  }
  
  /**
   * Procesa un chunk de datos cifrados
   * Retorna los bloques completos descifrados (sin padding aún)
   */
  process(chunk: Uint8Array): Uint8Array {
    // Guardar chunk en buffer
    const combined = new Uint8Array(this.buffer.length + chunk.length);
    combined.set(this.buffer);
    combined.set(chunk, this.buffer.length);
    
    // Necesitamos al menos un bloque completo + posible padding
    if (combined.length < this.blockSize * 2) {
      this.buffer = combined;
      return new Uint8Array(0);
    }
    
    // Procesar todos los bloques excepto el último
    const numBlocksToProcess = Math.floor(combined.length / this.blockSize) - 1;
    const processedLength = numBlocksToProcess * this.blockSize;
    
    const result = new Uint8Array(processedLength);
    
    for (let i = 0; i < numBlocksToProcess; i++) {
      const offset = i * this.blockSize;
      const cipherBlock = combined.slice(offset, offset + this.blockSize);
      
      // Descifrar
      const decrypted = decryptBlock(cipherBlock, this.keySchedule);
      
      // XOR con previous
      const plainBlock = xorBuffers(decrypted, this.previousBlock);
      
      // Guardar
      result.set(plainBlock, offset);
      
      // Actualizar previous
      this.previousBlock = cipherBlock;
    }
    
    // Guardar último bloque + posible sobrante en buffer
    const remainingStart = numBlocksToProcess * this.blockSize;
    this.buffer = combined.slice(remainingStart);
    
    return result;
  }
  
  /**
   * Finaliza el descifrado removiendo padding
   */
  finalize(): Uint8Array {
    // El buffer debe tener exactamente un bloque
    if (this.buffer.length !== this.blockSize) {
      throw new Error('Invalid final block size');
    }
    
    // Descifrar último bloque
    const decrypted = decryptBlock(this.buffer, this.keySchedule);
    
    // XOR con previous
    const plainBlock = xorBuffers(decrypted, this.previousBlock);
    
    // Remover padding
    const result = removePKCS7Padding(plainBlock);
    if (result === null) {
      throw new Error('Invalid PKCS#7 padding');
    }
    
    return result;
  }
}
