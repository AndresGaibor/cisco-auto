import { Command } from 'commander';
import { loadLab, YAMLParser } from '../../../../src/core/parser/yaml-parser.ts';
import { validateLabSafe } from '../../../../src/core/types/index.ts';
import { visualizeTopology, generateMermaidDiagram, analyzeTopology } from '../../../../src/core/topology/index.ts';
import type { LabSpec } from '../../../../src/core/canonical/index.ts';

/**
 * Convierte Lab del parser a LabSpec
 */
function toLabSpec(parsed: any): LabSpec {
  return {
    metadata: {
      name: parsed.lab?.metadata?.name || 'Lab',
      version: parsed.lab?.metadata?.version || '1.0',
      author: parsed.lab?.metadata?.author || 'unknown',
      created: new Date().toISOString()
    },
    devices: (parsed.lab?.topology?.devices || []).map((d: any) => ({
      name: d.name,
      type: d.type,
      hostname: d.hostname || d.name,
      managementIp: d.management?.ip,
      interfaces: (d.interfaces || []).map((i: any) => ({
        name: i.name,
        description: i.description,
        ipAddress: i.ip,
        shutdown: i.shutdown,
        switchport: i.mode ? {
          mode: i.mode,
          accessVlan: i.vlan
        } : undefined
      })),
      security: d.security,
      vlans: d.vlans,
      routing: d.routing,
      services: d.services
    })),
    connections: (parsed.lab?.topology?.connections || []).map((c: any) => ({
      from: { deviceName: c.from.device || c.from, portName: c.from.port || c.fromInterface || 'unknown' },
      to: { deviceName: c.to.device || c.to, portName: c.to.port || c.toInterface || 'unknown' },
      cableType: c.cable || c.type || 'ethernet'
    }))
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
    .action(async (file, options) => {
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