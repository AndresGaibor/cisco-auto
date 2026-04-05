import { Command } from 'commander';
import { loadLab } from '@cisco-auto/core';
import { visualizeTopology, generateMermaidDiagram } from '@cisco-auto/core';
import type { LabSpec } from '@cisco-auto/core';
import { formatExamples, formatRelatedCommands } from '../../help/formatter';
import { getExamples } from '../../help/examples';
import { getRelatedCommands } from '../../help/related';
import { toLabSpec, type ParsedLabYaml } from '../../types/lab-spec.types';

export function createTopologyVisualizeCommand(): Command {
  const cmd = new Command('visualize')
    .description('Visualizar topología de red (del canvas o archivo YAML)')
    .argument('[file]', 'Archivo YAML del lab (opcional - usa topología del canvas si no se especifica)')
    .option('-m, --mermaid', 'Generar diagrama Mermaid', false)
    .action(async (file, options) => {
      if (!file) {
        console.log('Visualización del canvas aún no implementada.');
        console.log('Usa: pt topology visualize <archivo.yaml>');
        console.log('O genera un archivo YAML con "pt topology export" primero.');
        return;
      }

      try {
        const parsedLab = loadLab(file);
        const labSpec = toLabSpec(parsedLab);

        if (options.mermaid) {
          console.log('\n📊 Diagrama Mermaid:');
          console.log(generateMermaidDiagram(labSpec));
        } else {
          console.log(visualizeTopology(labSpec, { showIPs: true, showPorts: true }));
        }
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  const examples = getExamples('topology visualize');
  const related = getRelatedCommands('topology visualize');

  cmd.addHelpText('after', formatExamples(examples) + formatRelatedCommands(related));

  return cmd;
}
