#!/usr/bin/env bun
/**
 * Comando help - Ayuda enriquecida para la CLI PT
 * Proporciona ayuda contextual con ejemplos y comandos relacionados.
 */

import { Command } from 'commander';
import { COMMAND_CATALOG, getRegisteredCommandIds } from './command-catalog';

interface CommandInfo {
  id: string;
  summary: string;
  longDescription?: string;
  examples?: string[];
  related?: string[];
}

function formatHelpHeader(title: string): string {
  return `\n${'='.repeat(60)}\n${title.toUpperCase()}\n${'='.repeat(60)}`;
}

function formatExamplesSection(examples: string[]): string {
  if (!examples || examples.length === 0) return '';
  
  let output = '\nExamples:';
  for (const ex of examples) {
    output += `\n  $ ${ex}`;
  }
  return output;
}

function formatRelatedSection(related: string[]): string {
  if (!related || related.length === 0) return '';
  
  let output = '\n\nSee also:';
  for (const cmd of related) {
    output += `\n  ${cmd}`;
  }
  return output;
}

function formatSchemaSection(schema?: string): string {
  if (!schema) return '';
  return `\n\nOutput Schema:\n${schema}`;
}

function formatStatusLine(status: string): string {
  const label = status.toUpperCase();
  if (status === 'stable') return ` [Status: ${label}]`;
  return ` [Status: ${label} ⚠️]`;
}

function getCommandSchema(commandId: string): string | undefined {
  const schemas: Record<string, string> = {
    'device list': 'DeviceListResult',
    'device get': 'DeviceInfoResult',
    'show ip-int-brief': 'IpInterfaceBriefResult',
    'show vlan': 'VlanResult',
    'show ip-route': 'IpRouteResult',
    'history list': 'HistoryListResult',
    'logs tail': 'EventsResult',
  };
  return schemas[commandId];
}

export function createHelpCommand(): Command {
  const cmd = new Command('help')
    .description('Muestra ayuda enriquecida para comandos')
    .argument('[comando...]', 'Comando y subcomandos a consultar (ej: routing static add)')
    .action(async (args: string[]) => {
      const parts = args || [];
      const comando = parts[0] || '';
      // Soportar hasta 2 subcomandos (ej: routing static add)
      const subcomando = parts.slice(1, 3).join(' ') || '';
      const key = comando && subcomando ? `${comando} ${subcomando}` : comando;
      
      // Intentar buscar en el catálogo
      let info = COMMAND_CATALOG[key];

      // Fallback para subcomandos que no están en el catálogo raíz pero sí en el help manual anterior
      // (En el futuro, el catálogo debería ser recursivo o completo)
      
      if (!info && !key) {
        console.log(formatHelpHeader('PT CLI - Ayuda'));
        console.log('\nCLI para controlar Cisco Packet Tracer en tiempo real.\n');
        console.log('Comandos disponibles:');
        
        const rootCommands = getRegisteredCommandIds()
          .map((id) => COMMAND_CATALOG[id])
          .filter((entry): entry is (typeof COMMAND_CATALOG)[string] => Boolean(entry))
          .sort((a, b) => a.id.localeCompare(b.id));
        for (const c of rootCommands) {
          const padding = ' '.repeat(Math.max(2, 15 - c.id.length));
          console.log(`  ${c.id}${padding}${c.summary}${c.status !== 'stable' ? ` [${c.status}]` : ''}`);
        }
        console.log('\n\nUsa "pt help <comando>" para más información.');
        return;
      }
      
      if (!info && key) {
        console.log(`\n⚠️  Comando "${key}" no encontrado en el catálogo de ayuda.\n`);
        console.log('Usa "pt help" para ver todos los comandos disponibles.\n');
        return;
      }

      const cmdInfo = info as CommandInfo;
      console.log(formatHelpHeader(cmdInfo.id));
      
      if (cmdInfo.longDescription) {
        console.log(`\n${cmdInfo.longDescription}\n`);
      } else {
        console.log(`\n${cmdInfo.summary}\n`);
      }
      
      const schema = getCommandSchema(cmdInfo.id);
      if (schema) {
        console.log(formatSchemaSection(schema));
      }
      
      console.log(formatExamplesSection(cmdInfo.examples || []));
      console.log(formatRelatedSection(cmdInfo.related || []));
      console.log(formatStatusLine(cmdInfo.status || 'stable'));
      console.log('');
    });

  return cmd;
}
