/**
 * Stage 1: Reverse Deobfuscation
 * 
 * Algoritmo de pka2xml:
 * processed[i] = input[length - i - 1] ^ (length - i * length)
 * 
 * Esto es equivalente a:
 * - Recorrer el buffer de atrás hacia adelante
 * - XOR cada byte con (length - i * length)
 */

/**
 * Aplica el stage 1 de deobfuscación al buffer de entrada
 * 
 * @param input Buffer cifrado de entrada
 * @returns Buffer deobfuscado (todavía encriptado con Twofish)
 */
export function stage1Deobfuscate(input: Uint8Array): Uint8Array {
  const length = input.length;
  const processed = new Uint8Array(length);
  
  for (let i = 0; i < length; i++) {
    // Fórmula exacta de pka2xml:
    // input[length - i - 1] = byte desde el final
    // (length - i * length) = clave XOR
    processed[i] = input[length - i - 1] ^ (length - i * length);
  }
  
  return processed;
}

/**
 * Versión alternativa más explícita del stage 1
 * Útil para debugging
 */
export function stage1DeobfuscateDebug(input: Uint8Array): {
  output: Uint8Array;
  debug: Array<{ index: number; inputPos: number; inputByte: number; key: number; output: number }>;
} {
  const length = input.length;
  const processed = new Uint8Array(length);
  const debug: Array<{ index: number; inputPos: number; inputByte: number; key: number; output: number }> = [];
  
  for (let i = 0; i < length; i++) {
    const inputPos = length - i - 1;
    const inputByte = input[inputPos];
    const key = (length - i * length) & 0xFF; // Asegurar que esté en rango byte
    const output = inputByte ^ key;
    
    processed[i] = output;
    
    // Solo guardar primeros y últimos 5 para debugging
    if (i < 5 || i >= length - 5) {
      debug.push({ index: i, inputPos, inputByte, key, output });
    }
  }
  
  return { output: processed, debug };
}
