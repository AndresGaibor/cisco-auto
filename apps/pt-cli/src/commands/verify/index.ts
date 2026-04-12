#!/usr/bin/env bun
import { Command } from 'commander';

export function createVerifyCommand(): Command {
  return new Command('verify')
    .description('Comandos canónicos para verificación del estado y evidencia');
}
