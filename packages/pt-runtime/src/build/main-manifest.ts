// packages/pt-runtime/src/build/main-manifest.ts
// Manifiesto de archivos para el main kernel
// Usado por render-main-v2.ts para generar main.js

import { findMissingTransitiveDeps } from "./build-utils.js";

export const MAIN_MANIFEST = {
  version: 2,
  description: "Lista de archivos TypeScript para generar main.js (kernel + terminal)",

  kernel: [
    "pt/kernel/types.ts",
    "pt/kernel/safe-fm.ts",
    "pt/kernel/directories.ts",
    "pt/kernel/queue-index.ts",
    "pt/kernel/queue-discovery.ts",
    "pt/kernel/dead-letter.ts",
    "pt/kernel/queue-cleanup.ts",
    "pt/kernel/queue-claim.ts",
    "pt/kernel/command-queue.ts",
    "pt/kernel/execution-engine.ts",
    "pt/kernel/execution-engine-delta.ts",
    "pt/kernel/execution-engine-output-detectors.ts",
    "pt/kernel/execution-engine-semantic.ts",
    "pt/kernel/execution-engine-step-handlers.ts",
    "pt/kernel/force-complete-native.ts",
    "pt/kernel/handle-command-step.ts",
    "pt/kernel/output-completion-policy.ts",
    "pt/kernel/reap-stale-jobs.ts",
    "pt/kernel/lease.ts",
    "pt/kernel/heartbeat.ts",
    "pt/kernel/cleanup.ts",
    "pt/kernel/kernel-state.ts",
    "pt/kernel/file-access.ts",
    "pt/kernel/runtime-api.ts",
    "pt/kernel/command-result-envelope.ts",
    "pt/kernel/command-finalizer.ts",
    "pt/kernel/queue-poller.ts",
    "pt/kernel/kernel-lifecycle.ts",
    "pt/kernel/runtime-loader.ts",
    "pt/kernel/debug-log.ts",
  ],

  terminal: [
    "pt/terminal/prompt-parser.ts",
    "pt/terminal/terminal-engine.ts",
    "pt/terminal/terminal-session.ts",
    "pt/terminal/terminal-events.ts",
    "terminal/command-executor.ts",
    "terminal/prompt-detector.ts",
    "terminal/session-registry.ts",
    "terminal/session-state.ts",
    "terminal/pager-handler.ts",
    "terminal/confirm-handler.ts",
    "terminal/command-sanitizer.ts",
    "terminal/stability-heuristic.ts",
    "terminal/terminal-errors.ts",
    "terminal/terminal-ready.ts",
    "terminal/command-output-extractor.ts",
    "terminal/terminal-semantic-verifier.ts",
    "terminal/terminal-recovery.ts",
    "terminal/engine/index.ts",
    "terminal/engine/terminal-event-collector.ts",
    "terminal/engine/terminal-completion-controller.ts",
    "terminal/engine/terminal-output-pipeline.ts",
    "terminal/engine/terminal-error-resolver.ts",
    "terminal/engine/terminal-recovery-controller.ts",
    "terminal/engine/terminal-observability.ts",
    "terminal/engine/command-executor.ts",
    "terminal/engine/command-state-machine.ts",
    "terminal/engine/pager-advance-controller.ts",
    "terminal/engine/finalize-scheduler.ts",
    "terminal/engine/output-poller.ts",
    "terminal/terminal-utils.ts",
  ],

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

export function validateMainManifestDependencies(sourceFiles: Map<string, string>): string[] {
  return findMissingTransitiveDeps(sourceFiles, new Set(getAllMainFiles()));
}
