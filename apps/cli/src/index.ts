#!/usr/bin/env bun
/**
 * CLI de cisco-auto
 * Interfaz de línea de comandos para automatización de labs Cisco
 */

import { Command } from 'commander';
import { createParseCommand } from './commands/parse.ts';
import { createConfigCommand } from './commands/config.ts';
import { createValidateCommand } from './commands/validate.ts';
import { createDevicesCommand } from './commands/devices.ts';
import { createDeployCommand } from './commands/deploy.ts';
import { createInitCommand } from './commands/init.ts';
import { createParsePKACommand } from './commands/parse-pka.ts';
import { createModTestCommand } from './commands/mod-test.ts';
import { createTemplateCommand } from './commands/template.ts';
import { createServeCommand } from './commands/serve.ts';

const program = new Command();

program
  .name('cisco-auto')
  .description('Automatización de laboratorios Cisco Packet Tracer')
  .version('0.1.0');

// Comandos
program.addCommand(createParseCommand());
program.addCommand(createConfigCommand());
program.addCommand(createValidateCommand());
program.addCommand(createDevicesCommand());
program.addCommand(createDeployCommand());
program.addCommand(createInitCommand());
program.addCommand(createParsePKACommand());
program.addCommand(createModTestCommand());
program.addCommand(createTemplateCommand());
program.addCommand(createServeCommand());

program.parse();