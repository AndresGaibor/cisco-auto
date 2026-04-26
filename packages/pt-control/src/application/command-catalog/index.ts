/**
 * Command Catalog
 *
 * Re-exports types, data, and use cases for the command catalog.
 */

export type { CommandCatalogEntry } from './command-catalog-types.js';
export { COMMAND_CATALOG } from './command-catalog-data.js';
export {
  listCommands,
  searchCommands,
  filterByTag,
  filterByCapability,
  validateCatalog,
  getCommand,
} from './command-catalog-use-cases.js';
