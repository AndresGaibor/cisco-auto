import { Command } from 'commander';
import { loadLab, YAMLParser } from '../../core/parser/yaml-parser.ts';
import { validateLabSafe } from '../../core/types/index.ts';

export function createParseCommand(): Command {
  return new Command('parse')
    .description('Parsear archivo de definición de lab (YAML)')
    .argument('<file>', 'Archivo YAML a parsear')
    .option('-f, --format <format>', 'Formato de salida (json|summary)', 'summary')
    .action(async (file, options) => {
      try {
        console.log('🔍 Parseando archivo:', file);
        
        const parsedLab = loadLab(file);
        const summary = YAMLParser.getSummary(parsedLab);
        
        if (options.format === 'json') {
          console.log(JSON.stringify(parsedLab.lab, null, 2));
        } else {
          console.log('\n📋 Resumen del Laboratorio:');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`Nombre: ${summary.name}`);
          console.log(`Dispositivos: ${summary.deviceCount}`);
          console.log(`Conexiones: ${summary.connectionCount}`);
          console.log('\nTipos de dispositivos:');
          Object.entries(summary.deviceTypes).forEach(([type, count]) => {
            console.log(`  • ${type}: ${count}`);
          });
          
          console.log('\n📄 Validación:');
          const validation = validateLabSafe(parsedLab.lab);
          if (validation.success) {
            console.log('  ✅ Lab válido');
          } else {
            console.log('  ❌ Errores de validación:');
            validation.errors?.forEach(err => console.log(`    - ${err}`));
          }
        }
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}