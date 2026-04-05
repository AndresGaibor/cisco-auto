#!/usr/bin/env bun
/**
 * Metadata para comandos de configuración de host
 */

import type { CommandMeta } from '../../contracts/command-meta.js';

export const CONFIG_HOST_META: CommandMeta = {
  id: 'config-host',
  summary: 'Configurar red de un dispositivo (IP, gateway, DNS, DHCP)',
  longDescription: 'Configura los parámetros de red de un dispositivo en Packet Tracer, incluyendo dirección IP, máscara de subred, gateway, servidor DNS o modo DHCP.',
  examples: [
    {
      command: 'pt config-host R1 192.168.1.1 255.255.255.0',
      description: 'Configurar IP estática con máscara'
    },
    {
      command: 'pt config-host R1 192.168.1.1 255.255.255.0 192.168.1.254',
      description: 'Configurar IP con gateway'
    },
    {
      command: 'pt config-host R1 192.168.1.1 255.255.255.0 192.168.1.254 8.8.8.8',
      description: 'Configurar IP con gateway y DNS'
    },
    {
      command: 'pt config-host PC1 --dhcp',
      description: 'Configurar DHCP para obtener IP automáticamente'
    },
    {
      command: 'pt config-host R1 10.0.0.1 255.0.0.0 --dhcp',
      description: 'Cambiar de DHCP a IP estática'
    }
  ],
  related: [
    'device get',
    'show ip interface brief',
    'device list'
  ],
  nextSteps: [
    'pt device get <device>',
    'pt show ip-int-brief <device>'
  ],
  tags: ['network', 'ip', 'dhcp', 'config'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true
};