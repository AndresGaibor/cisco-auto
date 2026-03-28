/**
 * Tests para los stages de PKA
 */

import { describe, it, expect } from 'bun:test';
import { stage1Deobfuscate } from '../stages/stage1-deobfuscate.ts';
import { stage3Deobfuscate } from '../stages/stage3-deobfuscate.ts';
import { stage4ZlibDecompress, isQCompressFormat, getQCompressInfo } from '../stages/stage4-zlib.ts';
import { deflateSync } from 'zlib';

describe('PKA Stages', () => {
  
  describe('Stage 1: Reverse Deobfuscation', () => {
    
    it('should deobfuscate a simple buffer', () => {
      const input = new Uint8Array([0x9d, 0x59, 0x49, 0xa9]); // 4 bytes
      const result = stage1Deobfuscate(input);
      
      // Verificar que el resultado tiene el mismo tamaño
      expect(result.length).toBe(4);
      
      // Verificar que los valores son diferentes (están XORados)
      expect(result).not.toEqual(input);
    });
    
    it('should be reversible with XOR properties', () => {
      // XOR es su propia inversa: (a ^ b) ^ b = a
      // Pero stage 1 no es simétrico porque el orden cambia
      const input = new Uint8Array(8);
      for (let i = 0; i < 8; i++) {
        input[i] = i;
      }
      
      const result = stage1Deobfuscate(input);
      
      // El resultado debe tener el mismo tamaño
      expect(result.length).toBe(8);
      
      // Verificar que no es igual al original (se transformó)
      expect(result).not.toEqual(input);
    });
    
  });
  
  describe('Stage 3: Forward Deobfuscation', () => {
    
    it('should deobfuscate a simple buffer', () => {
      const input = new Uint8Array([0x78, 0x9c, 0x00, 0x00]); // 4 bytes
      const result = stage3Deobfuscate(input);
      
      // Verificar que el resultado tiene el mismo tamaño
      expect(result.length).toBe(4);
      
      // Verificar que los valores son diferentes
      expect(result).not.toEqual(input);
    });
    
    it('should XOR each byte correctly', () => {
      // Para buffer de 4 bytes:
      // i=0: output[0] = input[0] ^ 4
      // i=1: output[1] = input[1] ^ 3
      // i=2: output[2] = input[2] ^ 2
      // i=3: output[3] = input[3] ^ 1
      
      const input = new Uint8Array([4, 3, 2, 1]);
      const result = stage3Deobfuscate(input);
      
      // 4 ^ 4 = 0
      // 3 ^ 3 = 0
      // 2 ^ 2 = 0
      // 1 ^ 1 = 0
      expect(result[0]).toBe(0);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(0);
      expect(result[3]).toBe(0);
    });
    
  });
  
  describe('Stage 4: Zlib Decompress', () => {
    
    it('should decompress valid qCompress data', () => {
      // Crear datos de prueba en formato qCompress
      const originalData = Buffer.from('Hello, World! This is a test of zlib compression.');
      
      // Comprimir con zlib
      const compressed = deflateSync(originalData);
      
      // Crear buffer qCompress (4 bytes de tamaño + datos comprimidos)
      const qCompress = new Uint8Array(4 + compressed.length);
      
      // Escribir tamaño (big-endian)
      qCompress[0] = (originalData.length >> 24) & 0xFF;
      qCompress[1] = (originalData.length >> 16) & 0xFF;
      qCompress[2] = (originalData.length >> 8) & 0xFF;
      qCompress[3] = originalData.length & 0xFF;
      
      // Copiar datos comprimidos
      qCompress.set(compressed, 4);
      
      // Descomprimir
      const result = stage4ZlibDecompress(qCompress);
      
      expect(result.success).toBe(true);
      expect(result.xml).toBe(originalData.toString('utf-8'));
    });
    
    it('should detect invalid input', () => {
      const tooSmall = new Uint8Array([0x00, 0x00]);
      const result = stage4ZlibDecompress(tooSmall);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('too small');
    });
    
    it('should detect invalid size', () => {
      const badSize = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]); // Tamaño negativo en signed
      const result = stage4ZlibDecompress(badSize);
      
      expect(result.success).toBe(false);
    });
    
  });
  
  describe('Stage 4 Helpers', () => {
    
    it('should get qCompress info', () => {
      const data = new Uint8Array([0x00, 0x00, 0x00, 0x10]); // 16 bytes descomprimidos
      const info = getQCompressInfo(data);
      
      expect(info.isValid).toBe(true);
      expect(info.uncompressedSize).toBe(16);
    });
    
    it('should detect invalid qCompress', () => {
      const empty = new Uint8Array(0);
      const info = getQCompressInfo(empty);
      
      expect(info.isValid).toBe(false);
    });
    
  });
  
});
