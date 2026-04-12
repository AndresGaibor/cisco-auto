// Directory management for PT file system

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
    // Uses PT fm global
    for (const dir of Object.values(dirs)) {
      try {
        if (!fm.directoryExists(dir)) {
          fm.makeDirectory(dir);
        }
      } catch (e) {
        dprint("[dir] Error creating " + dir + ": " + String(e));
      }
    }
  }

  return { ensureDirectories, directories: dirs };
}