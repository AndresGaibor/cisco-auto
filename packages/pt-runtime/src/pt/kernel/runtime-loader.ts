// packages/pt-runtime/src/pt/kernel/runtime-loader.ts
// Hot reload for runtime.js

export interface RuntimeLoaderConfig {
  runtimeFile: string;
  checkIntervalMs: number;
}

export interface LoadedRuntime {
  mtime: number;
  fn: (payload: Record<string, unknown>, api: unknown) => unknown;
}

export function createRuntimeLoader(config: RuntimeLoaderConfig) {
  let lastMtime = 0;
  let lastFn: LoadedRuntime["fn"] | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;
  
  async function load(): Promise<LoadedRuntime["fn"] | null> {
    // Implementation will be PT-specific (uses fm global)
    return lastFn;
  }
  
  function start(onReload: (fn: LoadedRuntime["fn"]) => void): void {
    interval = setInterval(async () => {
      const fn = await load();
      if (fn && fn !== lastFn) {
        lastFn = fn;
        onReload(fn);
      }
    }, config.checkIntervalMs);
  }
  
  function stop(): void {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }
  
  return { start, stop, load, getLastMtime: () => lastMtime };
}