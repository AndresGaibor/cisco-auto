// packages/pt-runtime/src/pt/kernel/queue.ts
// Poll command queue (commands/, in-flight/, results/)

export interface QueueConfig {
  commandsDir: string;
  inFlightDir: string;
  resultsDir: string;
  pollIntervalMs: number;
}

export interface QueuedCommand {
  id: string;
  seq: number;
  payload: Record<string, unknown>;
  filename: string;
}

export function createQueuePoller(config: QueueConfig) {
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  
  async function poll(): Promise<QueuedCommand | null> {
    // Implementation will be PT-specific (uses fm global)
    // This is a stub for now
    return null;
  }
  
  function start(callback: (command: QueuedCommand) => void): void {
    pollInterval = setInterval(async () => {
      const command = await poll();
      if (command) {
        callback(command);
      }
    }, config.pollIntervalMs);
  }
  
  function stop(): void {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }
  
  return { start, stop, poll };
}