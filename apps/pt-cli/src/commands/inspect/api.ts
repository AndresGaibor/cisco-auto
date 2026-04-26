#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController } from '@cisco-auto/pt-control/controller';

/**
 * CLI command to perform deep inspection of any PT object via IPC path.
 */
export function createInspectApiCommand(): Command {
  return new Command('api')
    .description('Inspección profunda de la API interna de PT vía rutas IPC')
    .argument('<path>', 'Ruta al objeto (ej: "network().getDeviceAt(0)")')
    .argument('[method]', 'Método a ejecutar (ej: "getLightStatus")')
    .argument('[args...]', 'Argumentos para el método')
    .option('--json', 'Salida en JSON puro', false)
    .action(async (path: string, method: string | undefined, args: string[], options: { json: boolean }) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        
        // Convert string args to proper types (basic heuristic)
        const typedArgs = args.map(arg => {
          if (arg === 'true') return true;
          if (arg === 'false') return false;
          if (!isNaN(Number(arg))) return Number(arg);
          return arg;
        });

        const result = await controller.deepInspect(path, method, typedArgs);

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(chalk.bold('\n🔍 Deep Inspection Result\n'));
        console.log(chalk.cyan('Path:   ') + chalk.white(path));
        if (method) {
          console.log(chalk.cyan('Method: ') + chalk.white(method));
          console.log(chalk.cyan('Args:   ') + chalk.white(JSON.stringify(typedArgs)));
        }
        console.log(chalk.cyan('─'.repeat(60)));

        if (result && typeof result === 'object' && !Array.isArray(result)) {
           if (result.__pt_object__) {
             console.log(chalk.yellow(`[PT Native Object: ${result.className}]`));
             console.log(chalk.gray(`UUID: ${result.uuid}`));
           } else {
             console.log(JSON.stringify(result, null, 2));
           }
        } else {
          console.log(chalk.green(JSON.stringify(result, null, 2)));
        }

        console.log(chalk.cyan('─'.repeat(60)));
        console.log();
      } catch (error: any) {
        const errorMsg = error.message && typeof error.message === 'object' 
          ? JSON.stringify(error.message, null, 2)
          : error.message;
        console.error(chalk.red(`\n❌ Error de inspección: ${errorMsg || error}`));
      } finally {
        await controller.stop();
      }
    });
}
