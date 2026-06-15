// Catálogo de comandos de observabilidad
// Resultados, logs, historial y auditoría

import type { CommandCatalogEntry } from '../command-catalog-types.js';

export const OBSERVABILITY_COMMANDS: Record<string, CommandCatalogEntry> = {

  results: {
    id: 'results',
    summary: 'Visor de resultados de comandos',
    longDescription: 'Muestra los resultados almacenados de comandos ejecutados.',
    examples: ['pt results list', 'pt results show <id>', 'pt results last'],
    related: ['logs', 'history'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  logs: {
    id: 'logs',
    summary: 'Visor de logs y trazas de debugging',
    longDescription: 'Inspecciona los logs de ejecución, errores y traces de comandos.',
    examples: ['pt logs tail', 'pt logs session <id>', 'pt logs errors'],
    related: ['history', 'doctor', 'results'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  history: {
    id: 'history',
    summary: 'Historial de ejecuciones de comandos',
    longDescription: 'Lista y muestra detalles de ejecuciones anteriores.',
    examples: ['pt history list', 'pt history show <id>', 'pt history last'],
    related: ['logs', 'doctor', 'results'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
    notes: [
      'history list/show/last son stable',
      'history rerun es experimental — requiere implementación adicional',
    ],
  },

  'history-search': {
    id: 'history-search',
    summary: 'Buscar en historial de comandos',
    longDescription: 'Busca comandos ejecutados anteriormente por texto.',
    examples: ['pt history search "ospf"'],
    related: ['history failed', 'history list'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  'history-failed': {
    id: 'history-failed',
    summary: 'Mostrar comandos fallidos',
    longDescription: 'Muestra comandos que fallaron en ejecuciones anteriores.',
    examples: ['pt history failed', 'pt history failed --device R1'],
    related: ['history search', 'audit failed'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  'audit-tail': {
    id: 'audit-tail',
    summary: 'Mostrar últimas operaciones del audit log',
    longDescription: 'Muestra las últimas N operaciones registradas.',
    examples: ['pt audit tail --lines 50'],
    related: ['audit export', 'audit failed'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  'audit-export': {
    id: 'audit-export',
    summary: 'Exportar auditoría a archivo',
    longDescription: 'Exporta el audit log a JSON, CSV o Markdown.',
    examples: ['pt audit export --format json --output audit.json'],
    related: ['audit tail', 'audit failed'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  'audit-failed': {
    id: 'audit-failed',
    summary: 'Mostrar operaciones fallidas',
    longDescription: 'Muestra operaciones fallidas con filtros por dispositivo y fecha.',
    examples: ['pt audit failed --since "2026-04-01"'],
    related: ['audit tail', 'history failed'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  'audit-query': {
    id: 'audit-query',
    summary: 'Consultar auditoría persistida',
    longDescription: 'Consulta la tabla audit_log de SQLite para inspeccionar ejecuciones persistidas de la CLI.',
    examples: ['pt audit query', 'pt audit query --device R1 --status failed'],
    related: ['audit tail', 'audit export', 'audit failed'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
    supportsJson: true,
    notes: ['Usa pt audit tail para una vista rápida'],
  },

  ledger: {
    id: 'ledger',
    summary: 'Libro de contabilidad de cambios y evidencia',
    longDescription: 'Mantiene un registro auditable de todos los cambios realizados y su justificación técnica.',
    examples: ['pt ledger list', 'pt ledger show <tx-id>'],
    related: ['history', 'audit-query'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

};