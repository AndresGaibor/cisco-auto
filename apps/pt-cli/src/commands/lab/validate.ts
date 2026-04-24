import { Command } from 'commander';
import { loadLabYaml, validateLabSafe } from '../../contracts/lab-spec';
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
        
        const parsedLab = loadLabYaml(file);
        const validation = validateLabSafe(parsedLab);
        
        console.log('\n📋 Resultado de Validación:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (validation.success) {
          console.log('✅ Lab válido');
          if (validation.warnings && validation.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            validation.warnings.forEach(warn => console.log(`  - ${warn}`));
          }
          process.exit(0);
        } else {
          console.log('❌ Errores de validación:');
          validation.errors?.forEach(err => console.log(`  - ${err}`));
          
          if (options.strict || validation.errors && validation.errors.length > 0) {
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
