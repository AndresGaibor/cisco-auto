/**
 * Tipos para el sistema de configuración de cisco-auto
 * Define la estructura de configuración y tipos relacionados
 */
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
export declare const DEFAULT_CONFIG: Required<CiscoAutoConfig>;
export type ConfigSource = 'defaults' | 'global' | 'project' | 'env' | 'flags';
export interface ResolvedConfig {
    key: string;
    value: unknown;
    source: ConfigSource;
}
export interface ConfigLoadResult {
    success: boolean;
    config?: CiscoAutoConfig;
    path?: string;
    error?: string;
}
export interface ResolveOptions {
    flags?: Partial<CiscoAutoConfig>;
    projectDir?: string;
    useEnv?: boolean;
}
export interface ConfigBuilder {
    loadDefaults(): ConfigBuilder;
    loadGlobal(): ConfigBuilder;
    loadProject(dir: string): ConfigBuilder;
    loadEnv(): ConfigBuilder;
    applyFlags(flags: Partial<CiscoAutoConfig>): ConfigBuilder;
    resolve(): CiscoAutoConfig;
}
//# sourceMappingURL=types.d.ts.map