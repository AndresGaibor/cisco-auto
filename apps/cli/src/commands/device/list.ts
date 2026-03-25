import { Command } from 'commander';
import { loadLab } from '../../../../../src/core/parser/yaml-parser.ts';
import { formatExamples, formatRelatedCommands } from '../../help/formatter.ts';
import { getExamples } from '../../help/examples.ts';
import { getRelatedCommands } from '../../help/related.ts';

export function createDeviceListCommand(): Command {
  const cmd = new Command('list')
    .description('Listar dispositivos de un laboratorio')
    .argument('<file>', 'Archivo YAML del lab')
    .option('-t, --type <type>', 'Filtrar por tipo (router|switch|pc|server)')
    .action(async (file, options) => {
      try {
        const parsedLab = loadLab(file);
        let devices = parsedLab.lab.topology.devices;
        
        if (options.type) {
          devices = devices.filter((d: any) => d.type === options.type);
        }
        
        console.log(`\n📱 Dispositivos (${devices.length}):`);
        console.log('━'.repeat(60));
        
        devices.forEach((device: any, i: number) => {
          console.log(`\n${i + 1}. ${device.name}`);
          console.log(`   Tipo: ${device.type}`);
          console.log(`   Hostname: ${device.hostname || 'N/A'}`);
          console.log(`   Modelo: ${device.model || 'N/A'}`);
          
          if (device.management) {
            console.log(`   Management: ${device.management.ip}`);
          }
          
          if (device.interfaces) {
            console.log(`   Interfaces: ${device.interfaces.length}`);
          }
        });
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  const examples = getExamples('device list');
  const related = getRelatedCommands('device list');

  cmd.addHelpText('after', formatExamples(examples) + formatRelatedCommands(related));

  return cmd;
}
