#!/usr/bin/env bun
import { Command } from 'commander';

export function createLayoutCommand(): Command {
  return new Command('layout')
    .description('Comandos canónicos para disposición espacial del laboratorio');
}
