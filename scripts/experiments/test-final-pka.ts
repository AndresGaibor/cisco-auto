#!/usr/bin/env bun
/**
 * Test final del parser PKA integrado
 */

import { parsePKA, isPka2XmlAvailable } from '@cisco-auto/core';

async function testFile(filepath: string): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  TEST FINAL - PARSER PKA INTEGRADO');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`📁 Archivo: ${filepath}\n`);
  
  console.log('🔍 Estado:');
  console.log(`  pka2xml disponible: ${isPka2XmlAvailable() ? '✅ Sí' : '❌ No'}\n`);
  
  console.log('🔄 Parseando...\n');
  
  const startTime = Date.now();
  const result = await parsePKA(filepath);
  const totalTime = Date.now() - startTime;
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  RESULTADO');
  console.log('═══════════════════════════════════════════════════════════');
  
  if (result.success) {
    console.log('✅ ÉXITO');
    console.log(`⏱️  Tiempo total: ${totalTime}ms`);
    console.log(`📊 Método: ${result.method === 'external' ? 'pka2xml (externo)' : 'implementación interna'}`);
    console.log(`📄 XML: ${result.xml?.length.toLocaleString()} caracteres`);
    console.log(`🔖 Versión: ${result.version || 'unknown'}`);
    
    if (result.devices && result.devices.length > 0) {
      console.log(`\n🔧 Dispositivos (${result.devices.length}):`);
      result.devices.forEach((d, i) => {
        console.log(`  ${i + 1}. ${d.name} (${d.type} ${d.model})`);
      });
    }
    
    console.log('\n--- PRIMEROS 500 CARACTERES DEL XML ---\n');
    console.log(result.xml?.substring(0, 500));
    console.log('\n--- ... ---');
  } else {
    console.log('❌ FALLÓ');
    console.log(`💥 Error: ${result.error}`);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

if (import.meta.main) {
  const filepath = process.argv[2] || 'archivos_prueba/2.5.5 Packet Tracer - Configure Initial Switch Settings (2).pka';
  testFile(filepath).catch(console.error);
}
