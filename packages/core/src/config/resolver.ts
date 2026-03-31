import { DEFAULT_CONFIG, type CiscoAutoConfig, type ResolveOptions, type ResolvedConfig } from './types.ts';
import * as loader from './loader.ts';
import { z } from 'zod';

const CiscoAutoConfigSchema = z.object({
  defaultRouter: z.string().optional(),
  defaultSwitch: z.string().optional(),
  defaultPc: z.string().optional(),
  defaultVlan: z.number().int().min(1).max(4094).optional(),
  defaultSubnet: z.string().optional(),
  outputDir: z.string().optional(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  format: z.enum(['json', 'yaml', 'table']).optional(),
});

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

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
    const merged = { ...DEFAULT_CONFIG, ...this.config };
    const result = CiscoAutoConfigSchema.safeParse(merged);

    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => {
          const field = issue.path.join('.') || '<root>';
          return `  ${field}: ${issue.message}`;
        })
        .join('\n');

      throw new ConfigValidationError(`Invalid configuration:\n${issues}`);
    }

    return result.data as CiscoAutoConfig;
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