/**
 * Stage 3: Forward Deobfuscation
 * 
 * Algoritmo de pka2xml (después de Twofish decrypt):
 * output[i] = input[i] ^ (length - i)
 * 
 * Esto es más simple que stage 1:
 * - Recorrer el buffer de adelante hacia atrás (normal)
 * - XOR cada byte con (length - i)
 */

/**
 * Aplica el stage 3 de deobfuscación al buffer de entrada
 * 
 * @param input Buffer desencriptado con Twofish
 * @returns Buffer deobfuscado (comprimido con zlib)
 */
export function stage3Deobfuscate(input: Uint8Array): Uint8Array {
  const length = input.length;
  const output = new Uint8Array(length);
  
  for (let i = 0; i < length; i++) {
    // Fórmula exacta de pka2xml:
    // input[i] = byte actual
    // (length - i) = clave XOR
    output[i] = input[i] ^ (length - i);
  }
  
  return output;
}

/**
 * Versión alternativa más explícita del stage 3
 * Útil para debugging
 */
export function stage3DeobfuscateDebug(input: Uint8Array): {
  output: Uint8Array;
  debug: Array<{ index: number; inputByte: number; key: number; output: number }>;
} {
  const length = input.length;
  const output = new Uint8Array(length);
  const debug: Array<{ index: number; inputByte: number; key: number; output: number }> = [];
  
  for (let i = 0; i < length; i++) {
    const inputByte = input[i];
    const key = (length - i) & 0xFF; // Asegurar que esté en rango byte
    const outByte = inputByte ^ key;
    
    output[i] = outByte;
    
    // Solo guardar primeros y últimos 5 para debugging
    if (i < 5 || i >= length - 5) {
      debug.push({ index: i, inputByte, key, output: outByte });
    }
  }
  
  return { output, debug };
}
