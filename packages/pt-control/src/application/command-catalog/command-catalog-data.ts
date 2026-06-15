/**
 * Command Catalog Data
 *
 * Agregador de catálogos de comandos por categoría.
 */

import type { CommandCatalogEntry } from './command-catalog-types.js';

import { RUNTIME_BUILD_COMMANDS } from './catalog/runtime-build.js';
import { DEVICE_LINK_COMMANDS } from './catalog/device-link.js';
import { CONFIG_IOS_COMMANDS } from './catalog/config-ios.js';
import { VERIFICATION_COMMANDS } from './catalog/verification.js';
import { OBSERVABILITY_COMMANDS } from './catalog/observability.js';
import { AGENT_HELP_COMMANDS } from './catalog/agent-help.js';
import { META_COMMANDS } from './catalog/meta.js';

export {
  RUNTIME_BUILD_COMMANDS,
  DEVICE_LINK_COMMANDS,
  CONFIG_IOS_COMMANDS,
  VERIFICATION_COMMANDS,
  OBSERVABILITY_COMMANDS,
  AGENT_HELP_COMMANDS,
  META_COMMANDS,
};

export const COMMAND_CATALOG: Record<string, CommandCatalogEntry> = {
  ...RUNTIME_BUILD_COMMANDS,
  ...DEVICE_LINK_COMMANDS,
  ...CONFIG_IOS_COMMANDS,
  ...VERIFICATION_COMMANDS,
  ...OBSERVABILITY_COMMANDS,
  ...AGENT_HELP_COMMANDS,
  ...META_COMMANDS,
};