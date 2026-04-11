#!/usr/bin/env bun
import { Command } from 'commander';

export function createTopologyApplyCommand(): Command {
  return new Command('apply')
    .description('[DEPRECATED] Aplicar una topología declarativa desde un archivo JSON')
    .requiredOption('--config <file>', 'Archivo JSON con la topología a aplicar')
    .option('--dry-run', 'Simular sin aplicar cambios', false)
    .option('--verbose', 'Salida detallada', false)
    .action(async () => {
      console.error('El comando "pt topology apply" está deprecado y fue deshabilitado.');
      console.error('Usa comandos granulares: pt topology clean, pt device add, pt link add, pt vlan, pt config-ios, pt config-host y pt services dhcp.');
      process.exit(1);
    });
}
