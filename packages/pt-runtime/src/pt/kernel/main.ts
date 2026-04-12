// packages/pt-runtime/src/pt/kernel/main.ts
// Entry point for main.js - will be compiled to JS

export { createQueuePoller, type QueuedCommand, type QueueConfig } from "./queue";
export { createHeartbeat, type HeartbeatConfig } from "./heartbeat";
export { createRuntimeLoader, type RuntimeLoaderConfig, type LoadedRuntime } from "./runtime-loader";
export { createCleanupManager, type CleanupState } from "./cleanup";

// Main kernel boot function (will be filled in later)
export async function bootKernel(config: {
  devDir: string;
  pollIntervalMs: number;
  heartbeatIntervalMs: number;
}): Promise<void> {
  // TODO: Implement kernel boot
  throw new Error("bootKernel not implemented");
}