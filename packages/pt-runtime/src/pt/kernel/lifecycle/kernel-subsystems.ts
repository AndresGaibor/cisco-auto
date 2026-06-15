// packages/pt-runtime/src/pt/kernel/lifecycle/kernel-subsystems.ts
// Interfaz KernelSubsystems compartida por kernel-lifecycle, kernel-boot y kernel-shutdown

import type { KernelConfig } from "../types";
import type { CommandQueue } from "../command-queue";
import type { RuntimeLoader } from "../runtime-loader";
import type { HeartbeatManager } from "../heartbeat";
import type { ExecutionEngine } from "../execution-engine-types";
import type { LeaseManager } from "../lease";
import type { DirectoryManager } from "../directories";

export interface KernelSubsystems {
  dirs: DirectoryManager;
  queue: CommandQueue;
  runtimeLoader: RuntimeLoader;
  heartbeat: HeartbeatManager;
  executionEngine: ExecutionEngine;
  terminal: any;
  lease: LeaseManager;
  config: KernelConfig;
  kernelLog: (message: string, level?: "debug" | "info" | "warn" | "error") => void;
  kernelLogSubsystem: (name: string, message: string) => void;
}
