import { Command } from 'commander';
import { loadLab } from '@cisco-auto/core';
import { analyzeTopology } from '@cisco-auto/core';
import type { LabSpec } from '@cisco-auto/core';
import { formatExamples, formatRelatedCommands } from '../../help/formatter';
import { getExamples } from '../../help/examples';
import { getRelatedCommands } from '../../help/related';

function toLabSpec(parsed: any): LabSpec {
  return {
    metadata: {
      name: parsed.lab?.metadata?.name || 'Lab',
      version: parsed.lab?.metadata?.version || '1.0',
      author: parsed.lab?.metadata?.author || 'unknown',
      createdAt: new Date()
    },
    devices: (parsed.lab?.topology?.devices || []).map((d: any) => ({
      id: d.name,
      name: d.name,
      type: d.type,
      hostname: d.hostname || d.name,
      managementIp: d.management?.ip,
      interfaces: (d.interfaces || []).map((i: any) => ({
        id: i.name,
        name: i.name,
        description: i.description,
        ipAddress: i.ip,
        shutdown: i.shutdown,
        switchport: i.mode ? { mode: i.mode, accessVlan: i.vlan } : undefined
      })),
      security: d.security,
      vlans: d.vlans,
      routing: d.routing,
      services: d.services
    })),
    connections: (parsed.lab?.topology?.connections || []).map((c: any) => ({
      id: `${c.from}-${c.to}`,
      from: { deviceName: c.from?.device || c.from, portName: c.from?.port || c.fromInterface || 'unknown' },
      to: { deviceName: c.to?.device || c.to, portName: c.to?.port || c.toInterface || 'unknown' },
      cableType: c.cable || c.type || 'ethernet'
    }))
  };
}

export function createTopologyAnalyzeCommand(): Command {
  const cmd = new Command('analyze')
    .description('Analizar topología de red')
    .argument('<file>', 'Archivo YAML del lab')
    .action(async (file) => {
      try {
        const parsedLab = loadLab(file);
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
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  const examples = getExamples('topology analyze');
  const related = getRelatedCommands('topology analyze');

  cmd.addHelpText('after', formatExamples(examples) + formatRelatedCommands(related));

  return cmd;
}
