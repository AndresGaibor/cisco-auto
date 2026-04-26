#!/usr/bin/env bun
/**
 * Comando parse - Parsear archivo de definición de lab (YAML)
 * 
 * Implementación local sin dependencias de @cisco-auto/core.
 */

import { Command } from 'commander';
import { loadLabYaml, validateLabSafe, toLabSpec, visualizeTopology, generateMermaidDiagram, analyzeTopology } from '../contracts/lab-spec';

interface ParseCommandOptions {
  format: string;
  topology: boolean;
  mermaid: boolean;
  stats: boolean;
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

        const parsedLab = loadLabYaml(file);
        const labSpec = toLabSpec(parsedLab);
        
        const deviceTypes: Record<string, number> = {};
        for (const d of labSpec.devices) {
          deviceTypes[d.type] = (deviceTypes[d.type] || 0) + 1;
        }

        if (options.format === 'json') {
          console.log(JSON.stringify(labSpec, null, 2));
          return;
        }

        console.log('\n📋 Resumen del Laboratorio:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Nombre: ${labSpec.metadata.name}`);
        console.log(`Dispositivos: ${labSpec.devices.length}`);
        console.log(`Conexiones: ${labSpec.connections.length}`);
        console.log('\nTipos de dispositivos:');
        Object.entries(deviceTypes).forEach(([type, count]) => {
          console.log(`  • ${type}: ${count}`);
        });

        console.log('\n📄 Validación:');
        const validation = validateLabSafe(parsedLab);
        if (validation.success) {
          console.log('  ✅ Lab válido');
        } else {
          console.log('  ❌ Errores de validación:');
          validation.errors?.forEach(err => console.log(`    - ${err}`));
        }

        // Visualización de topología
        if (options.topology) {
          const labSpec = toLabSpec(parsedLab);
          console.log(visualizeTopology(labSpec, { showIPs: true, showPorts: true }));
        }

        // Diagrama Mermaid
        if (options.mermaid) {
          const labSpec = toLabSpec(parsedLab);
          console.log('\n📊 Diagrama Mermaid:');
          console.log(generateMermaidDiagram(labSpec));
        }

        // Estadísticas
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
