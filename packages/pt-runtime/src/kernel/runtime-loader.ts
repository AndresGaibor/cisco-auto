export interface RuntimeLoaderResult {
  success: boolean;
  metadata?: RuntimeMetadata;
  error?: string;
}

export interface RuntimeMetadata {
  lastMtime: number;
  fingerprint: string;
  version: string;
  loadCount: number;
  lastLoadAt: number;
}

export interface RuntimeLoaderConfig {
  runtimeFile: string;
  validator?: (code: string) => boolean;
}

export interface RuntimeLoader {
  load(): RuntimeLoaderResult;
  reloadIfNeeded(isBusyCheck: () => boolean): boolean;
  validateRuntimeBeforeLoad(code: string): boolean;
  getLoadedRuntimeMetadata(): RuntimeMetadata | null;
  isRuntimeLoaded(): boolean;
  unload(): void;
}

export function createRuntimeLoader(config: RuntimeLoaderConfig): RuntimeLoader {
  let loaded = false;
  let metadata: RuntimeMetadata | null = null;
  let runtimeFn: ((payload: Record<string, unknown>, api: unknown) => unknown) | null = null;
  let loadCount = 0;

  return {
    load(): RuntimeLoaderResult {
      loadCount++;
      const now = Date.now();

      metadata = {
        lastMtime: now,
        fingerprint: `fp-${now}`,
        version: "1.0.0",
        loadCount,
        lastLoadAt: now,
      };

      loaded = true;
      runtimeFn = (_payload, _api) => ({ loaded: true });

      return { success: true, metadata };
    },

    reloadIfNeeded(_isBusyCheck: () => boolean): boolean {
      if (!loaded) return false;
      return false;
    },

    validateRuntimeBeforeLoad(code: string): boolean {
      if (!config.validator) return true;
      const result = config.validator(code);
      return typeof result === 'boolean' ? result : false;
    },

    getLoadedRuntimeMetadata(): RuntimeMetadata | null {
      return metadata;
    },

    isRuntimeLoaded(): boolean {
      return loaded;
    },

    unload(): void {
      loaded = false;
      runtimeFn = null;
      metadata = null;
    },
  };
}