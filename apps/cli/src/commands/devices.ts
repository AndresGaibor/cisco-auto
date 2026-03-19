import { Command } from 'commander';
import { loadLab } from '../../../../src/core/parser/yaml-parser.ts';

export function createDevicesCommand(): Command {
  return new Command('devices')
    .description('Listar dispositivos del lab')
    .argument('<file>', 'Archivo YAML del lab')
    .option('-t, --type <type>', 'Filtrar por tipo')
    .action(async (file, options) => {
      try {
        const parsedLab = loadLab(file);
        let devices = parsedLab.lab.topology.devices;
        
        if (options.type) {
          devices = devices.filter(d => d.type === options.type);
        }
        
        console.log(`\n📱 Dispositivos (${devices.length}):`);
        console.log('━'.repeat(60));
        
        devices.forEach((device, i) => {
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
          
          if (device.vlans) {
            console.log(`   VLANs: ${device.vlans.length}`);
          }
        });
        
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}