#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController } from '@cisco-auto/pt-control/controller';

export function createEvaluateCommand(): Command {
  return new Command('eval')
    .description('Evaluación directa de JS en el motor nativo de PT (Bypass de Sandbox)')
    .argument('<code>', 'Código JS a evaluar (ej: "AssessmentModel.getTimeElapsed()")')
    .action(async (code: string) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        console.log(chalk.bold('\n🧪 Executing Native Evaluation...\n'));
        
        const result = await controller.send('__evaluate', { code });

        console.log(chalk.cyan('Code:   ') + chalk.white(code));
        console.log(chalk.cyan('─'.repeat(60)));
        console.log(chalk.green(JSON.stringify(result, null, 2)));
        console.log(chalk.cyan('─'.repeat(60)));
        console.log();
      } catch (error: any) {
        console.error(chalk.red(`\n❌ Error de evaluación: ${error.message}`));
      } finally {
        await controller.stop();
      }
    });
}
