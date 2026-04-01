import { Command } from 'commander';
import { loadLab } from '@cisco-auto/core';
import { formatExamples, formatRelatedCommands } from '../../help/formatter';
import { getExamples } from '../../help/examples';
import { getRelatedCommands } from '../../help/related';
import type { ParsedDevice, ParsedInterface } from '../../types/lab-spec.types';

export function createDeviceGetCommand(): Command {
  const cmd = new Command('get')
    .description('Obtener detalles de un dispositivo específico')
    .argument('<file>', 'Archivo YAML del lab')
    .argument('<device>', 'Nombre del dispositivo')
    .action(async (file, deviceName) => {
      try {
        const parsedLab = loadLab(file);
        const device = parsedLab.lab?.topology?.devices.find((d: ParsedDevice) => d.name === deviceName);

        if (!device) {
          console.error(`❌ Dispositivo '${deviceName}' no encontrado`);
          process.exit(1);
        }

        console.log(`\n📱 ${device.name}:`);
        console.log('━'.repeat(60));
        console.log(`Tipo: ${device.type}`);
        console.log(`Hostname: ${device.hostname || 'N/A'}`);
        console.log(`Modelo: ${device.model || 'N/A'}`);

        if (device.management) {
          console.log(`\nManagement:`);
          console.log(`  IP: ${device.management.ip}`);
          console.log(`  Máscara: ${device.management.subnetMask}`);
        }

        if (device.interfaces?.length) {
          console.log(`\nInterfaces (${device.interfaces.length}):`);
          device.interfaces.forEach((intf: ParsedInterface) => {
            console.log(`  • ${intf.name}: ${intf.ip || 'sin IP'} ${!(intf as { enabled?: boolean }).enabled ? '(shutdown)' : ''}`);
          });
        }
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  const examples = getExamples('device info');
  const related = getRelatedCommands('device info');

  cmd.addHelpText('after', formatExamples(examples) + formatRelatedCommands(related));

  return cmd;
}
