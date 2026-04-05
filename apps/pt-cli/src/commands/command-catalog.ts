#!/usr/bin/env bun

/**
 * Catálogo de metadata mínima por comando raíz.
 * Fuente de verdad para madurez y capacidades de cada comando.
 * Alimenta help, skill, y políticas de autonomía para agentes.
 *
 * NOTA: Basado en los comandos realmente registrados en apps/pt-cli/src/index.ts
 */

export interface CommandCatalogEntry {
  id: string;
  summary: string;
  status: 'stable' | 'partial' | 'experimental';
  supportsAutonomousUse: boolean;
  requiresPT: boolean;
  requiresVerification: boolean;
  notes?: string[];
}

export const COMMAND_CATALOG: Record<string, CommandCatalogEntry> = {
  build: {
    id: 'build',
    summary: 'Build y deploy de archivos a ~/pt-dev/',
    status: 'stable',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresVerification: false,
  },

  device: {
    id: 'device',
    summary: 'Gestión de dispositivos en Packet Tracer',
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresVerification: true,
    notes: [
      'device list es stable',
      'device add/remove/move son parciales',
      'device get para obtener info de dispositivo',
    ],
  },

  show: {
    id: 'show',
    summary: 'Ejecuta comandos show en dispositivos',
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresVerification: false,
  },

  'config-host': {
    id: 'config-host',
    summary: 'Configura la dirección IP de un dispositivo',
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresVerification: true,
  },

  vlan: {
    id: 'vlan',
    summary: 'Gestión de VLANs en switches',
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresVerification: true,
  },

  etherchannel: {
    id: 'etherchannel',
    summary: 'Configuración de EtherChannel',
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresVerification: true,
  },

  link: {
    id: 'link',
    summary: 'Gestión de enlaces entre dispositivos',
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresVerification: true,
  },

  'config-ios': {
    id: 'config-ios',
    summary: 'Ejecuta comandos de configuración IOS',
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresVerification: true,
    notes: ['No confiar ciegamente en "ok" sin verificación adicional'],
  },

  routing: {
    id: 'routing',
    summary: 'Configuración de protocolos de routing',
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresVerification: true,
  },

  acl: {
    id: 'acl',
    summary: 'Configuración de Access Control Lists',
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresVerification: true,
  },

  stp: {
    id: 'stp',
    summary: 'Configuración de Spanning Tree Protocol',
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresVerification: true,
  },

  services: {
    id: 'services',
    summary: 'Servicios de red en Packet Tracer',
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresVerification: true,
  },

  results: {
    id: 'results',
    summary: 'Visor de resultados de comandos',
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresVerification: false,
  },

  logs: {
    id: 'logs',
    summary: 'Visor de logs y trazas de debugging',
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresVerification: false,
  },

  help: {
    id: 'help',
    summary: 'Ayuda enriquecida para comandos',
    status: 'stable',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresVerification: false,
    notes: ['Ayuda manual puede tener drift con respecto a index.ts'],
  },

  history: {
    id: 'history',
    summary: 'Historial de ejecuciones de comandos',
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresVerification: false,
    notes: [
      'history list/show/last son stable',
      'history rerun es experimental — requiere implementación adicional',
    ],
  },

  doctor: {
    id: 'doctor',
    summary: 'Diagnóstico del sistema PT',
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresVerification: false,
  },

  completion: {
    id: 'completion',
    summary: 'Scripts de completion para shell',
    status: 'experimental',
    supportsAutonomousUse: false,
    requiresPT: false,
    requiresVerification: false,
    notes: ['Desactualizado — no refleja todos los comandos actuales'],
  },

  topology: {
    id: 'topology',
    summary: 'Análisis y visualización de topología',
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresVerification: false,
  },
};
