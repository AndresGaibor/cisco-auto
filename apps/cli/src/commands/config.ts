import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { loadLab } from '../../../../src/core/parser/yaml-parser.ts';
import { generateIOS, IOSGenerator } from '../../../../src/core/config-generators/ios-generator.ts';

export function createConfigCommand(): Command {
  return new Command('config')
    .description('Generar configuraciones IOS para dispositivos')
    .argument('<file>', 'Archivo YAML del lab')
    .option('-o, --output <dir>', 'Directorio de salida', './output')
    .option('-d, --device <name>', 'Generar solo para dispositivo específico')
    .option('--dry-run', 'Mostrar configuraciones sin guardar')
    .action(async (file, options) => {
      try {
        console.log('⚙️  Generando configuraciones IOS...');
        
        const parsedLab = loadLab(file);
        const devices = options.device 
          ? parsedLab.lab.topology.devices.filter(d => d.name === options.device)
          : parsedLab.lab.topology.devices;
        
        if (devices.length === 0) {
          console.error('❌ No se encontraron dispositivos');
          process.exit(1);
        }
        
        // Crear directorio de salida si no existe y no es dry-run
        if (!options.dryRun && !fs.existsSync(options.output)) {
          fs.mkdirSync(options.output, { recursive: true });
        }
        
        for (const device of devices) {
          const config = generateIOS(device);
          
          console.log(`\n🖥️  Dispositivo: ${config.hostname}`);
          console.log('━'.repeat(50));
          
          if (options.dryRun) {
            console.log(IOSGenerator.formatCommands(config.commands));
          } else {
            const filename = path.join(options.output, `${config.hostname}.txt`);
            fs.writeFileSync(filename, IOSGenerator.formatCommands(config.commands));
            console.log(`💾 Configuración guardada: ${filename}`);
          }
        }
        
        console.log('\n✅ Configuraciones generadas exitosamente');
        
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}