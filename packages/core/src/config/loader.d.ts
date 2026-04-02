import type { CiscoAutoConfig, ConfigLoadResult } from './types.ts';
/**
 * Cargar configuración desde un archivo YAML
 */
export declare function loadConfigFile(filepath: string): ConfigLoadResult;
/**
 * Obtener la ruta del archivo de configuración global (~/.cisco-auto/config.yaml)
 */
export declare function getGlobalConfigPath(): string;
/**
 * Obtener la ruta del archivo de configuración del proyecto (./cisco-auto.yaml)
 */
export declare function getProjectConfigPath(dir?: string): string;
/**
 * Cargar configuración global
 */
export declare function loadGlobalConfig(): ConfigLoadResult;
/**
 * Cargar configuración del proyecto
 */
export declare function loadProjectConfig(dir?: string): ConfigLoadResult;
/**
 * Cargar configuración desde variables de entorno (CISCO_AUTO_*)
 */
export declare function loadEnvConfig(): Partial<CiscoAutoConfig>;
/**
 * Verificar si existe el archivo de configuración del proyecto
 */
export declare function hasProjectConfig(dir?: string): boolean;
/**
 * Verificar si existe el archivo de configuración global
 */
export declare function hasGlobalConfig(): boolean;
/**
 * Guardar configuración a archivo
 */
export declare function saveConfigFile(filepath: string, config: Partial<CiscoAutoConfig>): boolean;
/**
 * Guardar configuración global
 */
export declare function saveGlobalConfig(config: Partial<CiscoAutoConfig>): boolean;
/**
 * Guardar configuración del proyecto
 */
export declare function saveProjectConfig(config: Partial<CiscoAutoConfig>, dir?: string): boolean;
//# sourceMappingURL=loader.d.ts.map