/**
 * PKA/PKT Decoder - Packet Tracer 5.x
 * 
 * Implementación pura en TypeScript/Bun sin librerías externas
 * Basado en el algoritmo de ptexplorer (axcheron)
 * 
 * Algoritmo PT 5.x:
 * 1. XOR posicional inverso: byte[i] XOR ((file_size - i) & 0xFF)
 * 2. Quitar 4 bytes header qCompress (big-endian: tamaño descomprimido)
 * 3. zlib inflate → XML
 */

import { inflateSync, deflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";

export interface DecodeResult {
  success: boolean;
  xml?: string;
  version?: string;
  error?: string;
}

export interface EncodeResult {
  success: boolean;
  data?: Buffer;
  error?: string;
}

/**
 * Decodifica un archivo PKA/PKT de Packet Tracer 5.x
 * 
 * @param data Buffer del archivo cifrado
 * @returns XML descomprimido
 */
export function decodePKA5x(data: Buffer): DecodeResult {
  try {
    const n = data.length;
    
    // Etapa 1: XOR posicional inverso
    // Cada byte se XOR con ((file_size - index) & 0xFF)
    const plain = Buffer.allocUnsafe(n);
    for (let i = 0; i < n; i++) {
      plain[i] = data[i] ^ ((n - i) & 0xff);
    }
    
    // Etapa 2: quitar 4 bytes del header qCompress
    // El header contiene el tamaño descomprimido en big-endian
    if (plain.length < 4) {
      return { success: false, error: 'Archivo demasiado pequeño' };
    }
    
    const compressed = plain.subarray(4);
    
    // Etapa 3: zlib inflate → XML
    const xml = inflateSync(compressed).toString("utf-8");
    
    // Extraer versión
    const versionMatch = xml.match(/<VERSION>([^<]+)<\/VERSION>/i);
    const version = versionMatch ? versionMatch[1] : undefined;
    
    return { success: true, xml, version };
  } catch (error) {
    return { 
      success: false, 
      error: `Error al decodificar: ${error instanceof Error ? error.message : 'Unknown'}` 
    };
  }
}

/**
 * Codifica XML a formato PKA/PKT (PT 5.x)
 * 
 * @param xml Contenido XML
 * @returns Buffer cifrado
 */
export function encodePKA5x(xml: string): EncodeResult {
  try {
    const xmlBuf = Buffer.from(xml, "utf-8");
    
    // Etapa 1: zlib deflate
    const compressed = deflateSync(xmlBuf);
    
    // Etapa 2: agregar header qCompress (4 bytes, big-endian)
    const header = Buffer.allocUnsafe(4);
    header.writeUInt32BE(xmlBuf.length, 0);
    const plain = Buffer.concat([header, compressed]);
    
    // Etapa 3: XOR posicional (mismo algoritmo que decode)
    const n = plain.length;
    const out = Buffer.allocUnsafe(n);
    for (let i = 0; i < n; i++) {
      out[i] = plain[i] ^ ((n - i) & 0xff);
    }
    
    return { success: true, data: out };
  } catch (error) {
    return { 
      success: false, 
      error: `Error al codificar: ${error instanceof Error ? error.message : 'Unknown'}` 
    };
  }
}

/**
 * Elimina la contraseña de un archivo PKA
 * Útil para desbloquear labs protegidos
 * 
 * @param xml Contenido XML
 * @returns XML sin contraseña
 */
export function stripPassword(xml: string): string {
  // Elimina la línea con el hash MD5 de la contraseña
  // Patrones comunes de contraseña en PKA
  return xml
    .replace(/<activity\s+pass="[^"]*"\s*\/?>/g, "<activity>")
    .replace(/password="[^"]*"/g, '')
    .replace(/pass="[^"]*"/g, '');
}

/**
 * Extrae información de dispositivos del XML
 */
export function extractDevices(xml: string): any[] {
  const devices: any[] = [];
  
  // Parsear dispositivos con regex
  const deviceRegex = /<DEVICE>.*?<\/DEVICE>/gs;
  const matches = xml.match(deviceRegex);
  
  if (matches) {
    for (const deviceXml of matches) {
      const device: any = {};
      
      // Extraer tipo y modelo
      const typeMatch = deviceXml.match(/<TYPE model="([^"]*)"[^>]*>([^<]*)<\/TYPE>/i);
      if (typeMatch) {
        device.model = typeMatch[1];
        device.type = typeMatch[2];
      }
      
      // Extraer nombre
      const nameMatch = deviceXml.match(/<NAME[^>]*>([^<]*)<\/NAME>/i);
      if (nameMatch) {
        device.name = nameMatch[1];
      }
      
      // Extraer descripción
      const descMatch = deviceXml.match(/<DESCRIPTION>([^<]*)<\/DESCRIPTION>/i);
      if (descMatch) {
        device.description = descMatch[1];
      }
      
      devices.push(device);
    }
  }
  
  return devices;
}

