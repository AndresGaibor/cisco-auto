import { Command } from 'commander';
import { loadLab } from '@cisco-auto/core';
import { formatOutput, applyJqFilter, getGlobalFlags, type OutputFormat } from '../flags';

export function createDevicesCommand(): Command {
  return new Command('devices')
    .description('Listar dispositivos del lab')
    .argument('<file>', 'Archivo YAML del lab')
    .option('-t, --type <type>', 'Filtrar por tipo')
    .action(async (file, options, command) => {
      try {
        const parsedLab = loadLab(file);
        let devices = parsedLab.lab.topology.devices;
        
        if (options.type) {
          devices = devices.filter(d => d.type === options.type);
        }

        // Obtener flags globales del programa padre (nivel superior)
        const parentOptions = command.parent?.parent?.opts() ?? command.parent?.opts() ?? {};
        const globalFlags = {
          json: parentOptions.json ?? false,
          jq: parentOptions.jq ?? null,
          output: (parentOptions.output as OutputFormat) ?? 'text',
          verbose: parentOptions.verbose ?? false,
          quiet: parentOptions.quiet ?? false,
        };

        // Preparar datos para salida
        let outputData = devices.map(device => ({
          name: device.name,
          type: device.type,
          hostname: device.hostname ?? 'N/A',
          model: device.model ?? 'N/A',
          management: device.management?.ip ?? null,
          interfaces: device.interfaces?.length ?? 0,
          vlans: device.vlans?.length ?? 0,
        }));

        // Aplicar filtro jq si está presente
        if (globalFlags.jq && outputData) {
          outputData = applyJqFilter(outputData, globalFlags.jq) as typeof outputData;
        }

        // Salida JSON directa
        if (globalFlags.json) {
          console.log(JSON.stringify(outputData, null, 2));
          return;
        }

        // Salida formateada según el formato
        const formatted = formatOutput(outputData, globalFlags.output);
        console.log(formatted);
        
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}