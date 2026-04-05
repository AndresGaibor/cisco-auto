#!/usr/bin/env bun
/**
 * Metadata para comandos de link
 */

import type { CommandMeta } from '../../contracts/command-meta.js';

export const LINK_ADD_META: CommandMeta = {
  id: 'link.add',
  summary: 'Crear un enlace entre dos dispositivos',
  longDescription: 'Crea una conexión física entre dos dispositivos en la topología de Packet Tracer. Soporta diferentes tipos de cables y detección automática.',
  examples: [
    {
      command: 'bun run pt link add R1 Gi0/0 S1 Fa0/1',
      description: 'Conecta un router a un switch con detección automática'
    },
    {
      command: 'bun run pt link add PC1 Fa0 S1 Fa0/10 --type copper_straight',
      description: 'Conecta una PC a un switch con cable recto'
    },
    {
      command: 'bun run pt link add R1 Gi0/1 R2 Gi0/1 --type copper_crossover',
      description: 'Conecta dos routers directamente con cable crossover'
    }
  ],
  related: [
    'bun run pt link list',
    'bun run pt device get R1',
    'bun run pt device get S1'
  ],
  nextSteps: [
    'bun run pt link list',
    'bun run pt device get <device>'
  ],
  tags: ['link', 'connection', 'network'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true
};

export const LINK_LIST_META: CommandMeta = {
  id: 'link.list',
  summary: 'Listar todas las conexiones en la topología',
  examples: [
    {
      command: 'bun run pt link list',
      description: 'Mostrar todas las conexiones'
    }
  ],
  related: [
    'bun run pt link add',
    'bun run pt device list'
  ],
  supportsJson: true,
  supportsPlan: false,
  supportsExplain: true
};

export const LINK_REMOVE_META: CommandMeta = {
  id: 'link.remove',
  summary: 'Eliminar una conexión entre dispositivos',
  examples: [
    {
      command: 'bun run pt link remove R1 Gi0/0 S1 Fa0/1',
      description: 'Eliminar conexión específica'
    }
  ],
  related: [
    'bun run pt link list',
    'bun run pt link add'
  ],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true
};
