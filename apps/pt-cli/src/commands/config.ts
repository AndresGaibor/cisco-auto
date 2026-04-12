import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';

interface CiscoAutoConfig {
  defaultRouter?: string;
  defaultSwitch?: string;
  defaultPc?: string;
  defaultVlan?: number;
  defaultSubnet?: string;
  outputDir?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  format?: 'json' | 'yaml' | 'table';
}

type ConfigSource = 'defaults' | 'global' | 'project' | 'env' | 'flags';

interface ResolvedConfig {
  key: string;
  value: unknown;
  source: ConfigSource;
}

const DEFAULT_CONFIG: Required<CiscoAutoConfig> = {
  defaultRouter: '2911',
  defaultSwitch: '2960-24TT',
  defaultPc: 'PC-PT',
  defaultVlan: 10,
  defaultSubnet: '255.255.255.0',
  outputDir: './output',
  logLevel: 'info',
  format: 'table'
};

function getGlobalConfigPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.cisco-auto', 'config.yaml');
}

function getProjectConfigPath(dir: string = process.cwd()): string {
  return path.join(dir, 'cisco-auto.yaml');
}

function loadConfigFile(filepath: string): { success: boolean; config?: Partial<CiscoAutoConfig>; error?: string } {
  try {
    if (!fs.existsSync(filepath)) {
      return { success: false, error: `Archivo no encontrado: ${filepath}` };
    }
    const content = fs.readFileSync(filepath, 'utf-8');
    const config = yaml.load(content) as Partial<CiscoAutoConfig>;
    return { success: true, config };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

function hasGlobalConfig(): boolean {
  return fs.existsSync(getGlobalConfigPath());
}

function hasProjectConfig(dir: string = process.cwd()): boolean {
  return fs.existsSync(getProjectConfigPath(dir));
}

function saveGlobalConfig(config: Partial<CiscoAutoConfig>): boolean {
  return saveConfigFile(getGlobalConfigPath(), config);
}

function saveProjectConfig(config: Partial<CiscoAutoConfig>, dir: string = process.cwd()): boolean {
  return saveConfigFile(getProjectConfigPath(dir), config);
}

function saveConfigFile(filepath: string, config: Partial<CiscoAutoConfig>): boolean {
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

function loadEnvConfig(): Partial<CiscoAutoConfig> {
  const config: Partial<CiscoAutoConfig> = {};
  const prefix = 'CISCO_AUTO_';
  for (const [envKey, value] of Object.entries(process.env)) {
    if (envKey.startsWith(prefix) && value !== undefined) {
      const rawKey = envKey.slice(prefix.length);
      const configKey = rawKey.replace(/_/g, '').toLowerCase();
      switch (configKey) {
        case 'defaultrouter': config.defaultRouter = value; break;
        case 'defaultswitch': config.defaultSwitch = value; break;
        case 'defaultpc': config.defaultPc = value; break;
        case 'defaultvlan': config.defaultVlan = parseInt(value, 10); break;
        case 'defaultsubnet': config.defaultSubnet = value; break;
        case 'outputdir': config.outputDir = value; break;
        case 'loglevel': config.logLevel = value as CiscoAutoConfig['logLevel']; break;
        case 'format': config.format = value as CiscoAutoConfig['format']; break;
      }
    }
  }
  return config;
}

class ConfigResolver {
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
    const result = loadConfigFile(getGlobalConfigPath());
    if (result.success && result.config) {
      this.mergeConfig(result.config, 'global');
    }
    return this;
  }

  loadProject(dir: string = process.cwd()): this {
    const result = loadConfigFile(getProjectConfigPath(dir));
    if (result.success && result.config) {
      this.mergeConfig(result.config, 'project');
    }
    return this;
  }

  loadEnv(): this {
    this.mergeConfig(loadEnvConfig(), 'env');
    return this;
  }

  private mergeConfig(newConfig: Partial<CiscoAutoConfig>, source: ConfigSource): void {
    for (const [key, value] of Object.entries(newConfig)) {
      if (value !== undefined) {
        (this.config as Record<string, unknown>)[key] = value;
        this.resolvedKeys.set(key, { key, value, source });
      }
    }
  }

  resolve(): CiscoAutoConfig {
    return { ...DEFAULT_CONFIG, ...this.config } as CiscoAutoConfig;
  }

  getResolved(key: string): ResolvedConfig | undefined {
    return this.resolvedKeys.get(key);
  }

  getAllResolved(): ResolvedConfig[] {
    return Array.from(this.resolvedKeys.values());
  }
}

const VALID_KEYS = [
  'defaultRouter',
  'defaultSwitch', 
  'defaultPc',
  'defaultVlan',
  'defaultSubnet',
  'outputDir',
  'bridgePort',
  'logLevel',
  'format'
];

function isValidKey(key: string): boolean {
  return VALID_KEYS.includes(key);
}

export function createConfigCommand(): Command {
  const configCmd = new Command('config')
    .description('Gestionar configuración de cisco-auto')
    .addCommand(
      new Command('get')
        .description('Obtener un valor de configuración')
        .argument('<key>', 'Clave de configuración a obtener')
        .option('--global', 'Usar solo configuración global')
        .option('--local', 'Usar solo configuración local (proyecto)')
        .action(async (key, options) => {
          if (!isValidKey(key)) {
            console.error(chalk.red(`❌ Clave inválida: ${key}`));
            console.log(chalk.yellow('💡 Claves válidas:'), VALID_KEYS.join(', '));
            process.exit(1);
          }

          const resolver = new ConfigResolver();
          resolver.loadDefaults();
          
          if (options.global) {
            resolver.loadGlobal();
          } else if (options.local) {
            resolver.loadProject();
          } else {
            resolver.loadGlobal();
            resolver.loadProject();
            resolver.loadEnv();
          }

          const resolved = resolver.getResolved(key as keyof CiscoAutoConfig);
          const config = resolver.resolve();
          const value = config[key as keyof CiscoAutoConfig];

          if (value !== undefined) {
            console.log(value);
          } else {
            console.error(chalk.red(`❌ No se encontró el valor para: ${key}`));
            process.exit(1);
          }
        })
    )
    .addCommand(
      new Command('set')
        .description('Establecer un valor de configuración')
        .argument('<key>', 'Clave de configuración')
        .argument('<value>', 'Valor a establecer')
        .option('--global', 'Guardar en configuración global')
        .option('--local', 'Guardar en configuración del proyecto')
        .action(async (key, value, options) => {
          if (!isValidKey(key)) {
            console.error(chalk.red(`❌ Clave inválida: ${key}`));
            console.log(chalk.yellow('💡 Claves válidas:'), VALID_KEYS.join(', '));
            process.exit(1);
          }

          const configToSave: Partial<CiscoAutoConfig> = {};
          
          if (key === 'defaultVlan' || key === 'bridgePort') {
            const numValue = parseInt(value, 10);
            if (isNaN(numValue)) {
              console.error(chalk.red(`❌ Valor debe ser un número para: ${key}`));
              process.exit(1);
            }
            (configToSave as Record<string, unknown>)[key] = numValue;
          } else if (key === 'logLevel') {
            if (!['debug', 'info', 'warn', 'error'].includes(value)) {
              console.error(chalk.red(`❌ Valor inválido para logLevel: ${value}`));
              process.exit(1);
            }
            (configToSave as Record<string, unknown>)[key] = value;
          } else if (key === 'format') {
            if (!['json', 'yaml', 'table'].includes(value)) {
              console.error(chalk.red(`❌ Valor inválido para format: ${value}`));
              process.exit(1);
            }
            (configToSave as Record<string, unknown>)[key] = value;
          } else {
            (configToSave as Record<string, unknown>)[key] = value;
          }

          let success: boolean;
          
          if (options.global) {
            success = saveGlobalConfig(configToSave);
            if (success) {
              console.log(chalk.green(`✅ Guardado en configuración global:`));
              console.log(`   ${key}: ${value}`);
            }
          } else if (options.local) {
            success = saveProjectConfig(configToSave);
            if (success) {
              console.log(chalk.green(`✅ Guardado en configuración del proyecto:`));
              console.log(`   ${key}: ${value}`);
            }
          } else {
            console.error(chalk.red('❌ Debe especificar --global o --local'));
            process.exit(1);
          }

          if (!success) {
            console.error(chalk.red('❌ Error al guardar configuración'));
            process.exit(1);
          }
        })
    )
    .addCommand(
      new Command('list')
        .description('Listar todos los valores de configuración')
        .option('--global', 'Mostrar solo configuración global')
        .option('--local', 'Mostrar solo configuración del proyecto')
        .option('--source', 'Mostrar origen de cada valor')
        .action(async (options) => {
          const resolver = new ConfigResolver();
          resolver.loadDefaults();
          resolver.loadGlobal();
          resolver.loadProject();
          resolver.loadEnv();

          const config = resolver.resolve();
          const allResolved = resolver.getAllResolved();

          console.log(chalk.bold('\n📋 Configuración de cisco-auto\n'));
          
          if (options.global) {
            console.log(chalk.cyan('─'.repeat(40)));
            console.log(chalk.cyan('🌐 Configuración Global'));
            console.log(chalk.cyan('─'.repeat(40)));
            const globalPath = getGlobalConfigPath();
            console.log(chalk.gray(`  Archivo: ${globalPath}`));
            console.log();
            
            for (const [key, value] of Object.entries(config)) {
              const resolved = allResolved.find(r => r.key === key);
              if (resolved?.source === 'global' || resolved?.source === 'defaults') {
                console.log(`  ${chalk.yellow(key)}: ${value}`);
              }
            }
          } else if (options.local) {
            console.log(chalk.cyan('─'.repeat(40)));
            console.log(chalk.cyan('📁 Configuración del Proyecto'));
            console.log(chalk.cyan('─'.repeat(40)));
            const projectPath = getProjectConfigPath();
            console.log(chalk.gray(`  Archivo: ${projectPath}`));
            console.log();
            
            for (const [key, value] of Object.entries(config)) {
              const resolved = allResolved.find(r => r.key === key);
              if (resolved?.source === 'project') {
                console.log(`  ${chalk.yellow(key)}: ${value}`);
              }
            }
          } else {
            for (const [key, value] of Object.entries(config)) {
              const resolved = allResolved.find(r => r.key === key);
              const source = resolved?.source || 'defaults';
              
              let sourceIndicator = '';
              switch (source) {
                case 'flags':
                  sourceIndicator = chalk.red(' [CLI]');
                  break;
                case 'env':
                  sourceIndicator = chalk.blue(' [ENV]');
                  break;
                case 'project':
                  sourceIndicator = chalk.cyan(' [LOCAL]');
                  break;
                case 'global':
                  sourceIndicator = chalk.green(' [GLOBAL]');
                  break;
                default:
                  sourceIndicator = chalk.gray(' [DEFAULT]');
              }

              console.log(`  ${chalk.yellow(key)}: ${value}${sourceIndicator}`);
            }
          }

          console.log();
          
          const globalExists = hasGlobalConfig();
          const projectExists = hasProjectConfig();
          
          console.log(chalk.gray('📍 Archivos de configuración:'));
          console.log(`   Global: ${globalExists ? chalk.green('✓') : chalk.gray('✗')} ${getGlobalConfigPath()}`);
          console.log(`   Proyecto: ${projectExists ? chalk.green('✓') : chalk.gray('✗')} ${getProjectConfigPath()}`);
          console.log();
        })
    );

  return configCmd;
}