import { Command } from 'commander';
import chalk from 'chalk';

export function createLinkListCommand(): Command {
  const cmd = new Command('list')
    .description('Listar todas las conexiones en la topología')
    .option('-d, --device <name>', 'Filtrar por dispositivo')
    .action(async (options) => {
      try {
        console.log(`\n${chalk.bold('Conexiones en la topología:')}\n`);
        console.log(
          chalk.yellow(
            '⚠️  El comando "link list" requiere que PT esté corriendo en el host.\n' +
            'Por ahora, usa los comandos "device list" o "topology visualize" para ver la topología.\n'
          )
        );
        console.log(chalk.gray('Los comandos "link add" y "link remove" pueden ejecutarse directamente.'));
      } catch (error) {
        console.error(
          `${chalk.red('✗')} Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
        process.exit(1);
      }
    });

  return cmd;
}
