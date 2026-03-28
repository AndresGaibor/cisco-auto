#!/usr/bin/env bun
/**
 * Script para probar el decoder PKA v2 con archivos reales
 */

import { decodePKAFile, detectPKAVersion } from '@cisco-auto/core';
import { stage1Deobfuscate, stage3Deobfuscate, stage4ZlibDecompress } from '@cisco-auto/core';
import { readFileSync } from 'fs';

function testFile(filepath: string): void {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PRUEBA DE DECODER PKA V2');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`📁 Archivo: ${filepath}\n`);
  
  try {
    // Leer archivo
    const data = readFileSync(filepath);
    console.log(`📊 Tamaño: ${data.length.toLocaleString()} bytes`);
    
    // Detectar versión
    const version = detectPKAVersion(new Uint8Array(data));
    console.log(`🔍 Versión detectada: ${version}\n`);
    
    // Intentar decodificación completa
    console.log('🔄 Iniciando decodificación...\n');
    const result = decodePKAFile(filepath);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  RESULTADO');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (result.success) {
      console.log('✅ ÉXITO');
      console.log(`📊 Versión: ${result.version || 'unknown'}`);
      console.log(`⏱️  Tiempo: ${result.executionTimeMs}ms`);
      console.log(`📄 XML: ${result.xml?.length || 0} caracteres`);
      
      if (result.xml) {
        console.log('\n--- PRIMEROS 500 CARACTERES DEL XML ---\n');
        console.log(result.xml.substring(0, 500));
        console.log('\n--- ... ---');
      }
    } else {
      console.log('❌ FALLÓ');
      console.log(`💥 Error: ${result.error}`);
      console.log(`✅ Stages completados: [${result.stagesCompleted.join(', ')}]`);
    }
    
    // Análisis adicional de Stage 1
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  ANÁLISIS DE STAGES');
    console.log('═══════════════════════════════════════════════════════════');
    
    console.log('\n📊 Stage 1: Reverse deobfuscation');
    const stage1 = stage1Deobfuscate(new Uint8Array(data));
    console.log(`  Input size: ${data.length}`);
    console.log(`  Output size: ${stage1.length}`);
    console.log(`  Primeros 8 bytes (input): ${Buffer.from(data).slice(0, 8).toString('hex')}`);
    console.log(`  Primeros 8 bytes (output): ${Buffer.from(stage1).slice(0, 8).toString('hex')}`);
    
    // Verificar si parece Twofish (despues de stage 1)
    console.log('\n📊 Análisis post-Stage 1:');
    const sampleSize = Math.min(32, stage1.length);
    console.log(`  Primeros ${sampleSize} bytes: ${Buffer.from(stage1).slice(0, sampleSize).toString('hex')}`);
    
  } catch (error) {
    console.error('❌ Error al leer archivo:', error instanceof Error ? error.message : error);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

// Ejecutar si es llamado directamente
if (import.meta.main) {
  const filepath = process.argv[2] || 'archivos_prueba/2.5.5 Packet Tracer - Configure Initial Switch Settings (2).pka';
  testFile(filepath);
}
