import { Command } from 'commander';
import { loadLab } from '../../core/parser/yaml-parser.ts';
import { generateIOS } from '../../core/config-generators/ios-generator.ts';

export function createDeployCommand(): Command {
  return new Command('deploy')
    .description('Desplegar configuraciones a dispositivos (requiere conexión SSH)')
    .argument('<file>', 'Archivo YAML del lab')
    .option('-d, --device <name>', 'Desplegar solo en dispositivo específico')
    .option('--dry-run', 'Simular despliegue sin conectar')
    .option('-p, --parallel', 'Ejecutar en paralelo', false)
    .action(async (file, options) => {
      console.log('🚀 Despliegue de configuraciones');
      console.log('⚠️  Nota: Esta función requiere implementación del módulo SSH');
      
      if (options.dryRun) {
        console.log('\n📋 Modo simulación (dry-run):');
        const parsedLab = loadLab(file);
        const devices = options.device
          ? parsedLab.lab.topology.devices.filter(d => d.name === options.device)
          : parsedLab.lab.topology.devices;
        
        for (const device of devices) {
          console.log(`\n🖥️  ${device.name}:`);
          console.log(`   IP: ${device.management?.ip || 'No configurada'}`);
          console.log(`   Comandos a ejecutar: ${generateIOS(device).commands.length}`);
        }
      }
    });
}