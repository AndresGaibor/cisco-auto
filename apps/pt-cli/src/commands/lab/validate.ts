import { Command } from 'commander';
import { loadLab } from '@cisco-auto/core';
import { validateLabSafe } from '@cisco-auto/core';
import { formatExamples, formatRelatedCommands } from '../../help/formatter';
import { getExamples } from '../../help/examples';
import { getRelatedCommands } from '../../help/related';

export function createLabValidateCommand(): Command {
  const cmd = new Command('validate')
    .description('Validar archivo YAML de laboratorio')
    .argument('<file>', 'Archivo YAML a validar')
    .option('-s, --strict', 'Modo estricto - falla en warnings', false)
    .action(async (file, options) => {
      try {
        console.log('🔍 Validando archivo:', file);
        
        const parsedLab = loadLab(file);
        const validation = validateLabSafe(parsedLab.lab);
        
        console.log('\n📋 Resultado de Validación:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (validation.success) {
          console.log('✅ Lab válido');
          process.exit(0);
        } else {
          console.log('❌ Errores de validación:');
          validation.errors?.forEach(err => console.log(`  - ${err}`));
          
          if (options.strict) {
            process.exit(1);
          }
        }
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  const examples = getExamples('lab validate');
  const related = getRelatedCommands('lab validate');

  cmd.addHelpText('after', formatExamples(examples) + formatRelatedCommands(related));

  return cmd;
}
