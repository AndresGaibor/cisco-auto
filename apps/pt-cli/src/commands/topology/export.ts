import { Command } from 'commander';
import * as fs from 'fs';
import { loadLabYaml, toLabSpec, generateMermaidDiagram } from '../../contracts/lab-spec';
import { formatExamples, formatRelatedCommands } from '../../help/formatter';
import { getExamples } from '../../help/examples';
import { getRelatedCommands } from '../../help/related';
import { createDefaultPTController } from '@cisco-auto/pt-control';

export function createTopologyExportCommand(): Command {
  const cmd = new Command('export')
    .description('Exportar topología a diferentes formatos')
    .argument('[file]', 'Archivo YAML del lab (opcional: usa topología del canvas si no se especifica)')
    .option('-f, --format <format>', 'Formato de salida (mermaid|json)', 'mermaid')
    .option('-o, --output <file>', 'Archivo de salida')
    .action(async (file, options) => {
      try {
        let output: string;

        if (file) {
          const parsedLab = loadLabYaml(file);
          const labSpec = toLabSpec(parsedLab);
          output = generateMermaidDiagram(labSpec);
        } else {
          // Usar topología del canvas PT
          const controller = createDefaultPTController();
          try {
            await controller.start();
            const snapshot = await controller.snapshot();
            const devices = Object.values(snapshot.devices);
            const links = Object.values(snapshot.links);

            const lines: string[] = ['graph TD'];

            for (const device of devices) {
              const name = device.name || device.id || 'unknown';
              const shape = device.type === 'switch' ? `[{{${name}}}]` :
                            device.type === 'pc' ? `[(${name})]` :
                            `[${name}]`;
              lines.push(`  ${name}${shape}`);
            }

            for (const link of links) {
              const from = typeof link.source === 'object' ? link.source : { deviceId: link.sourceDeviceId || '', port: link.sourcePort || '' };
              const to = typeof link.target === 'object' ? link.target : { deviceId: link.targetDeviceId || '', port: link.targetPort || '' };
              lines.push(`  ${from.deviceId} -->|${from.port} - ${to.port}| ${to.deviceId}`);
            }

            output = lines.join('\n');
          } finally {
            await controller.stop();
          }
        }

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
