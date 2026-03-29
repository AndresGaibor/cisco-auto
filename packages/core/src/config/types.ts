/**
 * Tipos para el sistema de configuración de cisco-auto
 * Define la estructura de configuración y tipos relacionados
 */

// Valores por defecto de la configuración
export interface CiscoAutoConfig {
  defaultRouter?: string;
  defaultSwitch?: string;
  defaultPc?: string;
  defaultVlan?: number;
  defaultSubnet?: string;
  outputDir?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  format?: 'json' | 'yaml' | 'table';
}

// Valores por defecto
export const DEFAULT_CONFIG: Required<CiscoAutoConfig> = {
  defaultRouter: '2911',
  defaultSwitch: '2960-24TT',
  defaultPc: 'PC-PT',
  defaultVlan: 10,
  defaultSubnet: '255.255.255.0',
  outputDir: './output',
  logLevel: 'info',
  format: 'table'
};

// Representa una fuente de configuración
export type ConfigSource = 'defaults' | 'global' | 'project' | 'env' | 'flags';

// Configuración resuelta con metadatos de origen
export interface ResolvedConfig {
  key: string;
  value: unknown;
  source: ConfigSource;
}

// Resultado de cargar configuración desde archivo
export interface ConfigLoadResult {
  success: boolean;
  config?: CiscoAutoConfig;
  path?: string;
  error?: string;
}

// Opciones para resolver configuración
export interface ResolveOptions {
  // Valores pasados como flags CLI
  flags?: Partial<CiscoAutoConfig>;
  // Directorio del proyecto para buscar cisco-auto.yaml
  projectDir?: string;
  // Forzar lectura de env vars
  useEnv?: boolean;
}

// Constructor de config - permite crear desde diferentes fuentes
export interface ConfigBuilder {
  loadDefaults(): ConfigBuilder;
  loadGlobal(): ConfigBuilder;
  loadProject(dir: string): ConfigBuilder;
  loadEnv(): ConfigBuilder;
  applyFlags(flags: Partial<CiscoAutoConfig>): ConfigBuilder;
  resolve(): CiscoAutoConfig;
}