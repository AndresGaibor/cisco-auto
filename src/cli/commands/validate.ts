import { Command } from 'commander';
import { loadLab } from '../../core/parser/yaml-parser.ts';
import { validateLabSafe } from '../../core/types/index.ts';

export function createValidateCommand(): Command {
  return new Command('validate')
    .description('Validar archivo de definición de lab')
    .argument('<file>', 'Archivo YAML a validar')
    .action(async (file) => {
      try {
        console.log('🔍 Validando archivo:', file);
        
        const parsedLab = loadLab(file);
        const validation = validateLabSafe(parsedLab.lab);
        
        if (validation.success) {
          console.log('\n✅ Archivo válido');
          console.log(`   Nombre: ${parsedLab.lab.metadata.name}`);
          console.log(`   Dispositivos: ${parsedLab.lab.topology.devices.length}`);
          console.log(`   Conexiones: ${parsedLab.lab.topology.connections?.length || 0}`);
        } else {
          console.log('\n❌ Errores de validación:');
          validation.errors?.forEach(err => {
            console.log(`   • ${err}`);
          });
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}