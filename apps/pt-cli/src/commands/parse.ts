import { Command } from 'commander';
import { loadLab, YAMLParser } from '@cisco-auto/core';
import { validateLabSafe } from '@cisco-auto/core';
import { visualizeTopology, generateMermaidDiagram, analyzeTopology } from '@cisco-auto/core';
import { generateId, CableType } from '@cisco-auto/core';
import type { LabSpec, DeviceSpec, ConnectionSpec, DeviceType } from '@cisco-auto/core';

interface ParsedDeviceInput {
  name: string;
  type: string;
  hostname?: string;
  management?: { ip?: string };
  interfaces?: Array<{
    name?: string;
    description?: string;
    ip?: string;
    shutdown?: boolean;
    mode?: string;
    vlan?: number;
  }>;
  security?: unknown;
  vlans?: unknown;
  routing?: unknown;
  services?: unknown;
}

interface ParsedConnectionInput {
  from: { device?: string; port?: string } | string;
  to: { device?: string; port?: string } | string;
  fromInterface?: string;
  toInterface?: string;
  cable?: string;
  type?: string;
}

interface ParsedLabInput {
  lab?: {
    metadata?: { name?: string; version?: string; author?: string };
    topology?: {
      devices?: ParsedDeviceInput[];
      connections?: ParsedConnectionInput[];
    };
  };
}

interface ParseCommandOptions {
  format: string;
  topology: boolean;
  mermaid: boolean;
  stats: boolean;
}

function toLabSpec(parsed: ParsedLabInput): LabSpec {
  const devices: DeviceSpec[] = (parsed.lab?.topology?.devices || []).map((d) => ({
    id: generateId(),
    name: d.name,
    type: d.type as DeviceType,
    hostname: d.hostname || d.name,
    managementIp: d.management?.ip,
    interfaces: (d.interfaces || []).map((i) => ({
      id: generateId(),
      name: i.name || '',
      description: i.description,
      ipAddress: i.ip,
      shutdown: i.shutdown,
      switchport: i.mode ? {
        mode: i.mode,
        accessVlan: i.vlan
      } : undefined
    })),
    security: d.security as DeviceSpec['security'],
    vlans: d.vlans as DeviceSpec['vlans'],
    routing: d.routing as DeviceSpec['routing'],
    services: d.services as DeviceSpec['services']
  }));

  const connections = (parsed.lab?.topology?.connections || []).map((c) => {
    const fromDeviceName = typeof c.from === 'string' ? c.from : c.from.device || '';
    const toDeviceName = typeof c.to === 'string' ? c.to : c.to.device || '';
    const cableTypeStr = c.cable || c.type || 'ethernet';
    const cableTypeMap: Record<string, string> = {
      'ethernet': 'eStraightThrough',
      'straight': 'eStraightThrough',
      'cross': 'eCrossOver',
      'crossover': 'eCrossOver',
      'serial': 'eSerialDTE',
      'console': 'eConsole',
    };
    return {
      id: generateId(),
      from: { 
        deviceId: generateId(), 
        deviceName: fromDeviceName, 
        port: c.fromInterface || (typeof c.from === 'object' ? c.from.port || '' : '')
      },
      to: { 
        deviceId: generateId(), 
        deviceName: toDeviceName, 
        port: c.toInterface || (typeof c.to === 'object' ? c.to.port || '' : '')
      },
      cableType: (cableTypeMap[cableTypeStr] || 'eStraightThrough') as ConnectionSpec['cableType']
    };
  });

  return {
    metadata: {
      name: parsed.lab?.metadata?.name || 'Lab',
      version: parsed.lab?.metadata?.version || '1.0',
      author: parsed.lab?.metadata?.author || 'unknown',
      createdAt: new Date()
    },
    devices,
    connections
  };
}

export function createParseCommand(): Command {
  return new Command('parse')
    .description('Parsear archivo de definición de lab (YAML)')
    .argument('<file>', 'Archivo YAML a parsear')
    .option('-f, --format <format>', 'Formato de salida (json|summary)', 'summary')
    .option('-t, --topology', 'Mostrar visualización de topología', false)
    .option('-m, --mermaid', 'Generar diagrama Mermaid', false)
    .option('-s, --stats', 'Mostrar estadísticas de topología', false)
    .action(async (file: string, options: ParseCommandOptions) => {
      try {
        console.log('🔍 Parseando archivo:', file);
        
        const parsedLab = loadLab(file);
        const summary = YAMLParser.getSummary(parsedLab);
        
        if (options.format === 'json') {
          console.log(JSON.stringify(parsedLab.lab, null, 2));
          return;
        }
        
        console.log('\n📋 Resumen del Laboratorio:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Nombre: ${summary.name}`);
        console.log(`Dispositivos: ${summary.deviceCount}`);
        console.log(`Conexiones: ${summary.connectionCount}`);
        console.log('\nTipos de dispositivos:');
        Object.entries(summary.deviceTypes).forEach(([type, count]) => {
          console.log(`  • ${type}: ${count}`);
        });
        
        console.log('\n📄 Validación:');
        const validation = validateLabSafe(parsedLab.lab);
        if (validation.success) {
          console.log('  ✅ Lab válido');
        } else {
          console.log('  ❌ Errores de validación:');
          validation.errors?.forEach(err => console.log(`    - ${err}`));
        }
        
        // Topology visualization
        if (options.topology) {
          const labSpec = toLabSpec(parsedLab);
          console.log(visualizeTopology(labSpec, { showIPs: true, showPorts: true }));
        }
        
        // Mermaid diagram
        if (options.mermaid) {
          const labSpec = toLabSpec(parsedLab);
          console.log('\n📊 Diagrama Mermaid:');
          console.log(generateMermaidDiagram(labSpec));
        }
        
        // Stats
        if (options.stats) {
          const labSpec = toLabSpec(parsedLab);
          const stats = analyzeTopology(labSpec);
          console.log('\n📈 Estadísticas de Topología:');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`  Dispositivos: ${stats.deviceCount}`);
          console.log(`  Conexiones: ${stats.connectionCount}`);
          console.log(`  Densidad: ${(stats.density * 100).toFixed(1)}%`);
          console.log(`  Componentes conectados: ${stats.connectedComponents}`);
          console.log(`  Promedio de conexiones por dispositivo: ${stats.avgConnections}`);
          console.log('\n  Distribución por tipo:');
          Object.entries(stats.deviceTypeDistribution).forEach(([type, count]) => {
            console.log(`    • ${type}: ${count}`);
          });
        }
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}