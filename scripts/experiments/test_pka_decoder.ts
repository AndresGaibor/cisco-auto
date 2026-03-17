#!/usr/bin/env bun
/**
 * Script de prueba para el decoder PKA completo
 */

import { readFileSync } from 'fs';
import { decodePKA, PKADecoder } from '../src/core/parser/pka-decoder.ts';

const testFile = '/Users/andresgaibor/code/javascript/cisco-auto/archivos_prueba/2.5.5 Packet Tracer - Configure Initial Switch Settings (2).pka';

console.log('='.repeat(70));
console.log('PRUEBA DE DECODER PKA COMPLETO (4 ETAPAS)');
console.log('='.repeat(70));
console.log(`Archivo: ${testFile}`);
console.log('');

try {
  // Leer archivo
  const fileBuffer = readFileSync(testFile);
  console.log(`📁 Tamaño del archivo: ${fileBuffer.length} bytes`);
  console.log(`📄 Primeros 16 bytes: ${fileBuffer.slice(0, 16).toString('hex')}`);
  console.log('');
  
  // Intentar decodificar
  const result = decodePKA(fileBuffer);
  
  if (result.success && result.xml) {
    console.log('✅ ¡DECODIFICACIÓN EXITOSA!');
    console.log(`📊 Etapas completadas: ${result.stagesCompleted.join(' → ')}`);
    console.log(`🔖 Versión detectada: ${result.version || 'Desconocida'}`);
    console.log(`📄 Tamaño del XML: ${result.xml.length} bytes`);
    console.log('');
    
    // Extraer dispositivos
    console.log('🔧 Dispositivos encontrados:');
    const devices = PKADecoder.extractDevices(result.xml);
    devices.forEach((device, i) => {
      console.log(`   ${i + 1}. ${device.name} (${device.type} ${device.model || ''})`);
    });
    
    console.log('');
    console.log('📄 Primeros 2000 caracteres del XML:');
    console.log('-'.repeat(70));
    console.log(result.xml.substring(0, 2000));
    console.log('-'.repeat(70));
    
    // Guardar XML para análisis
    const outputFile = testFile.replace('.pka', '-decoded.xml');
    const fs = require('fs');
    fs.writeFileSync(outputFile, result.xml, 'utf-8');
    console.log('');
    console.log(`💾 XML guardado en: ${outputFile}`);
    
  } else {
    console.log('❌ Falló la decodificación');
    console.log(`📊 Etapas completadas antes del error: ${result.stagesCompleted.join(' → ')}`);
    console.log(`❗ Error: ${result.error}`);
  }
  
} catch (error) {
  console.error('❌ Error inesperado:', error instanceof Error ? error.message : error);
}

console.log('');
console.log('='.repeat(70));
