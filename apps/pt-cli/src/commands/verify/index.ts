#!/usr/bin/env bun
import { Command } from 'commander';
import { createVerifyIosCommand } from './ios.js';

export function createVerifyCommand(): Command {
  const command = new Command('verify')
    .description('Comandos canónicos para verificación del estado y evidencia');

  command.addCommand(createVerifyIosCommand());
  return command;
}
