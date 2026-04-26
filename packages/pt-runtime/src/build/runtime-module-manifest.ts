// packages/pt-runtime/src/build/runtime-module-manifest.ts
// Module groups for runtime modular generation
// Extracted from render-runtime-modular.ts MODULE_GROUPS

import { RUNTIME_MANIFEST } from "./runtime-manifest";

/**
 * Module group definition for runtime modular generation.
 */
export interface ModuleGroupDefinition {
  files: readonly string[];
  description: string;
}

/**
 * Static module groupings for the runtime.
 * Each group is compiled separately and can be hot-reloaded.
 */
export const RUNTIME_MODULE_GROUPS = {
  core: {
    files: [
      ...RUNTIME_MANIFEST.utils,
      ...RUNTIME_MANIFEST.runtime,
    ],
    description: "Core utilities and runtime helpers",
  },
  device: {
    files: ["handlers/device.ts"],
    description: "Device add/remove/move operations",
  },
  dhcp: {
    files: ["handlers/dhcp.ts"],
    description: "DHCP server configuration",
  },
  vlan: {
    files: ["handlers/vlan.ts"],
    description: "VLAN management",
  },
  link: {
    files: ["handlers/link.ts"],
    description: "Network link operations",
  },
  host: {
    files: ["handlers/host.ts"],
    description: "Host/endpoints operations",
  },
  ios: {
    files: [
      "handlers/ios-output-classifier.ts",
      "handlers/parsers/ios-parsers.ts",
    ],
    description: "IOS CLI execution and terminal",
  },
  canvas: {
    files: ["handlers/canvas.ts"],
    description: "Canvas and UI operations",
  },
  inspect: {
    files: ["handlers/inspect.ts"],
    description: "Topology inspection",
  },
  module: {
    files: ["handlers/module.ts"],
    description: "Module management",
  },
  // NOTE: kernel is NOT a runtime module — it lives exclusively in main.js (MAIN_MANIFEST).
} as const;

export type ModuleGroupName = keyof typeof RUNTIME_MODULE_GROUPS;

/**
 * Get all module group names.
 */
export function getModuleGroupNames(): ModuleGroupName[] {
  return Object.keys(RUNTIME_MODULE_GROUPS) as ModuleGroupName[];
}

/**
 * Get files for a specific module group.
 */
export function getModuleGroupFiles(name: ModuleGroupName): string[] {
  return [...RUNTIME_MODULE_GROUPS[name].files];
}

/**
 * Get all module group entries.
 */
export function getAllModuleGroups(): Array<[ModuleGroupName, ModuleGroupDefinition]> {
  return Object.entries(RUNTIME_MODULE_GROUPS) as Array<[ModuleGroupName, ModuleGroupDefinition]>;
}
