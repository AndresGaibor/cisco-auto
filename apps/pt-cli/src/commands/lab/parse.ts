import { Command } from 'commander';
import { loadLab, YAMLParser } from '@cisco-auto/core';
import { validateLabSafe } from '@cisco-auto/core';
import { visualizeTopology, generateMermaidDiagram, analyzeTopology } from '@cisco-auto/core';
import type { LabSpec } from '@cisco-auto/core';
import { formatExamples, formatRelatedCommands } from '../../help/formatter';
import { getExamples } from '../../help/examples';
import { getRelatedCommands } from '../../help/related';
import { toLabSpec } from '../../types/lab-spec.types';

export function createLabParseCommand(): Command {
  const cmd = new Command('parse')
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
        
        if (options.topology) {
          const labSpec = toLabSpec(parsedLab);
          console.log(visualizeTopology(labSpec, { showIPs: true, showPorts: true }));
        }
        
        if (options.mermaid) {
          const labSpec = toLabSpec(parsedLab);
          console.log('\n📊 Diagrama Mermaid:');
          console.log(generateMermaidDiagram(labSpec));
        }
        
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

  const examples = getExamples('lab parse');
  const related = getRelatedCommands('lab parse');

  cmd.addHelpText('after', formatExamples(examples) + formatRelatedCommands(related));

  return cmd;
}
