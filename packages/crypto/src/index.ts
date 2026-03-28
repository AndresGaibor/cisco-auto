/**
 * Módulo Twofish para cisco-auto
 * Exporta todas las funciones necesarias para cifrado/descifrado
 */

// Tipos
export type { KeySchedule, TwofishConfig, CBCOptions } from './twofish/types.ts';

// Utilidades
export {
  getWordLE,
  setWordLE,
  rotateLeft,
  rotateRight,
  pht,
  xorBuffers,
  bufferToHex,
  hexToBuffer,
  applyPKCS7Padding,
  removePKCS7Padding
} from './twofish/utils.ts';

// Key Schedule
export {
  makeKeySchedule,
  generateSboxes,
  hFunction,
  gFunction
} from './twofish/key-schedule.ts';

// Block Cipher
export {
  encryptBlock,
  decryptBlock,
  encryptBlockWithKey,
  decryptBlockWithKey,
  testRoundTrip
} from './twofish/block-cipher.ts';

import { decryptCBC } from './twofish/cbc-mode.ts';

// CBC Mode
export {
  encryptCBC,
  decryptCBC,
  CBCEncryptor,
  CBCDecryptor
} from './twofish/cbc-mode.ts';

// EAX Mode
export {
  encryptEAX,
  decryptEAX,
  encryptEAXWithTag,
  decryptEAXWithTag
} from './twofish/eax-mode.ts';

// Constantes PKA específicas
export const PKA_TWOFISH_KEY = new Uint8Array([
  0x89, 0x89, 0x89, 0x89, 0x89, 0x89, 0x89, 0x89,
  0x89, 0x89, 0x89, 0x89, 0x89, 0x89, 0x89, 0x89
]);

export const PKA_TWOFISH_IV = new Uint8Array([
  0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10,
  0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10
]);

/**
 * Descifra datos de un archivo PKA usando la clave e IV de Packet Tracer
 * Esta es la función principal para Stage 2 del decoding PKA
 */
export function decryptPKAStage2(data: Uint8Array): Uint8Array {
  return decryptCBC(data, PKA_TWOFISH_KEY, PKA_TWOFISH_IV, false);
}
