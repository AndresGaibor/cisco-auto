#!/usr/bin/env bun
/**
 * Analizador de archivos PKA/PKT
 * Detecta la versión de Packet Tracer y sugiere método de decodificación
 */

import { readFileSync } from 'node:fs';
import { decodePKA5x, extractDevices } from '../core/parser/pka-tool.ts';

function analyzeFile(filepath: string): void {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ANÁLISIS DE ARCHIVO PKA/PKT');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`📁 Archivo: ${filepath}`);
  
  try {
    const data = readFileSync(filepath);
    console.log(`📊 Tamaño: ${data.length.toLocaleString()} bytes`);
    console.log(`📄 Primeros 16 bytes: ${data.slice(0, 16).toString('hex')}`);
    console.log(`📄 Últimos 16 bytes: ${data.slice(-16).toString('hex')}`);
    console.log();
    
    // Intentar algoritmo PT 5.x
    console.log('🔍 Probando algoritmo PT 5.x...');
    const result5x = decodePKA5x(data);
    
    if (result5x.success) {
      console.log('✅ ¡ÉXITO! Archivo PT 5.x detectado');
      console.log(`📊 Versión: ${result5x.version}`);
      console.log(`📄 XML: ${result5x.xml?.length.toLocaleString()} bytes`);
      
      const devices = extractDevices(result5x.xml || '');
      console.log(`\n🔧 Dispositivos (${devices.length}):`);
      devices.forEach((d, i) => {
        console.log(`  ${i + 1}. ${d.name || 'Sin nombre'} (${d.type || 'unknown'} ${d.model || ''})`);
      });
      
      console.log('\n💡 Para convertir a XML:');
      console.log(`   bun pka-tool.ts decode "${filepath}"`);
      
    } else {
      console.log('❌ Algoritmo PT 5.x falló');
      console.log(`   Error: ${result5x.error}`);
      console.log();
      
      // Análisis de por qué falló
      console.log('🔍 Análisis de versión:');
      
      // Aplicar XOR para ver el resultado
      const n = data.length;
      const xored = Buffer.allocUnsafe(n);
      for (let i = 0; i < n; i++) {
        xored[i] = data[i] ^ ((n - i) & 0xff);
      }
      
      const sizeFromHeader = xored.readUInt32BE(0);
      const magicBytes = xored.slice(4, 6).toString('hex');
      
      console.log(`   Tamaño leído del header: ${sizeFromHeader.toLocaleString()} bytes`);
      console.log(`   Magic bytes (pos 4-5): ${magicBytes}`);
      console.log(`   Zlib magic esperado: 78 9c`);
      console.log();
      
      if (magicBytes !== '789c') {
        console.log('⚠️  CONCLUSIÓN: Archivo usa formato moderno (PT 6.x/7.x/8.x)');
        console.log('   El archivo requiere decodificación Twofish adicional');
        console.log();
        console.log('💡 SOLUCIONES:');
        console.log('   1. Usar herramienta externa: pka2xml (github.com/mircodz/pka2xml)');
        console.log('   2. Definir lab manualmente en YAML:');
        console.log(`      cisco-auto init mi-lab`);
        console.log(`      cisco-auto parse mi-lab.yaml`);
        console.log();
        console.log('📚 Documentación:');
        console.log('   docs/REVERSE_ENGINEERING.md');
      }
    }
    
  } catch (error) {
    console.error('❌ Error al leer archivo:', error instanceof Error ? error.message : error);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
}

// Ejecutar si es llamado directamente
if (import.meta.main) {
  const filepath = process.argv[2];
  
  if (!filepath) {
    console.log('Uso: bun analyze-pka.ts <archivo.pka>');
    console.log('\nEjemplo:');
    console.log('  bun analyze-pka.ts "lab.pka"');
    process.exit(1);
  }
  
  analyzeFile(filepath);
}
