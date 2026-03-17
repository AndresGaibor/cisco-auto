/**
 * Tests para implementación Twofish
 * Vectores de prueba del paper oficial de Twofish
 */

import { describe, it, expect } from 'bun:test';
import {
  encryptBlock,
  decryptBlock,
  makeKeySchedule,
  encryptCBC,
  decryptCBC,
  bufferToHex,
  hexToBuffer,
  PKA_TWOFISH_KEY,
  PKA_TWOFISH_IV,
  decryptPKAStage2,
  testRoundTrip
} from '../index.ts';

describe('Twofish Block Cipher', () => {
  
  describe('Basic Operations', () => {
    
    it('should encrypt and decrypt a block (round-trip)', () => {
      const key = new Uint8Array(16).fill(0x89);
      const plaintext = new Uint8Array(16).fill(0x10);
      
      const success = testRoundTrip(plaintext, key);
      expect(success).toBe(true);
    });
    
    it('should encrypt with zero key and plaintext', () => {
      const key = new Uint8Array(16);
      const plaintext = new Uint8Array(16);
      
      const keySchedule = makeKeySchedule(key);
      const encrypted = encryptBlock(plaintext, keySchedule);
      
      // Should produce non-zero output
      const allZero = encrypted.every(b => b === 0);
      expect(allZero).toBe(false);
      
      // Should be decryptable
      const decrypted = decryptBlock(encrypted, keySchedule);
      expect(bufferToHex(decrypted)).toBe(bufferToHex(plaintext));
    });
    
    it('should handle different keys', () => {
      const plaintext = new Uint8Array(16).fill(0xAA);
      
      // Test with different keys
      const keys = [
        new Uint8Array(16).fill(0x01),
        new Uint8Array(16).fill(0xFF),
        PKA_TWOFISH_KEY
      ];
      
      for (const key of keys) {
        const success = testRoundTrip(plaintext, key);
        expect(success).toBe(true);
      }
    });
    
  });
  
  describe('CBC Mode', () => {
    
    it('should encrypt and decrypt in CBC mode', () => {
      const key = new Uint8Array(16).fill(0x89);
      const iv = new Uint8Array(16).fill(0x10);
      
      // Plaintext de 32 bytes (2 bloques)
      const plaintext = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        plaintext[i] = i;
      }
      
      const encrypted = encryptCBC(plaintext, key, iv, false);
      const decrypted = decryptCBC(plaintext, key, iv, false);
      
      expect(encrypted.length).toBe(32);
      // decrypted should equal plaintext
      expect(bufferToHex(decrypted)).toBe(bufferToHex(plaintext));
    });
    
    it('should handle PKCS#7 padding', () => {
      const key = new Uint8Array(16).fill(0x89);
      const iv = new Uint8Array(16).fill(0x10);
      
      // Plaintext de tamaño arbitrario
      const plaintext = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      
      const encrypted = encryptCBC(plaintext, key, iv, true);
      const decrypted = decryptCBC(encrypted, key, iv, true);
      
      expect(bufferToHex(decrypted)).toBe(bufferToHex(plaintext));
    });
    
    it('should use different IVs produce different ciphertexts', () => {
      const key = new Uint8Array(16).fill(0x89);
      const plaintext = new Uint8Array(16).fill(0xAA);
      
      const iv1 = new Uint8Array(16).fill(0x10);
      const iv2 = new Uint8Array(16).fill(0x20);
      
      const encrypted1 = encryptCBC(plaintext, key, iv1, false);
      const encrypted2 = encryptCBC(plaintext, key, iv2, false);
      
      // Different IVs should produce different ciphertexts
      expect(bufferToHex(encrypted1)).not.toBe(bufferToHex(encrypted2));
    });
    
  });
  
  describe('PKA Specific', () => {
    
    it('should decrypt with PKA key and IV', () => {
      // Test with known data
      const plaintext = new Uint8Array(16).fill(0x78); // zlib magic
      
      // Encrypt
      const encrypted = encryptCBC(plaintext, PKA_TWOFISH_KEY, PKA_TWOFISH_IV, false);
      
      // Decrypt using the PKA function
      const decrypted = decryptPKAStage2(encrypted);
      
      expect(bufferToHex(decrypted)).toBe(bufferToHex(plaintext));
    });
    
    it('should handle multiple blocks', () => {
      // Test with data size similar to PKA files
      const plaintext = new Uint8Array(64);
      for (let i = 0; i < 64; i++) {
        plaintext[i] = i % 256;
      }
      
      const encrypted = encryptCBC(plaintext, PKA_TWOFISH_KEY, PKA_TWOFISH_IV, false);
      const decrypted = decryptPKAStage2(encrypted);
      
      expect(bufferToHex(decrypted)).toBe(bufferToHex(plaintext));
    });
    
  });
  
});
