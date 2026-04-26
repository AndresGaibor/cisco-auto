#!/usr/bin/env bun

/**
 * Command Catalog — Thin CLI re-export
 *
 * Metadata for all PT CLI commands.
 * Data and logic moved to pt-control/application/command-catalog.
 *
 * This file is kept for backward compatibility.
 */

// Re-export types and data from pt-control
export type { CommandCatalogEntry } from '@cisco-auto/pt-control/application/command-catalog';
export { COMMAND_CATALOG } from '@cisco-auto/pt-control/application/command-catalog';
export {
  listCommands,
  searchCommands,
  filterByTag,
  filterByCapability,
  validateCatalog,
  getCommand,
} from '@cisco-auto/pt-control/application/command-catalog';

/**
 * Returns the list of registered command IDs.
 * Kept here for backward compatibility.
 */
export function getRegisteredCommandIds(): string[] {
  return ['build', 'device', 'inspect', 'layout', 'verify', 'agent', 'show', 'config-host', 'vlan', 'etherchannel', 'link', 'config-ios', 'routing', 'acl', 'stp', 'services', 'results', 'logs', 'help', 'history', 'doctor', 'completion', 'topology', 'status', 'setup', 'runtime', 'config-ospf', 'config-eigrp', 'config-bgp', 'config-acl', 'config-vlan', 'config-interface', 'config-apply', 'devices-list', 'devices-add', 'history-search', 'history-failed', 'topology-show', 'config-prefs', 'audit-tail', 'audit-export', 'audit-failed', 'lab', 'router', 'audit-query', 'deploy', 'init', 'parse', 'template', 'validate', 'canvas', 'omniscience', 'simulation', 'lint', 'capability', 'planner', 'ledger', 'diagnose', 'bridge', 'dhcp-server', 'host', 'ping', 'show-mac', 'check'];
}
