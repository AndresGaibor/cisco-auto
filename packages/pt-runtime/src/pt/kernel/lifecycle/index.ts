// packages/pt-runtime/src/pt/kernel/lifecycle/index.ts
// Re-exports públicos del módulo lifecycle

export { createKernelLifecycle } from "./kernel-lifecycle";
export type { KernelLifecycle } from "./kernel-lifecycle";
export type { KernelSubsystems } from "./kernel-subsystems";

export { readPollTuning, isControlPollCommandType } from "./poll-tuning";
export type { PollTuning } from "./poll-tuning";
