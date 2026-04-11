import { Command } from 'commander';
import { loadLab } from '@cisco-auto/core';
import { analyzeTopology } from '@cisco-auto/core';
import type { LabSpec } from '@cisco-auto/core';
import { formatExamples, formatRelatedCommands } from '../../help/formatter';
import { getExamples } from '../../help/examples';
import { getRelatedCommands } from '../../help/related';
import { toLabSpec, snapshotToLabSpec } from '../../types/lab-spec.types';
import { createDefaultPTController } from '@cisco-auto/pt-control';

export function createTopologyAnalyzeCommand(): Command {
  const cmd = new Command('analyze')
    .description('Analizar topología de red')
    .argument('[file]', 'Archivo YAML del lab (opcional: usa topología del canvas si no se especifica)')
    .action(async (file?: string) => {
      try {
        let labSpec: LabSpec;

        if (file) {
          const parsedLab = loadLab(file);
          labSpec = toLabSpec(parsedLab);
        } else {
          // Usar topología del canvas PT
          const controller = createDefaultPTController();
          try {
            await controller.start();
            const snapshot = await controller.snapshot();
            labSpec = snapshotToLabSpec(snapshot);
          } finally {
            await controller.stop();
          }
        }

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
