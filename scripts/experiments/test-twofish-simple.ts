/**
 * Test simple para verificar importaciones de Twofish
 */

import { KeySchedule } from '../twofish/types.ts';
import { getWordLE } from '../twofish/utils.ts';
import { makeKeySchedule } from '../twofish/key-schedule.ts';
import { encryptBlock, decryptBlock } from '../twofish/block-cipher.ts';

console.log('Testing Twofish imports...');

// Test 1: Crear un key schedule
const key = new Uint8Array(16).fill(0x89);
const keySchedule = makeKeySchedule(key);

console.log('✓ KeySchedule created');
console.log('  - Subkeys:', keySchedule.subkeys.length);
console.log('  - S-boxes:', keySchedule.sBoxes.length);

// Test 2: Encriptar un bloque
const plaintext = new Uint8Array(16).fill(0x10);
const encrypted = encryptBlock(plaintext, keySchedule);

console.log('✓ Block encrypted');
console.log('  - Encrypted:', Buffer.from(encrypted).toString('hex'));

// Test 3: Desencriptar
const decrypted = decryptBlock(encrypted, keySchedule);

console.log('✓ Block decrypted');
console.log('  - Decrypted:', Buffer.from(decrypted).toString('hex'));

// Test 4: Verificar round-trip
const matches = Buffer.from(plaintext).equals(Buffer.from(decrypted));
console.log('✓ Round-trip:', matches ? 'SUCCESS' : 'FAILED');

console.log('\nAll tests passed!');
