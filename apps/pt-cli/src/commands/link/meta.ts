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
      command: 'bun run pt link add R1 Gi0/0 S1 Fa0/1 --no-verify',
      description: 'Conecta un router a un switch sin verificación posterior'
    },
    {
      command: 'bun run pt link add PC1 Fa0 S1 Fa0/10 --type copper_straight --verify',
      description: 'Conecta una PC a un switch con cable recto y verifica'
    },
    {
      command: 'bun run pt link add R1 Gi0/1 R2 Gi0/1 --type copper_crossover --replace',
      description: 'Conecta dos routers directamente y reemplaza un enlace ocupado'
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
      command: 'bun run pt link remove R1 Gi0/0 S1 Fa0/1 --no-verify',
      description: 'Eliminar conexión específica sin verificación posterior'
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
