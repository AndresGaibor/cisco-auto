#!/usr/bin/env bun
/**
 * Script para probar la integración con pka2xml externo
 */

import { decodePKAExternal, isPka2XmlAvailable, getPKAInfo, extractDevicesFromXML } from '@cisco-auto/core';

async function testFile(filepath: string): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PRUEBA DE PKA CON HERRAMIENTA EXTERNA');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`📁 Archivo: ${filepath}\n`);
  
  // Verificar disponibilidad
  console.log('🔍 Verificando pka2xml...');
  if (!isPka2XmlAvailable()) {
    console.log('❌ pka2xml no está disponible');
    console.log('   Asegúrate de que esté compilado en archivos_prueba/pka2xml-master/\n');
    return;
  }
  console.log('✅ pka2xml disponible\n');
  
  // Obtener info rápida
  console.log('📊 Obteniendo información...');
  const info = await getPKAInfo(filepath);
  
  if (info.success) {
    console.log(`  Versión: ${info.version || 'unknown'}`);
    console.log(`  Dispositivos: ${info.devices}\n`);
  } else {
    console.log(`  Error: ${info.error}\n`);
  }
  
  // Decodificación completa
  console.log('🔄 Decodificando archivo...');
  const result = await decodePKAExternal(filepath);
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  RESULTADO');
  console.log('═══════════════════════════════════════════════════════════');
  
  if (result.success) {
    console.log('✅ ÉXITO');
    console.log(`⏱️  Tiempo: ${result.executionTimeMs}ms`);
    console.log(`📄 XML: ${result.xml?.length || 0} caracteres`);
    
    // Extraer y mostrar dispositivos
    if (result.xml) {
      const devices = extractDevicesFromXML(result.xml);
      console.log(`\n🔧 Dispositivos encontrados (${devices.length}):`);
      devices.forEach((d, i) => {
        console.log(`  ${i + 1}. ${d.name} (${d.type} ${d.model})`);
      });
      
      console.log('\n--- PRIMEROS 1000 CARACTERES DEL XML ---\n');
      console.log(result.xml.substring(0, 1000));
    }
  } else {
    console.log('❌ FALLÓ');
    console.log(`💥 Error: ${result.error}`);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

// Ejecutar
if (import.meta.main) {
  const filepath = process.argv[2] || 'archivos_prueba/2.5.5 Packet Tracer - Configure Initial Switch Settings (2).pka';
  testFile(filepath).catch(console.error);
}
