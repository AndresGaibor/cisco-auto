/**
 * Runtime Constants Template - Generates constants section
 * Exports constants for device types, cables, etc. as JavaScript string
 */

import { CABLE_TYPES, DEVICE_TYPES, MODEL_ALIASES, CABLE_TYPE_NAMES, DEVICE_TYPE_NAMES } from "../utils/constants";

export function generateConstantsTemplate(): string {
  return `// ============================================================================
// Constants
// ============================================================================

var CABLE_TYPES = ${JSON.stringify(CABLE_TYPES)};

var DEVICE_TYPES = ${JSON.stringify(DEVICE_TYPES)};

var DEVICE_TYPE_NAMES = ${JSON.stringify(DEVICE_TYPE_NAMES)};

var MODEL_ALIASES = ${JSON.stringify(MODEL_ALIASES)};

var CABLE_TYPE_NAMES = ${JSON.stringify(CABLE_TYPE_NAMES)};
`;
}
