#!/usr/bin/env bun
/**
 * Lab Analyzer Script
 * 
 * Analiza archivos PKA y YAML para extraer información sobre topología,
 * dispositivos, configuraciones actuales y requisitos del taller.
 * 
 * Uso: bun run lab-analyzer.ts <archivo.pka|archivo.yaml> [--format json|text]
 */

import { readFileSync, existsSync } from 'fs';
import { parseArgs } from 'util';
import { Parser } from '../../../src/core/parser/pka/index';

// Types
interface DeviceInfo {
  name: string;
  type: 'router' | 'switch' | 'pc' | 'server' | 'unknown';
  interfaces: InterfaceInfo[];
  config?: string[];
}

interface InterfaceInfo {
  name: string;
  type: string;
  ip?: string;
  mask?: string;
  vlan?: number;
  connectedTo?: string;
}

interface LabAnalysis {
  filename: string;
  fileType: 'pka' | 'yaml' | 'unknown';
  devices: DeviceInfo[];
  connections: ConnectionInfo[];
  vlans: VLANInfo[];
  recommendations: string[];
}

interface ConnectionInfo {
  from: string;
  to: string;
  fromInterface: string;
  toInterface: string;
  type: string;
}

interface VLANInfo {
  id: number;
  name: string;
  ports: string[];
}

// Parse command line arguments
const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    format: {
      type: 'string',
      short: 'f',
      default: 'text',
    },
    help: {
      type: 'boolean',
      short: 'h',
      default: false,
    },
  },
  allowPositionals: true,
});

if (values.help || positionals.length === 0) {
  console.log(`
Lab Analyzer - Analizador de laboratorios Cisco

Uso: bun run lab-analyzer.ts <archivo> [opciones]

Opciones:
  -f, --format <json|text>   Formato de salida (default: text)
  -h, --help                 Muestra esta ayuda

Ejemplos:
  bun run lab-analyzer.ts taller-vlans.pka
  bun run lab-analyzer.ts lab-config.yaml --format json
`);
  process.exit(0);
}

const filename = positionals[0];
const format = values.format as 'json' | 'text';

// Check if file exists
if (!existsSync(filename)) {
  console.error(`Error: El archivo '${filename}' no existe.`);
  process.exit(1);
}

// Detect file type
function detectFileType(filename: string): 'pka' | 'yaml' | 'unknown' {
  if (filename.endsWith('.pka')) return 'pka';
  if (filename.endsWith('.yaml') || filename.endsWith('.yml')) return 'yaml';
  return 'unknown';
}

// Parse PKA file
async function parsePKA(filename: string): Promise<LabAnalysis> {
  try {
    // Use the existing parser
    const parser = new Parser();
    const result = await parser.parseFile(filename);
    
    // Convert to our analysis format
    const devices: DeviceInfo[] = [];
    const connections: ConnectionInfo[] = [];
    const vlans: VLANInfo[] = [];
    const recommendations: string[] = [];

    // Extract devices
    if (result.devices) {
      for (const device of result.devices) {
        const deviceInfo: DeviceInfo = {
          name: device.name || 'Unknown',
          type: detectDeviceType(device.type),
          interfaces: [],
        };

        // Extract interfaces
        if (device.interfaces) {
          for (const iface of device.interfaces) {
            deviceInfo.interfaces.push({
              name: iface.name,
              type: iface.type || 'unknown',
              ip: iface.ip,
              mask: iface.subnet,
              vlan: iface.vlan,
            });
          }
        }

        devices.push(deviceInfo);
      }
    }

    // Generate recommendations
    recommendations.push(...generateRecommendations(devices, connections, vlans));

    return {
      filename,
      fileType: 'pka',
      devices,
      connections,
      vlans,
      recommendations,
    };
  } catch (error) {
    console.error(`Error parseando PKA: ${error}`);
    return {
      filename,
      fileType: 'pka',
      devices: [],
      connections: [],
      vlans: [],
      recommendations: ['Error al analizar el archivo PKA'],
    };
  }
}

// Parse YAML file
function parseYAML(filename: string): LabAnalysis {
  try {
    const content = readFileSync(filename, 'utf-8');
    
    // Basic YAML parsing (we'll use a simple approach)
    // In production, use a proper YAML parser
    const lines = content.split('\n');
    
    const devices: DeviceInfo[] = [];
    const connections: ConnectionInfo[] = [];
    const vlans: VLANInfo[] = [];
    
    let currentDevice: DeviceInfo | null = null;
    let inDevicesSection = false;
    let inConnectionsSection = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect sections
      if (trimmed === 'devices:') {
        inDevicesSection = true;
        inConnectionsSection = false;
        continue;
      }
      if (trimmed === 'connections:') {
        inDevicesSection = false;
        inConnectionsSection = true;
        continue;
      }
      
      // Parse device
      if (inDevicesSection && trimmed.startsWith('- name:')) {
        if (currentDevice) {
          devices.push(currentDevice);
        }
        currentDevice = {
          name: trimmed.replace('- name:', '').trim(),
          type: 'unknown',
          interfaces: [],
        };
      }
      
      // Parse device type
      if (currentDevice && trimmed.startsWith('type:')) {
        currentDevice.type = detectDeviceType(trimmed.replace('type:', '').trim());
      }
    }
    
    // Add last device
    if (currentDevice) {
      devices.push(currentDevice);
    }
    
    return {
      filename,
      fileType: 'yaml',
      devices,
      connections,
      vlans,
      recommendations: generateRecommendations(devices, connections, vlans),
    };
  } catch (error) {
    console.error(`Error parseando YAML: ${error}`);
    return {
      filename,
      fileType: 'yaml',
      devices: [],
      connections: [],
      vlans: [],
      recommendations: ['Error al analizar el archivo YAML'],
    };
  }
}

