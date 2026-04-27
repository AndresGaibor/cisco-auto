#!/usr/bin/env bun
import { Command } from 'commander';
import { createLinkAddCommand } from './add';
import { createLinkListCommand } from './list';
import { createLinkRemoveCommand } from './remove';
import { createLinkSuggestCommand } from './suggest';
import { createLinkVerifyCommand } from './verify';
import { createLinkDoctorCommand } from './doctor';

export function createLinkCommand(): Command {
  const cmd = new Command('link')
    .alias('ln')
    .description('Gestión de cableado físico y enlaces entre dispositivos');

  // Registrar subcomandos desde archivos dedicados
  cmd.addCommand(createLinkAddCommand());
  cmd.addCommand(createLinkListCommand());
  cmd.addCommand(createLinkRemoveCommand().alias('rm'));
  cmd.addCommand(createLinkSuggestCommand());
  cmd.addCommand(createLinkVerifyCommand());
  cmd.addCommand(createLinkDoctorCommand());

  return cmd;
}
