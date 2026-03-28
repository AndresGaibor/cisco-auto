/**
 * Script de prueba para el parser PKA
 */

import { parsePKAFile, PKAParser } from './pka-parser.js';

const testFile = '/Users/andresgaibor/code/javascript/cisco-auto/archivos_prueba/2.5.5 Packet Tracer - Configure Initial Switch Settings (2).pka';

console.log('='.repeat(60));
console.log('PRUEBA DE PARSER PKA');
console.log('='.repeat(60));

try {
  const result = parsePKAFile(testFile);
  
  console.log('\n✅ Archivo parseado exitosamente');
  console.log(`   Versión: ${result.version}`);
  console.log(`   Tamaño: ${result.fileSize} bytes`);
  console.log(`   Tamaño descomprimido: ${result.uncompressedSize} bytes`);
  
  if (result.xmlContent) {
    console.log('\n📄 Contenido XML (primeros 1000 caracteres):');
    console.log(result.xmlContent.substring(0, 1000));
    
    // Extraer dispositivos
    console.log('\n🔧 Dispositivos encontrados:');
    const devices = PKAParser.extractDevices(result.xmlContent);
    devices.forEach((device, i) => {
      console.log(`   ${i + 1}. ${device.name} (${device.type} ${device.model})`);
    });
  }
  
} catch (error) {
  console.error('\n❌ Error al parsear:');
  console.error(error);
  
  // Intentar detectar versión
  console.log('\n🔍 Intentando detectar versión del archivo...');
  const fs = require('fs');
  const fileBuffer = fs.readFileSync(testFile);
  const detectedVersion = PKAParser.detectVersion(fileBuffer);
  console.log(`   Versión detectada: ${detectedVersion}`);
}

console.log('\n' + '='.repeat(60));