import { Command } from 'commander';
import { loadLabYaml, toLabSpec, analyzeTopology } from '../../contracts/lab-spec';
import { formatExamples, formatRelatedCommands } from '../../help/formatter';
import { getExamples } from '../../help/examples';
import { getRelatedCommands } from '../../help/related';
import { createDefaultPTController } from '@cisco-auto/pt-control';

export function createTopologyAnalyzeCommand(): Command {
  const cmd = new Command('analyze')
    .description('Analizar topología de red')
    .argument('[file]', 'Archivo YAML del lab (opcional: usa topología del canvas si no se especifica)')
    .action(async (file?: string) => {
      try {
        let stats;

        if (file) {
          const parsedLab = loadLabYaml(file);
          const labSpec = toLabSpec(parsedLab);
          stats = analyzeTopology(labSpec);
        } else {
          // Usar topología del canvas PT
          const controller = createDefaultPTController();
          try {
            await controller.start();
            const snapshot = await controller.snapshot();
            const devices = Object.values(snapshot.devices);
            const links = Object.values(snapshot.links);

            const deviceCount = devices.length;
            const connectionCount = links.length;

            const maxConnections = deviceCount > 1 ? (deviceCount * (deviceCount - 1)) / 2 : 1;
            const density = connectionCount / maxConnections;

            const deviceConnections = new Map<string, number>();
            for (const device of devices) {
              deviceConnections.set(device.name || '', 0);
            }

            for (const link of links) {
              const from = typeof link.source === 'object' ? link.source : { deviceId: link.sourceDeviceId || '' };
              const to = typeof link.target === 'object' ? link.target : { deviceId: link.targetDeviceId || '' };
              deviceConnections.set(from.deviceId, (deviceConnections.get(from.deviceId) || 0) + 1);
              deviceConnections.set(to.deviceId, (deviceConnections.get(to.deviceId) || 0) + 1);
            }

            const avgConnections = deviceCount > 0
              ? Array.from(deviceConnections.values()).reduce((a, b) => a + b, 0) / deviceCount
              : 0;

            const distribution: Record<string, number> = {};
            for (const device of devices) {
              const type = device.type || 'generic';
              distribution[type] = (distribution[type] || 0) + 1;
            }

            const adjacency = new Map<string, Set<string>>();
            for (const device of devices) {
              adjacency.set(device.name || '', new Set());
            }

            for (const link of links) {
              const from = typeof link.source === 'object' ? link.source : { deviceId: link.sourceDeviceId || '' };
              const to = typeof link.target === 'object' ? link.target : { deviceId: link.targetDeviceId || '' };
              adjacency.get(from.deviceId)?.add(to.deviceId);
              adjacency.get(to.deviceId)?.add(from.deviceId);
            }

            const visited = new Set<string>();
            let connectedComponents = 0;
            for (const deviceId of adjacency.keys()) {
              if (!visited.has(deviceId)) {
                connectedComponents++;
                const queue = [deviceId];
                while (queue.length > 0) {
                  const current = queue.shift()!;
                  if (visited.has(current)) continue;
                  visited.add(current);
                  for (const neighbor of adjacency.get(current) || []) {
                    if (!visited.has(neighbor)) {
                      queue.push(neighbor);
                    }
                  }
                }
              }
            }

            stats = {
              deviceCount,
              connectionCount,
              density,
              connectedComponents,
              avgConnections,
              deviceTypeDistribution: distribution,
            };
          } finally {
            await controller.stop();
          }
        }

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
