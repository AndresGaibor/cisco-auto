// Directory management for PT file system

import { safeFM } from "./safe-fm";

export interface DirectoryManager {
  ensureDirectories(): void;
  directories: {
    devDir: string;
    commandsDir: string;
    inFlightDir: string;
    resultsDir: string;
    deadLetterDir: string;
    logsDir: string;
    commandsTraceDir: string;
  };
}

export function createDirectoryManager(config: {
  devDir: string;
  commandsDir: string;
  inFlightDir: string;
  resultsDir: string;
  deadLetterDir: string;
  logsDir: string;
  commandsTraceDir: string;
}) {
  const dirs = {
    devDir: config.devDir,
    commandsDir: config.commandsDir,
    inFlightDir: config.inFlightDir,
    resultsDir: config.resultsDir,
    deadLetterDir: config.deadLetterDir,
    logsDir: config.logsDir,
    commandsTraceDir: config.commandsTraceDir,
  };

  function ensureDirectories(): void {
    const s = safeFM();
    if (!s.available || !s.fm) {
      dprint("[dir] fm unavailable — skipping directory creation");
      return;
    }
    const _fm = s.fm;
    for (const dir of Object.values(dirs)) {
      try {
        if (!_fm.directoryExists(dir)) {
          _fm.makeDirectory(dir);
        }
      } catch (e) {
        dprint("[dir] Error creating " + dir + ": " + String(e));
      }
    }
  }

  return { ensureDirectories, directories: dirs };
}