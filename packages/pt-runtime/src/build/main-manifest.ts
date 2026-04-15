// packages/pt-runtime/src/build/main-manifest.ts
// Manifiesto de archivos para el main kernel
// Usado por render-main-v2.ts para generar main.js

export const MAIN_MANIFEST = {
  version: 2,
  description: "Lista de archivos TypeScript para generar main.js (kernel + terminal)",

  kernel: [
    "pt/kernel/types.ts",
    "pt/kernel/safe-fm.ts",
    "pt/kernel/directories.ts",
    "pt/kernel/command-queue.ts",
    "pt/kernel/job-state.ts",
    "pt/kernel/step-handlers.ts",
    "pt/kernel/job-executor.ts",
    "pt/kernel/lease.ts",
    "pt/kernel/heartbeat.ts",
    "pt/kernel/cleanup.ts",
    "pt/kernel/runtime-loader.ts",
  ],

  terminal: [
    "pt/terminal/prompt-parser.ts",
    "pt/terminal/terminal-engine.ts",
    "pt/terminal/terminal-session.ts",
    "pt/terminal/terminal-events.ts",
  ],

  // main.ts MUST be last — it depends on createTerminalEngine (terminal) and all kernel modules
  entry: [
    "pt/kernel/main.ts",
  ],
} as const;


export function getAllMainFiles(): string[] {
  const files: string[] = [];
  files.push(...MAIN_MANIFEST.kernel);
  files.push(...MAIN_MANIFEST.terminal);
  files.push(...MAIN_MANIFEST.entry);
  return files;
}

export function getMainManifestSize(): number {
  return getAllMainFiles().length;
}
