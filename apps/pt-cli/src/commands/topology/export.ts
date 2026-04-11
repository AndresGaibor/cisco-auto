import { Command } from 'commander';
import * as fs from 'fs';
import { loadLab } from '@cisco-auto/core';
import { generateMermaidDiagram } from '@cisco-auto/core';
import type { LabSpec } from '@cisco-auto/core';
import { formatExamples, formatRelatedCommands } from '../../help/formatter';
import { getExamples } from '../../help/examples';
import { getRelatedCommands } from '../../help/related';
import { toLabSpec, snapshotToLabSpec } from '../../types/lab-spec.types';
import { createDefaultPTController } from '@cisco-auto/pt-control';

export function createTopologyExportCommand(): Command {
  const cmd = new Command('export')
    .description('Exportar topología a diferentes formatos')
    .argument('[file]', 'Archivo YAML del lab (opcional: usa topología del canvas si no se especifica)')
    .option('-f, --format <format>', 'Formato de salida (mermaid|json)', 'mermaid')
    .option('-o, --output <file>', 'Archivo de salida')
    .action(async (file, options) => {
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
