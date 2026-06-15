// Catálogo de comandos de agente y help
// Help, completion, planner y capacidades de agentes

import type { CommandCatalogEntry } from '../command-catalog-types.js';

export const AGENT_HELP_COMMANDS: Record<string, CommandCatalogEntry> = {

  agent: {
    id: 'agent',
    summary: 'Flujos explícitos para agentes',
    longDescription: 'Construye contexto recortado, planes y pasos de verificación para agentes autónomos o semiautónomos.',
    examples: ['pt agent context --task "connect R1 and S1"', 'pt agent plan --goal "normalize access layer"'],
    related: ['inspect', 'verify', 'layout'],
    status: 'experimental',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: true,
    supportsPlan: true,
    supportsExplain: true,
    notes: ['Optimizado para contexto de agente y output compacto'],
  },

  help: {
    id: 'help',
    summary: 'Ayuda enriquecida para comandos',
    longDescription: 'Muestra ayuda enriquecida para comandos con ejemplos y comandos relacionados.',
    examples: ['pt help', 'pt help device', 'pt help link add'],
    status: 'stable',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  completion: {
    id: 'completion',
    summary: 'Scripts de completion para shell',
    longDescription: 'Genera scripts de autocompletado para bash, zsh, y fish.',
    examples: ['pt completion bash', 'pt completion zsh', 'pt completion fish'],
    related: ['doctor', 'help'],
    status: 'experimental',
    supportsAutonomousUse: false,
    requiresPT: false,
    requiresContext: false,
    notes: ['Desactualizado — no refleja todos los comandos actuales'],
  },

  planner: {
    id: 'planner',
    summary: 'Planificación de cambios complejos',
    longDescription: 'Calcula los pasos necesarios para pasar del estado actual a un estado deseado.',
    examples: ['pt planner "Mover toda la red 10.0.0.0 a 192.168.0.0"'],
    related: ['agent', 'deploy'],
    status: 'experimental',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: true,
  },

  capability: {
    id: 'capability',
    summary: 'Consultar capacidades de modelos de dispositivos',
    longDescription: 'Muestra qué comandos y características soporta cada modelo de Cisco Packet Tracer.',
    examples: ['pt capability list', 'pt capability show 2911'],
    related: ['device'],
    status: 'stable',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

};