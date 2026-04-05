#!/usr/bin/env bun
/**
 * Comando help - Ayuda enriquecida para la CLI PT
 * Proporciona ayuda contextual con ejemplos y comandos relacionados.
 */

import { Command } from 'commander';
import { COMMAND_CATALOG } from './command-catalog.ts';
import { getCommandSchema } from '../help/index.ts';

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

export function createHelpCommand(): Command {
  const cmd = new Command('help')
    .description('Muestra ayuda enriquecida para comandos')
    .argument('[comando]', 'Comando a consultar (opcional)')
    .argument('[subcomando]', 'Subcomando a consultar (opcional)')
    .action(async (comando?: string, subcomando?: string) => {
      const key = comando && subcomando 
        ? `${comando} ${subcomando}` 
        : comando || '';
      
      // Intentar buscar en el catálogo
      let info = COMMAND_CATALOG[key];

      // Fallback para subcomandos que no están en el catálogo raíz pero sí en el help manual anterior
      // (En el futuro, el catálogo debería ser recursivo o completo)
      
      if (!info && !key) {
        console.log(formatHelpHeader('PT CLI - Ayuda'));
        console.log('\nCLI para controlar Cisco Packet Tracer en tiempo real.\n');
        console.log('Comandos disponibles:');
        
        const rootCommands = Object.values(COMMAND_CATALOG).sort((a, b) => a.id.localeCompare(b.id));
        for (const c of rootCommands) {
          const padding = ' '.repeat(Math.max(2, 15 - c.id.length));
          console.log(`  ${c.id}${padding}${c.summary}${c.status !== 'stable' ? ` [${c.status}]` : ''}`);
        }

        console.log('\n⚠️  Algunas capacidades están en estado PARTIAL o EXPERIMENTAL.');
        console.log('Consulta docs/CLI_AGENT_SKILL.md para políticas de autonomía y troubleshooting.\n');
        console.log('\nUsa "pt help <comando>" para ver más detalles.');
        console.log('Usa "pt help <comando> <subcomando>" para subcomandos.');
        return;
      }

      if (!info) {
        console.log(`\nComando no encontrado: ${key}\n`);
        console.log('Usa "pt help" para ver todos los comandos disponibles.');
        return;
      }
      
      console.log(formatHelpHeader(info.id + formatStatusLine(info.status)));
      console.log(`\n${info.summary}`);
      
      if (info.longDescription) {
        console.log(`\n${info.longDescription}`);
      }
      
      if (info.examples) {
        console.log(formatExamplesSection(info.examples));
      }
      
      if (info.related) {
        console.log(formatRelatedSection(info.related));
      }
      
      const schema = getCommandSchema(key);
      if (schema) {
        console.log(formatSchemaSection(schema));
      }
      
      if (info.notes && info.notes.length > 0) {
        console.log('\nNotes:');
        for (const note of info.notes) {
          console.log(`  - ${note}`);
        }
      }

      console.log('');
    });
  
  return cmd;
}

function formatHelpHeader(title: string): string {
  return `\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}`;
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
    .argument('[comando]', 'Comando a consultar (opcional)')
    .argument('[subcomando]', 'Subcomando a consultar (opcional)')
    .action(async (comando?: string, subcomando?: string) => {
      const key = comando && subcomando 
        ? `${comando} ${subcomando}` 
        : comando || '';
      
      const info = COMMANDS[key];
      
      if (!info) {
        if (key) {
          console.log(`\nComando no encontrado: ${key}\n`);
          console.log('Usa "pt help" para ver todos los comandos disponibles.');
        } else {
          console.log(formatHelpHeader('PT CLI - Ayuda'));
          console.log('\nCLI para controlar Cisco Packet Tracer en tiempo real.\n');
          console.log('Comandos disponibles:');
          console.log('  device         Gestión de dispositivos');
          console.log('  config-host    Configurar IP de dispositivo');
          console.log('  config-ios     Ejecutar comandos IOS');
          console.log('  show           Ejecutar comandos show');
          console.log('  vlan           Gestión de VLANs');
          console.log('  link           Gestión de enlaces');
          console.log('  topology       Análisis de topología');
          console.log('  stp            Spanning Tree Protocol');
          console.log('  etherchannel  EtherChannel');
          console.log('  routing        Protocolos de routing');
          console.log('  acl            Access Control Lists');
          console.log('  logs           Visor de logs y trazas');
          console.log('  history        Historial de ejecuciones');
          console.log('  doctor         Diagnóstico del sistema');
          console.log('  completion     Scripts de completion');
          console.log('  results        Visor de resultados');
          console.log('  services       Servicios de red');
          console.log('  build          Build y deploy');
          console.log('\n⚠️  Algunas capacidades están en estado PARTIAL o EXPERIMENTAL.');
          console.log('Consulta docs/CLI_AGENT_SKILL.md para políticas de autonomía y troubleshooting.\n');
          console.log('\nUsa "pt help <comando>" para ver más detalles.');
          console.log('Usa "pt help <comando> <subcomando>" para subcomandos.');
        }
        return;
      }
      
      console.log(formatHelpHeader(info.id));
      console.log(`\n${info.summary}`);
      
      if (info.longDescription) {
        console.log(`\n${info.longDescription}`);
      }
      
      if (info.examples) {
        console.log(formatExamplesSection(info.examples));
      }
      
      if (info.related) {
        console.log(formatRelatedSection(info.related));
      }
      
      const schema = getCommandSchema(key);
      if (schema) {
        console.log(formatSchemaSection(schema));
      }
      
      console.log('');
    });
  
  return cmd;
}