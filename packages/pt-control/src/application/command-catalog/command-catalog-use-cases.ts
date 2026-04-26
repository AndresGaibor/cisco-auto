/**
 * Command Catalog Use Cases
 *
 * Business logic operations on the command catalog.
 */

import { COMMAND_CATALOG } from './command-catalog-data.js';
import type { CommandCatalogEntry } from './command-catalog-types.js';

/**
 * Returns all commands in the catalog.
 */
export function listCommands(): CommandCatalogEntry[] {
  return Object.values(COMMAND_CATALOG);
}

/**
 * Search commands by keyword in summary or longDescription.
 */
export function searchCommands(keyword: string): CommandCatalogEntry[] {
  const lower = keyword.toLowerCase();
  return Object.values(COMMAND_CATALOG).filter(
    (cmd) =>
      cmd.summary.toLowerCase().includes(lower) ||
      (cmd.longDescription?.toLowerCase().includes(lower) ?? false),
  );
}

/**
 * Filter commands by status tag.
 */
export function filterByTag(status: 'stable' | 'partial' | 'experimental'): CommandCatalogEntry[] {
  return Object.values(COMMAND_CATALOG).filter((cmd) => cmd.status === status);
}

/**
 * Filter commands by capability flag.
 */
export function filterByCapability(
  capability: keyof CommandCatalogEntry,
): CommandCatalogEntry[] {
  return Object.values(COMMAND_CATALOG).filter((cmd) => Boolean(cmd[capability]));
}

/**
 * Validate the catalog for structural integrity.
 * Returns array of error messages (empty if valid).
 */
export function validateCatalog(): string[] {
  const errors: string[] = [];

  for (const [id, entry] of Object.entries(COMMAND_CATALOG)) {
    if (entry.id !== id) {
      errors.push(`Entry id "${entry.id}" does not match key "${id}"`);
    }
    if (!entry.summary || entry.summary.trim() === '') {
      errors.push(`Command "${id}" is missing a summary`);
    }
    if (!['stable', 'partial', 'experimental'].includes(entry.status)) {
      errors.push(`Command "${id}" has invalid status "${entry.status}"`);
    }
    if (typeof entry.supportsAutonomousUse !== 'boolean') {
      errors.push(`Command "${id}" is missing supportsAutonomousUse`);
    }
    if (typeof entry.requiresPT !== 'boolean') {
      errors.push(`Command "${id}" is missing requiresPT`);
    }
    if (typeof entry.requiresContext !== 'boolean') {
      errors.push(`Command "${id}" is missing requiresContext`);
    }
  }

  return errors;
}

/**
 * Get a single command by id.
 */
export function getCommand(id: string): CommandCatalogEntry | undefined {
  return COMMAND_CATALOG[id];
}
