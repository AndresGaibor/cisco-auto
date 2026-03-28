import { DEFAULT_CONFIG, type CiscoAutoConfig, type ResolveOptions, type ResolvedConfig } from './types.ts';
import * as loader from './loader.ts';

export class ConfigResolver {
  private config: Partial<CiscoAutoConfig>;
  private resolvedKeys: Map<string, ResolvedConfig>;

  constructor() {
    this.config = {};
    this.resolvedKeys = new Map();
  }

  loadDefaults(): this {
    this.config = { ...DEFAULT_CONFIG };
    
    for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
      this.resolvedKeys.set(key, { key, value, source: 'defaults' });
    }
    
    return this;
  }

  loadGlobal(): this {
    const globalResult = loader.loadGlobalConfig();
    if (globalResult.success && globalResult.config) {
      this.mergeConfig(globalResult.config, 'global');
    }
    return this;
  }

  loadProject(dir: string = process.cwd()): this {
    const projectResult = loader.loadProjectConfig(dir);
    if (projectResult.success && projectResult.config) {
      this.mergeConfig(projectResult.config, 'project');
    }
    return this;
  }

  loadEnv(): this {
    const envConfig = loader.loadEnvConfig();
    this.mergeConfig(envConfig, 'env');
    return this;
  }

  applyFlags(flags: Partial<CiscoAutoConfig>): this {
    this.mergeConfig(flags, 'flags');
    return this;
  }

  private mergeConfig(newConfig: Partial<CiscoAutoConfig>, source: 'global' | 'project' | 'env' | 'flags'): void {
    for (const [key, value] of Object.entries(newConfig)) {
      if (value !== undefined) {
        (this.config as Record<string, unknown>)[key] = value;
        this.resolvedKeys.set(key, { key, value, source });
      }
    }
  }

  resolve(): CiscoAutoConfig {
    return { ...DEFAULT_CONFIG, ...this.config };
  }

  getResolved(key: string): ResolvedConfig | undefined {
    return this.resolvedKeys.get(key);
  }

  getAllResolved(): ResolvedConfig[] {
    return Array.from(this.resolvedKeys.values());
  }

  getSource(key: string): string {
    return this.resolvedKeys.get(key)?.source || 'defaults';
  }
}

export function resolveConfig(options: ResolveOptions = {}): CiscoAutoConfig {
  const resolver = new ConfigResolver();
  
  resolver.loadDefaults();
  resolver.loadGlobal();
  
  if (options.projectDir) {
    resolver.loadProject(options.projectDir);
  } else {
    resolver.loadProject();
  }
  
  if (options.useEnv !== false) {
    resolver.loadEnv();
  }
  
  if (options.flags) {
    resolver.applyFlags(options.flags);
  }
  
  return resolver.resolve();
}

export function getConfigValue(key: keyof CiscoAutoConfig, options: ResolveOptions = {}): unknown {
  const config = resolveConfig(options);
  return config[key];
}

export function getConfigSource(key: string, options: ResolveOptions = {}): string {
  const resolver = new ConfigResolver();
  resolver.loadDefaults();
  resolver.loadGlobal();
  resolver.loadProject(options.projectDir || process.cwd());
  
  if (options?.useEnv !== false) {
    resolver.loadEnv();
  }
  
  return resolver.getSource(key);
}