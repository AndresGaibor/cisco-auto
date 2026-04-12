// packages/pt-runtime/src/build/runtime-manifest.ts
// Manifiesto completo de archivos para el runtime
// Usado por render-runtime-v2.ts para generar runtime.js

export const RUNTIME_MANIFEST = {
  version: 2,
  description: "Lista completa de archivos TypeScript para generar runtime.js via AST pipeline V2",

  ptApi: [
    "pt-api/pt-api-registry.ts",
    "pt-api/pt-constants.ts",
    "pt-api/pt-results.ts",
    "pt-api/pt-deps.ts",
    "pt-api/pt-helpers.ts",
    "pt-api/pt-call-inventory.ts",
    "pt-api/pt-types.ts",
    "pt-api/index.ts",
  ],

  runtime: [
    "runtime/contracts.ts",
    "runtime/constants.ts",
    "runtime/types.ts",
    "runtime/helpers.ts",
    "runtime/index.ts",
  ],

  utils: [
    "utils/helpers.ts",
    "utils/constants.ts",
    "utils/parser-generator.ts",
    "utils/index.ts",
  ],

  core: [
    "core/registry.ts",
    "core/dispatcher.ts",
  ],

  handlers: [
    // Handler factories (implementaciones)
    "handlers/device.handler.ts",
    "handlers/link.handler.ts",
    "handlers/config.handler.ts",
    "handlers/inspect.handler.ts",
    "handlers/module.handler.ts",
    "handlers/canvas.handler.ts",
    "handlers/vlan.handler.ts",
    "handlers/dhcp.handler.ts",
    "handlers/host.handler.ts",
    // IOS engine y dispatcher
    "handlers/ios-engine.ts",
    "handlers/ios-session.ts",
    "handlers/ios-output-classifier.ts",
    "handlers/runtime-handlers.ts",
    // Helpers de config
    "handlers/config-types.ts",
  ],

  kernel: [
    "pt/kernel/main.ts",
    "pt/kernel/types.ts",
    "pt/kernel/directories.ts",
    "pt/kernel/lease.ts",
    "pt/kernel/command-queue.ts",
    "pt/kernel/runtime-loader.ts",
    "pt/kernel/heartbeat.ts",
    "pt/kernel/cleanup.ts",
    "pt/kernel/job-state.ts",
    "pt/kernel/step-handlers.ts",
    "pt/kernel/job-executor.ts",
    "pt/kernel/index.ts",
  ],

  terminal: [
    "pt/terminal/terminal-engine.ts",
    "pt/terminal/terminal-session.ts",
    "pt/terminal/terminal-events.ts",
    "pt/terminal/prompt-parser.ts",
    "pt/terminal/index.ts",
  ],
} as const;

export type RuntimeManifestSection = keyof typeof RUNTIME_MANIFEST;

export function getAllRuntimeFiles(): string[] {
  const files: string[] = [];
  for (const section of Object.keys(RUNTIME_MANIFEST) as RuntimeManifestSection[]) {
    if (section === "version" || section === "description") continue;
    files.push(...RUNTIME_MANIFEST[section]);
  }
  return files;
}

export function getRuntimeManifestSize(): number {
  return getAllRuntimeFiles().length;
}
