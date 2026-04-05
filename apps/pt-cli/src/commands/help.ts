#!/usr/bin/env bun
/**
 * Comando help - Ayuda enriquecida para la CLI PT
 * Proporciona ayuda contextual con ejemplos y comandos relacionados.
 */

import { Command } from 'commander';
import { getExamples, getExamplesForCommand, formatExamples, formatRelatedCommands } from '../help/index.ts';
import { getRelatedForCommand } from '../help/related.ts';

interface CommandInfo {
  id: string;
  summary: string;
  longDescription?: string;
  examples?: string[];
  related?: string[];
}

const COMMANDS: Record<string, CommandInfo> = {
  'device': {
    id: 'device',
    summary: 'Gestión de dispositivos en Packet Tracer',
    longDescription: `Permite agregar, listar, mover y eliminar dispositivos del laboratorio.
Cada dispositivo se identifica por un nombre único y tipo (router, switch, etc).`,
    examples: ['pt device list', 'pt device add R1 2911', 'pt device remove R1'],
    related: ['show', 'link', 'config-host'],
  },
  'device list': {
    id: 'device list',
    summary: 'Lista todos los dispositivos en el laboratorio',
    longDescription: `Muestra una lista de todos los dispositivos actualmente cargados 
en Packet Tracer con su tipo, modelo y posición.`,
    examples: ['pt device list', 'pt device list --json', 'pt device list --filter switch'],
    related: ['device add', 'device get'],
  },
  'device add': {
    id: 'device add',
    summary: 'Agrega un nuevo dispositivo al laboratorio',
    longDescription: `Agrega un dispositivo de un tipo específico al laboratorio.
El tipo puede ser: 2911 (router), 2960 (switch), PC, etc.`,
    examples: ['pt device add R1 2911', 'pt device add SW1 2960 --xpos 200 --ypos 100'],
    related: ['device list', 'device remove'],
  },
  'device remove': {
    id: 'device remove',
    summary: 'Elimina un dispositivo del laboratorio',
    longDescription: `Elimina un dispositivo por su nombre. Los enlaces conectados 
al dispositivo también se eliminan.`,
    examples: ['pt device remove R1', 'pt device remove SW1'],
    related: ['device add', 'device list'],
  },
  'device move': {
    id: 'device move',
    summary: 'Mueve un dispositivo a una nueva posición',
    longDescription: `Cambia la posición de un dispositivo en el área de trabajo 
de Packet Tracer usando coordenadas X/Y.`,
    examples: ['pt device move R1 --xpos 300 --ypos 200', 'pt device move SW1 -x 400 -y 150'],
    related: ['device list', 'device add'],
  },
  'device get': {
    id: 'device get',
    summary: 'Muestra información detallada de un dispositivo',
    longDescription: `Muestra información completa del dispositivo incluyendo 
interfaces, configuración IP, VLANs, etc.`,
    examples: ['pt device get R1', 'pt device get R1 --json'],
    related: ['device list', 'show'],
  },
  // NOTA: No existe 'device info' — usar 'device get' en su lugar
  'config-host': {
    id: 'config-host',
    summary: 'Configura la dirección IP de un dispositivo',
    longDescription: `Configura la dirección IP, máscara de subred y gateway en la 
interfaz primaria de un dispositivo.`,
    examples: ['pt config-host R1 --ip 192.168.1.1 --mask 255.255.255.0', 'pt config-host R1 -i 10.0.0.1 -m 255.0.0.0 -g 10.0.0.254'],
    related: ['config-ios', 'show'],
  },
  'config-ios': {
    id: 'config-ios',
    summary: 'Ejecuta comandos de configuración IOS [Estado: partial]',
    longDescription: `Envía comandos de configuración IOS a un dispositivo.
Soporta configuración de interfaces, VLANs, routing, ACLs, etc.
⚠️ Estado: PARTIAL — No confiar ciegamente en 'ok' sin verificación posterior.`,
    examples: ['pt config-ios R1 interface GigabitEthernet0/0 ip address 192.168.1.1 255.255.255.0', 'pt config-ios R1 vlan 10 name ADMIN'],
    related: ['config-host', 'show'],
  },
  'show': {
    id: 'show',
    summary: 'Ejecuta comandos show en dispositivos',
    longDescription: `Ejecuta comandos show en dispositivos para obtener información
sobre la configuración y estado.`,
    examples: ['pt show ip-int-brief R1', 'pt show vlan Switch1', 'pt show ip-route R1'],
    related: ['config-ios', 'device get'],
  },
  'show ip-int-brief': {
    id: 'show ip-int-brief',
    summary: 'Muestra resumen de interfaces IP',
    longDescription: `Muestra una tabla con todas las interfaces y sus direcciones IP.`,
    examples: ['pt show ip-int-brief R1'],
    related: ['show vlan', 'show run-config'],
  },
  'show vlan': {
    id: 'show vlan',
    summary: 'Muestra configuración de VLANs',
    longDescription: `Muestra las VLANs configuradas en un switch.`,
    examples: ['pt show vlan Switch1'],
    related: ['show ip-int-brief', 'vlan'],
  },
  'show ip-route': {
    id: 'show ip-route',
    summary: 'Muestra tabla de rutas IP',
    longDescription: `Muestra la tabla de routing IP del dispositivo.`,
    examples: ['pt show ip-route R1'],
    related: ['show ip-int-brief', 'routing'],
  },
  'show run-config': {
    id: 'show run-config',
    summary: 'Muestra configuración en ejecución',
    longDescription: `Muestra la configuración actual del dispositivo.`,
    examples: ['pt show run-config R1', 'pt show run-config R1 --all'],
    related: ['show', 'config-ios'],
  },
  'vlan': {
    id: 'vlan',
    summary: 'Gestión de VLANs en switches',
    longDescription: `Crea, elimina y configura VLANs en switches Cisco.`,
    examples: ['pt vlan apply Switch1 10 20 30', 'pt vlan create 10 ADMIN'],
    related: ['show vlan', 'config-ios'],
  },
  'link': {
    id: 'link',
    summary: 'Gestión de enlaces entre dispositivos',
    longDescription: `Agrega, lista y elimina conexiones físicas entre dispositivos.`,
    examples: ['pt link add R1 Gi0/0 S1 Fa0/1', 'pt link list', 'pt link remove R1 Gi0/0'],
    related: ['device', 'topology'],
  },
  'link add': {
    id: 'link add',
    summary: 'Agrega un enlace entre dos dispositivos',
    longDescription: `Conecta dos dispositivos usando las interfaces especificadas.
Automáticamente configura el tipo de enlace (access/trunk).`,
    examples: ['pt link add R1 Gi0/0 S1 Fa0/1', 'pt link add R1 Gi0/1 S1 Gi0/1 --type trunk'],
    related: ['link list', 'link remove'],
  },
  'link list': {
    id: 'link list',
    summary: 'Lista todos los enlaces',
    longDescription: `Muestra todos los enlaces configurados entre dispositivos.`,
    examples: ['pt link list', 'pt link list --json'],
    related: ['link add', 'topology'],
  },
  'link remove': {
    id: 'link remove',
    summary: 'Elimina un enlace',
    longDescription: `Elimina un enlace específico por dispositivo e interfaz.`,
    examples: ['pt link remove R1 Gi0/0', 'pt link remove R1 Gi0/0 S1 Fa0/1'],
    related: ['link add', 'link list'],
  },
  'topology': {
    id: 'topology',
    summary: 'Análisis y visualización de topología [Estado: partial]',
    longDescription: `Herramientas para analizar y visualizar la topología de red.
Estado: PARTIAL — análisis básico disponible.`,
    examples: ['pt topology analyze', 'pt topology visualize', 'pt topology export'],
    related: ['link', 'device list'],
  },
  'topology analyze': {
    id: 'topology analyze',
    summary: 'Analiza la topología de red',
    longDescription: `Analiza la topología y genera métricas como redundancia,
segmentos de red, y dependencias.`,
    examples: ['pt topology analyze', 'pt topology analyze --vlans --routes'],
    related: ['topology visualize', 'link list'],
  },
  'topology visualize': {
    id: 'topology visualize',
    summary: 'Genera visualización ASCII de la topología',
    longDescription: `Crea una representación visual de la topología en formato ASCII.`,
    examples: ['pt topology visualize', 'pt topology visualize --output topology.txt'],
    related: ['topology analyze', 'topology export'],
  },
  'topology export': {
    id: 'topology export',
    summary: 'Exporta la topología a diferentes formatos',
    longDescription: `Exporta la topología a formatos como JSON, GraphML, o Markdown.`,
    examples: ['pt topology export --format json', 'pt topology export --format graphml'],
    related: ['topology visualize'],
  },
  'stp': {
    id: 'stp',
    summary: 'Configuración de Spanning Tree Protocol',
    longDescription: `Configura STP en switches para evitar bucles de capa 2.`,
    examples: ['pt stp set Switch1 mode rapid-pvst', 'pt stp set Switch1 priority 4096'],
    related: ['vlan', 'etherchannel'],
  },
  'etherchannel': {
    id: 'etherchannel',
    summary: 'Configuración de EtherChannel',
    longDescription: `Agrupa múltiples interfaces físicas en canales lógicos.`,
    examples: ['pt etherchannel create Switch1 1 Gi0/1 Gi0/2', 'pt etherchannel list'],
    related: ['stp', 'vlan'],
  },
  'routing': {
    id: 'routing',
    summary: 'Configuración de protocolos de routing',
    longDescription: `Configura protocolos de routing como OSPF, EIGRP, static.`,
    examples: ['pt routing ospf enable R1', 'pt routing static add 0.0.0.0 0.0.0.0 192.168.1.1'],
    related: ['show ip-route', 'config-ios'],
  },
  'acl': {
    id: 'acl',
    summary: 'Configuración de Access Control Lists',
    longDescription: `Crea y aplica ACLs para filtrar tráfico.`,
    examples: ['pt acl create 100 permit tcp any any eq 80', 'pt acl apply ACL-100 R1'],
    related: ['config-ios', 'show'],
  },
  'logs': {
    id: 'logs',
    summary: 'Visor de logs y trazas de debugging',
    longDescription: `Inspecciona los logs de ejecución, errores y traces de comandos.`,
    examples: ['pt logs tail', 'pt logs session <id>', 'pt logs errors', 'pt logs bundle <id>'],
    related: ['history', 'doctor', 'results'],
  },
  'logs tail': {
    id: 'logs tail',
    summary: 'Muestra los últimos eventos en tiempo real',
    longDescription: `Muestra los últimos N eventos del log de eventos. Soporta 
seguimiento en tiempo real con --follow.`,
    examples: ['pt logs tail', 'pt logs tail 50', 'pt logs tail --follow', 'pt logs tail --errors-only'],
    related: ['logs', 'logs errors'],
  },
  'logs session': {
    id: 'logs session',
    summary: 'Muestra timeline de una sesión',
    longDescription: `Muestra todos los eventos de una sesión específica.`,
    examples: ['pt logs session ses_abc123'],
    related: ['logs command', 'logs tail'],
  },
  'logs command': {
    id: 'logs command',
    summary: 'Muestra trace completo de un comando',
    longDescription: `Fusiona los eventos del bridge, trace de PT y resultado.`,
    examples: ['pt logs command cmd_abc123'],
    related: ['logs session', 'results'],
  },
  'logs errors': {
    id: 'logs errors',
    summary: 'Muestra errores recientes',
    longDescription: `Busca y muestra sesiones fallidas recientemente.`,
    examples: ['pt logs errors', 'pt logs errors --limit 10'],
    related: ['logs tail', 'history'],
  },
  'logs bundle': {
    id: 'logs bundle',
    summary: 'Genera bundle de depuración',
    longDescription: `Genera un archivo bundle con toda la información de debugging.`,
    examples: ['pt logs bundle ses_abc123'],
    related: ['logs', 'doctor'],
  },
  'history': {
    id: 'history',
    summary: 'Historial de ejecuciones de comandos',
    longDescription: `Lista y muestra detalles de ejecuciones anteriores.`,
    examples: ['pt history list', 'pt history show <id>', 'pt history last'],
    related: ['logs', 'doctor', 'results'],
  },
  'history list': {
    id: 'history list',
    summary: 'Lista las últimas ejecuciones',
    longDescription: `Muestra el historial de ejecuciones con estado, duración y resumen.`,
    examples: ['pt history list', 'pt history list --limit 20', 'pt history list --failed'],
    related: ['history show', 'history last'],
  },
  'history show': {
    id: 'history show',
    summary: 'Muestra detalle de una ejecución',
    longDescription: `Muestra información detallada de una sesión específica.`,
    examples: ['pt history show ses_abc123', 'pt history show ses_abc123 --json'],
    related: ['history list', 'history explain'],
  },
  'history last': {
    id: 'history last',
    summary: 'Muestra la última ejecución',
    longDescription: `Muestra los detalles de la ejecución más reciente.`,
    examples: ['pt history last', 'pt history last --json'],
    related: ['history list', 'history show'],
  },
  'history rerun': {
    id: 'history rerun',
    summary: 're-ejecuta una sesión anterior [Estado: experimental]',
    longDescription: `⚠️ ESTADO: EXPERIMENTAL\n\nRe-ejecuta una sesión que fue marcada como rerunnable.
La re-ejecución completa todavía requiere implementación adicional.
NO usar en modo autónomo sin supervisión.`,
    examples: ['pt history rerun ses_abc123'],
    related: ['history show', 'history explain'],
  },
  'history explain': {
    id: 'history explain',
    summary: 'Explica un error de ejecución',
    longDescription: `Analiza y explica por qué una sesión falló.`,
    examples: ['pt history explain ses_abc123'],
    related: ['history show', 'logs errors'],
  },
  'doctor': {
    id: 'doctor',
    summary: 'Diagnóstico del sistema PT [Estado: partial]',
    longDescription: `Ejecuta verificaciones del sistema para diagnosticar problemas.
Verifica directorios, archivos de runtime, heartbeat, y estado de PT.
Estado: PARTIAL — útil para troubleshooting.`,
    examples: ['pt doctor', 'pt doctor --verbose'],
    related: ['logs', 'history', 'completion'],
  },
  'completion': {
    id: 'completion',
    summary: 'Scripts de completion para shell [Estado: experimental]',
    longDescription: `Genera scripts de autocompletado para bash, zsh, y fish.
⚠️ Estado: EXPERIMENTAL — Scripts desactualizados, no reflejan todos los comandos actuales.
No usar como fuente de verdad de comandos disponibles.`,
    examples: ['pt completion bash', 'pt completion zsh', 'pt completion fish'],
    related: ['doctor', 'help'],
  },
  'results': {
    id: 'results',
    summary: 'Visor de resultados de comandos',
    longDescription: `Muestra los resultados almacenados de comandos ejecutados.`,
    examples: ['pt results list', 'pt results show <id>', 'pt results last'],
    related: ['logs', 'history'],
  },
  // NOTA: 'lab' NO está registrado como comando raíz en index.ts
  // Las entradas lab/lab-create/lab-parse/lab-validate fueron removidas
  // No están disponibles en la CLI actual
  'services': {
    id: 'services',
    summary: 'Servicios de red en Packet Tracer',
    longDescription: `Configura servicios como DHCP, DNS, HTTP, etc.`,
    examples: ['pt services dhcp Switch1', 'pt services dns add 8.8.8.8'],
    related: ['config-ios', 'device'],
  },
  'build': {
    id: 'build',
    summary: 'Build y deploy de archivos a pt-dev',
    longDescription: `Compila y despliega los archivos JavaScript a ~/pt-dev/ para 
ser cargados en Packet Tracer.`,
    examples: ['pt build'],
    related: ['doctor', 'logs'],
  },
};

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