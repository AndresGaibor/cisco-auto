import { ensureDir, ensureFile } from "../shared/fs-atomic.js";
import type { BridgePathLayout } from "../shared/path-layout.js";

export function ensureBridgeRuntimeDirectories(paths: BridgePathLayout): void {
  ensureDir(paths.commandsDir());
  ensureDir(paths.inFlightDir());
  ensureDir(paths.resultsDir());
  ensureDir(paths.logsDir());
  ensureDir(paths.consumerStateDir());
  ensureDir(paths.deadLetterDir());
  ensureFile(paths.currentEventsFile(), "");
}