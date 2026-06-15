// Catálogo de comandos de runtime/build
// Compilación, despliegue y gestión del runtime de Packet Tracer

import type { CommandCatalogEntry } from '../command-catalog-types.js';

export const RUNTIME_BUILD_COMMANDS: Record<string, CommandCatalogEntry> = {

  build: {
    id: 'build',
    summary: 'Build y deploy de archivos a ~/pt-dev/',
    longDescription: 'Compila y despliega los archivos JavaScript a ~/pt-dev/ para ser cargados en Packet Tracer.',
    examples: ['pt build'],
    related: ['doctor', 'logs'],
    status: 'stable',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  setup: {
    id: 'setup',
    summary: 'Preparación del entorno local de Packet Tracer',
    longDescription: 'Ejecuta el flujo mínimo de instalación local para generar y desplegar los artefactos del runtime.',
    examples: ['pt setup'],
    related: ['build', 'status'],
    status: 'experimental',
    supportsAutonomousUse: false,
    requiresPT: false,
    requiresContext: false,
    notes: ['Alias operativo para el bootstrap local de pt-dev'],
  },

  runtime: {
    id: 'runtime',
    summary: 'Operaciones del runtime de Packet Tracer',
    longDescription: 'Lista snapshots locales del runtime y permite rollback a una release anterior.',
    examples: ['pt runtime releases', 'pt runtime rollback --last'],
    related: ['build', 'setup', 'status'],
    status: 'experimental',
    supportsAutonomousUse: false,
    requiresPT: false,
    requiresContext: false,
    notes: ['Solo gestiona snapshots locales y artefactos de despliegue'],
  },

  doctor: {
    id: 'doctor',
    summary: 'Diagnóstico del sistema PT',
    longDescription: 'Ejecuta verificaciones del sistema para diagnosticar problemas.',
    examples: ['pt doctor', 'pt doctor --verbose'],
    related: ['logs', 'history', 'completion'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  bridge: {
    id: 'bridge',
    summary: 'Gestión de la comunicación con Packet Tracer',
    longDescription: 'Comandos de bajo nivel para depurar el FileBridge e IPC.',
    examples: ['pt bridge status', 'pt bridge flush'],
    related: ['doctor'],
    status: 'stable',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: false,
  },

};