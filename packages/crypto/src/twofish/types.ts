/**
 * Tipos TypeScript para implementación de Twofish
 */

/**
 * Estructura del key schedule de Twofish
 */
export interface KeySchedule {
  /** 40 subkeys de 32 bits */
  subkeys: Uint32Array;
  /** 4 S-boxes de 256 entradas */
  sBoxes: Uint32Array[];
}

/**
 * Configuración de Twofish
 */
export interface TwofishConfig {
  /** Tamaño de la clave: 16, 24, o 32 bytes */
  keySize: number;
  /** Número de rondas (16) */
  rounds: number;
  /** Tamaño del bloque (16 bytes) */
  blockSize: number;
}

/**
 * Opciones para modo CBC
 */
export interface CBCOptions {
  /** Vector de inicialización (16 bytes) */
  iv: Uint8Array;
  /** Clave de cifrado */
  key: Uint8Array;
  /** Usar padding PKCS#7 */
  usePadding?: boolean;
}

/**
 * Tamaños de clave soportados
 */
export const SUPPORTED_KEY_SIZES = [16, 24, 32] as const;

/**
 * Tipo para tamaños de clave soportados
 */
export type SupportedKeySize = typeof SUPPORTED_KEY_SIZES[number];