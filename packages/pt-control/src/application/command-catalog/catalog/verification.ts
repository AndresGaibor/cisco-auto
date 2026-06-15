// Catálogo de comandos de verificación
// Verificación, inspección, diagnóstico y pruebas de conectividad

import type { CommandCatalogEntry } from '../command-catalog-types.js';

export const VERIFICATION_COMMANDS: Record<string, CommandCatalogEntry> = {

  verify: {
    id: 'verify',
    summary: 'Verificación del estado y evidencia',
    longDescription: 'Valida resultados de ejecución, evidencia IOS y coherencia operativa del laboratorio.',
    examples: ['pt verify ios R1', 'pt verify link R1 Gi0/0 S1 Fa0/1'],
    related: ['inspect', 'status', 'config-ios'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    supportsJson: true,
    supportsVerify: true,
    supportsExplain: true,
    notes: ['Pensado para comprobaciones posteriores a cambios'],
  },

  inspect: {
    id: 'inspect',
    summary: 'Inspección canónica del estado del laboratorio y del twin',
    longDescription: 'Consulta la topología materializada, vecinos, puertos libres y drift desde el contexto del controller.',
    examples: ['pt inspect topology', 'pt inspect neighbors R1', 'pt inspect free-ports R1'],
    related: ['status', 'topology', 'device'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    supportsJson: true,
    supportsPlan: true,
    supportsExplain: true,
    notes: ['Comando raíz para inspección canónica'],
  },

  check: {
    id: 'check',
    summary: 'Chequeos rápidos de estado',
    longDescription: 'Ejecuta validaciones puntuales sobre interfaces, rutas o servicios.',
    examples: ['pt check interfaces R1'],
    related: ['verify', 'inspect'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: true,
    requiresContext: true,
  },

  diagnose: {
    id: 'diagnose',
    summary: 'Diagnóstico profundo de problemas de red',
    longDescription: 'Analiza el tráfico y configuraciones para encontrar la causa raíz de fallos de conectividad.',
    examples: ['pt diagnose connectivity PC1 PC2'],
    related: ['ping', 'omniscience'],
    status: 'experimental',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
  },

  ping: {
    id: 'ping',
    summary: 'Pruebas de conectividad ICMP',
    longDescription: 'Envía pings entre dispositivos y reporta latencia y éxito.',
    examples: ['pt ping PC1 192.168.1.1'],
    related: ['diagnose'],
    status: 'stable',
    supportsAutonomousUse: true,
    requiresPT: true,
    requiresContext: true,
  },

};