// Helper functions
function detectDeviceType(type: string): 'router' | 'switch' | 'pc' | 'server' | 'unknown' {
  const lower = type.toLowerCase();
  if (lower.includes('router')) return 'router';
  if (lower.includes('switch')) return 'switch';
  if (lower.includes('pc')) return 'pc';
  if (lower.includes('server')) return 'server';
  return 'unknown';
}

function generateRecommendations(
  devices: DeviceInfo[],
  connections: ConnectionInfo[],
  vlans: VLANInfo[]
): string[] {
  const recommendations: string[] = [];
  
  // Analyze device types
  const routers = devices.filter(d => d.type === 'router');
  const switches = devices.filter(d => d.type === 'switch');
  const pcs = devices.filter(d => d.type === 'pc');
  
  if (routers.length === 0) {
    recommendations.push('⚠️ No se encontraron routers. Si se requiere inter-VLAN routing, se necesita al menos un router o switch L3.');
  }
  
  if (switches.length === 0) {
    recommendations.push('⚠️ No se encontraron switches. Considera agregar switches para la topología.');
  }
  
  if (pcs.length === 0) {
    recommendations.push('ℹ️ No se encontraron PCs. Verifica que los endpoints estén configurados.');
  }
  
  // VLAN analysis
  if (vlans.length > 0) {
    recommendations.push(`✅ Se detectaron ${vlans.length} VLAN(s) configuradas.`);
    
    // Check for native VLAN mismatch
    const nativeVlans = vlans.filter(v => v.id === 1);
    if (nativeVlans.length > 0) {
      recommendations.push('⚠️ Se está usando VLAN 1 (Native VLAN). Considera cambiar la Native VLAN por seguridad.');
    }
  }
  
  // Connection analysis
  if (connections.length === 0) {
    recommendations.push('⚠️ No se encontraron conexiones entre dispositivos. Verifica los cables en Packet Tracer.');
  }
  
  // General recommendations
  recommendations.push('💡 Usa "show ip interface brief" para verificar el estado de las interfaces.');
  recommendations.push('💡 Usa "show vlan brief" para verificar la configuración de VLANs.');
  
  return recommendations;
}

// Output formatters
function formatText(analysis: LabAnalysis): string {
  let output = `
╔══════════════════════════════════════════════════════════════╗
║                    ANÁLISIS DE LABORATORIO                   ║
╚══════════════════════════════════════════════════════════════╝

📁 Archivo: ${analysis.filename}
📄 Tipo: ${analysis.fileType.toUpperCase()}

📊 RESUMEN DE DISPOSITIVOS
═══════════════════════════════════════════════════════════════
`;

  // Device summary
  const deviceTypes: Record<string, number> = {};
  for (const device of analysis.devices) {
    deviceTypes[device.type] = (deviceTypes[device.type] || 0) + 1;
  }
  
  for (const [type, count] of Object.entries(deviceTypes)) {
    output += `  • ${type.charAt(0).toUpperCase() + type.slice(1)}: ${count}\n`;
  }
  
  output += `
📋 LISTA DE DISPOSITIVOS
═══════════════════════════════════════════════════════════════
`;
  
  for (const device of analysis.devices) {
    output += `\n🔹 ${device.name} (${device.type.toUpperCase()})\n`;
    
    if (device.interfaces.length > 0) {
      output += `   Interfaces:\n`;
      for (const iface of device.interfaces) {
        output += `   • ${iface.name}`;
        if (iface.ip) {
          output += ` - IP: ${iface.ip}`;
          if (iface.mask) output += `/${iface.mask}`;
        }
        if (iface.vlan) {
          output += ` - VLAN: ${iface.vlan}`;
        }
        output += `\n`;
      }
    }
  }
  
  output += `

💡 RECOMENDACIONES
═══════════════════════════════════════════════════════════════
`;
  
  for (const rec of analysis.recommendations) {
    output += `  ${rec}\n`;
  }
  
  output += `
═══════════════════════════════════════════════════════════════
`;
  
  return output;
}

function formatJSON(analysis: LabAnalysis): string {
  return JSON.stringify(analysis, null, 2);
}

// Main execution
async function main() {
  const fileType = detectFileType(filename);
  
  if (fileType === 'unknown') {
    console.error('Error: Tipo de archivo no soportado. Use .pka o .yaml/.yml');
    process.exit(1);
  }
  
  console.log(`🔍 Analizando archivo: ${filename}...\n`);
  
  let analysis: LabAnalysis;
  
  if (fileType === 'pka') {
    analysis = await parsePKA(filename);
  } else {
    analysis = parseYAML(filename);
  }
  
  // Output results
  if (format === 'json') {
    console.log(formatJSON(analysis));
  } else {
    console.log(formatText(analysis));
  }
}

main().catch(error => {
  console.error(`Error: ${error}`);
  process.exit(1);
});