/**
 * Extrae la configuración de red del XML
 */
export function extractNetworkConfig(xml: string): any {
  const config: any = {
    devices: [],
    connections: [],
    vlans: []
  };
  
  // Extraer dispositivos
  config.devices = extractDevices(xml);
  
  // Extraer conexiones
  const connRegex = /<CONNECTION>.*?<\/CONNECTION>/gs;
  const connMatches = xml.match(connRegex);
  if (connMatches) {
    for (const connXml of connMatches) {
      const conn: any = {};
      
      const fromMatch = connXml.match(/<FROM>([^<]*)<\/FROM>/i);
      const toMatch = connXml.match(/<TO>([^<]*)<\/TO>/i);
      
      if (fromMatch) conn.from = fromMatch[1];
      if (toMatch) conn.to = toMatch[1];
      
      config.connections.push(conn);
    }
  }
  
  return config;
}

// ─── CLI ───────────────────────────────────────────────────

if (import.meta.main) {
  const [, , cmd, input, output] = process.argv;
  
  if (cmd === "decode") {
    if (!input) {
      console.error("❌ Error: se requiere archivo de entrada");
      console.log("Uso: bun pka-tool.ts decode archivo.pkt [salida.xml]");
      process.exit(1);
    }
    
    const data = readFileSync(input);
    const result = decodePKA5x(data);
    
    if (result.success && result.xml) {
      const outputFile = output ?? input.replace(/\.pk[at]$/, ".xml");
      writeFileSync(outputFile, result.xml);
      console.log(`✅ XML guardado en: ${outputFile}`);
      console.log(`📊 Versión: ${result.version || 'Desconocida'}`);
      console.log(`📄 Tamaño: ${result.xml.length} bytes`);
      
      // Mostrar dispositivos
      const devices = extractDevices(result.xml);
      if (devices.length > 0) {
        console.log(`\n🔧 Dispositivos (${devices.length}):`);
        devices.forEach((d, i) => {
          console.log(`  ${i + 1}. ${d.name} (${d.type} ${d.model || ''})`);
        });
      }
    } else {
      console.error("❌ Error:", result.error);
      console.log("\n💡 Nota: Este algoritmo solo funciona con archivos PT 5.x");
      console.log("   Para archivos modernos (8.x), use la definición YAML");
      process.exit(1);
    }
  } 
  
  else if (cmd === "encode") {
    if (!input) {
      console.error("❌ Error: se requiere archivo de entrada");
      console.log("Uso: bun pka-tool.ts encode archivo.xml [salida.pkt]");
      process.exit(1);
    }
    
    const xml = readFileSync(input, "utf-8");
    const result = encodePKA5x(xml);
    
    if (result.success && result.data) {
      const outputFile = output ?? input.replace(/\.xml$/, ".pkt");
      writeFileSync(outputFile, result.data);
      console.log(`✅ PKA codificado en: ${outputFile}`);
      console.log(`📦 Tamaño: ${result.data.length} bytes`);
    } else {
      console.error("❌ Error:", result.error);
      process.exit(1);
    }
  } 
  
  else if (cmd === "unlock") {
    // decode → strip password → encode
    if (!input) {
      console.error("❌ Error: se requiere archivo de entrada");
      console.log("Uso: bun pka-tool.ts unlock actividad.pka [salida.pka]");
      process.exit(1);
    }
    
    const data = readFileSync(input);
    const decodeResult = decodePKA5x(data);
    
    if (!decodeResult.success || !decodeResult.xml) {
      console.error("❌ Error al decodificar:", decodeResult.error);
      process.exit(1);
    }
    
    const cleaned = stripPassword(decodeResult.xml);
    const encodeResult = encodePKA5x(cleaned);
    
    if (!encodeResult.success || !encodeResult.data) {
      console.error("❌ Error al codificar:", encodeResult.error);
      process.exit(1);
    }
    
    const outputFile = output ?? input;
    writeFileSync(outputFile, encodeResult.data);
    console.log(`✅ Contraseña eliminada → ${outputFile}`);
  } 
  
  else {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║              PKA Tool - Packet Tracer 5.x Decoder            ║
╚══════════════════════════════════════════════════════════════╝

Comandos:

  decode <input.pka> [output.xml]
    Decodifica archivo PKA/PKT a XML

  encode <input.xml> [output.pka]
    Codifica XML a formato PKA/PKT

  unlock <input.pka> [output.pka]
    Elimina contraseña del archivo PKA

Ejemplos:

  bun pka-tool.ts decode lab.pkt lab.xml
  bun pka-tool.ts unlock actividad.pka actividad-unlocked.pka

Notas:
  - Solo compatible con Packet Tracer 5.x
  - Archivos modernos (8.x) usan encriptación avanzada
  - Para archivos 8.x use: cisco-auto parse lab.yaml
`);
  }
}