import { Command } from 'commander';
import { readdirSync } from 'fs';
import { loadLab } from '@cisco-auto/core';
import { formatExamples, formatRelatedCommands } from '../../help/formatter';
import { getExamples } from '../../help/examples';
import { getRelatedCommands } from '../../help/related';

export function createLabListCommand(): Command {
  const cmd = new Command('list')
    .description('Listar laboratorios en el directorio actual')
    .option('-d, --directory <dir>', 'Directorio a buscar', '.')
    .action(async (options) => {
      try {
        const files = readdirSync(options.directory)
          .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
        
        console.log(`\n📁 Laboratorios encontrados (${files.length}):`);
        console.log('━'.repeat(60));
        
        for (const file of files) {
          try {
            const lab = loadLab(`${options.directory}/${file}`);
            console.log(`\n📋 ${file}`);
            console.log(`   Nombre: ${lab.lab.metadata?.name || 'N/A'}`);
            console.log(`   Dispositivos: ${lab.lab.topology?.devices?.length || 0}`);
          } catch {
            console.log(`\n⚠️  ${file} (no válido)`);
          }
        }
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  const examples = getExamples('lab list');
  const related = getRelatedCommands('lab');

  cmd.addHelpText('after', formatExamples(examples) + formatRelatedCommands(related));

  return cmd;
}
