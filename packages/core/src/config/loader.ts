import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { CiscoAutoConfig, ConfigLoadResult } from './types.ts';

/**
 * Cargar configuración desde un archivo YAML
 */
export function loadConfigFile(filepath: string): ConfigLoadResult {
  try {
    if (!fs.existsSync(filepath)) {
      return { success: false, error: `Archivo no encontrado: ${filepath}`, path: filepath };
    }

    const content = fs.readFileSync(filepath, 'utf-8');
    const config = yaml.load(content) as Partial<CiscoAutoConfig>;

    return { success: true, config, path: filepath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      path: filepath
    };
  }
}

/**
 * Obtener la ruta del archivo de configuración global (~/.cisco-auto/config.yaml)
 */
export function getGlobalConfigPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.cisco-auto', 'config.yaml');
}

/**
 * Obtener la ruta del archivo de configuración del proyecto (./cisco-auto.yaml)
 */
export function getProjectConfigPath(dir: string = process.cwd()): string {
  return path.join(dir, 'cisco-auto.yaml');
}

/**
 * Cargar configuración global
 */
export function loadGlobalConfig(): ConfigLoadResult {
  const globalPath = getGlobalConfigPath();
  return loadConfigFile(globalPath);
}

/**
 * Cargar configuración del proyecto
 */
export function loadProjectConfig(dir: string = process.cwd()): ConfigLoadResult {
  const projectPath = getProjectConfigPath(dir);
  return loadConfigFile(projectPath);
}

/**
 * Cargar configuración desde variables de entorno (CISCO_AUTO_*)
 */
export function loadEnvConfig(): Partial<CiscoAutoConfig> {
  const config: Partial<CiscoAutoConfig> = {};
  const prefix = 'CISCO_AUTO_';

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(prefix) && value !== undefined) {
      const rawKey = key.slice(prefix.length);
      const configKey = rawKey.replace(/_/g, '').toLowerCase();
      
      switch (configKey) {
        case 'defaultrouter':
          config.defaultRouter = value;
          break;
        case 'defaultswitch':
          config.defaultSwitch = value;
          break;
        case 'defaultpc':
          config.defaultPc = value;
          break;
        case 'defaultvlan':
          config.defaultVlan = parseInt(value, 10);
          break;
        case 'defaultsubnet':
          config.defaultSubnet = value;
          break;
        case 'outputdir':
          config.outputDir = value;
          break;
        case 'loglevel':
          config.logLevel = value as 'debug' | 'info' | 'warn' | 'error';
          break;
        case 'format':
          config.format = value as 'json' | 'yaml' | 'table';
          break;
      }
    }
  }

  return config;
}

/**
 * Verificar si existe el archivo de configuración del proyecto
 */
export function hasProjectConfig(dir: string = process.cwd()): boolean {
  const projectPath = getProjectConfigPath(dir);
  return fs.existsSync(projectPath);
}

/**
 * Verificar si existe el archivo de configuración global
 */
export function hasGlobalConfig(): boolean {
  const globalPath = getGlobalConfigPath();
  return fs.existsSync(globalPath);
}

/**
 * Guardar configuración a archivo
 */
export function saveConfigFile(filepath: string, config: Partial<CiscoAutoConfig>): boolean {
  try {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const content = yaml.dump(config, { indent: 2, lineWidth: 120 });
    fs.writeFileSync(filepath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Guardar configuración global
 */
export function saveGlobalConfig(config: Partial<CiscoAutoConfig>): boolean {
  return saveConfigFile(getGlobalConfigPath(), config);
}

/**
 * Guardar configuración del proyecto
 */
export function saveProjectConfig(config: Partial<CiscoAutoConfig>, dir: string = process.cwd()): boolean {
  return saveConfigFile(getProjectConfigPath(dir), config);
}