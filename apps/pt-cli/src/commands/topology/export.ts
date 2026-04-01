import { Command } from 'commander';
import * as fs from 'fs';
import { loadLab } from '@cisco-auto/core';
import { generateMermaidDiagram } from '@cisco-auto/core';
import type { LabSpec } from '@cisco-auto/core';
import { formatExamples, formatRelatedCommands } from '../../help/formatter';
import { getExamples } from '../../help/examples';
import { getRelatedCommands } from '../../help/related';
import { toLabSpec } from '../../types/lab-spec.types';

export function createTopologyExportCommand(): Command {
  const cmd = new Command('export')
    .description('Exportar topología a diferentes formatos')
    .argument('<file>', 'Archivo YAML del lab')
    .option('-f, --format <format>', 'Formato de salida (mermaid|json)', 'mermaid')
    .option('-o, --output <file>', 'Archivo de salida')
    .action(async (file, options) => {
      try {
        const parsedLab = loadLab(file);
        const labSpec = toLabSpec(parsedLab);
        const output = generateMermaidDiagram(labSpec);

        if (options.output) {
          fs.writeFileSync(options.output, output);
          console.log(`✅ Topología exportada a: ${options.output}`);
        } else {
          console.log(output);
        }
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  const examples = getExamples('topology export');
  const related = getRelatedCommands('topology');

  cmd.addHelpText('after', formatExamples(examples) + formatRelatedCommands(related));

  return cmd;
}
