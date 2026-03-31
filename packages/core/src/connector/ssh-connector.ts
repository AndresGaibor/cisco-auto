/**
 * Módulo de conexión SSH para dispositivos Cisco
 * Usa node-ssh (wrapper de ssh2)
 */

import { NodeSSH } from 'node-ssh';
import type { Config as SSHConfig, SSHExecCommandOptions, SSHExecCommandResponse } from 'node-ssh';
import type { Device } from '@cisco-auto/types';

export interface ConnectionResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface SSHConnectorOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  commandTimeoutMs?: number;
  connectionTimeoutMs?: number;
}

// Custom error classes
export class SSHConnectionError extends Error {
  constructor(
    message: string,
    public readonly host: string,
    public readonly attempt: number
  ) {
    super(message);
    this.name = 'SSHConnectionError';
  }
}

export class SSHCommandError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly output: string
  ) {
    super(message);
    this.name = 'SSHCommandError';
  }
}

export class SSHTimeoutError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly timeoutMs: number
  ) {
    super(message);
    this.name = 'SSHTimeoutError';
  }
}

export class SSHConnector {
  private ssh: NodeSSH;
  private device: Device;
  private isConnected: boolean = false;
  private options: Required<SSHConnectorOptions>;

  constructor(device: Device, options?: SSHConnectorOptions) {
    this.ssh = new NodeSSH();
    this.device = device;
    this.options = {
      maxRetries: options?.maxRetries ?? 3,
      retryDelayMs: options?.retryDelayMs ?? 2000,
      commandTimeoutMs: options?.commandTimeoutMs ?? 30_000,
      connectionTimeoutMs: options?.connectionTimeoutMs ?? 10_000,
    };
  }

  /**
   * Conecta al dispositivo via SSH con retry logic
   */
  public async connect(): Promise<void> {
    if (!this.device.management?.ip) {
      throw new Error(`Dispositivo ${this.device.name} no tiene IP de management configurada`);
    }

    const config: SSHConfig = {
      host: this.device.management.ip,
      username: this.device.credentials?.username || 'admin',
      port: this.device.ssh?.port || 22,
      readyTimeout: this.options.connectionTimeoutMs,
    };

    // Obtener password (soporta variables de entorno)
    config.password = this.resolveEnvVar(this.device.credentials?.password || '');

    // Intentar conexión con retry
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        console.log(`🔌 Conectando a ${this.device.name} (${config.host}) - Intento ${attempt}/${this.options.maxRetries}...`);
        await this.ssh.connect(config);
        this.isConnected = true;
        console.log(`✅ Conectado a ${this.device.name}`);
        return;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        
        if (attempt === this.options.maxRetries) {
          throw new SSHConnectionError(
            `Failed to connect to ${this.device.name} after ${this.options.maxRetries} attempts: ${message}`,
            config.host,
            attempt
          );
        }

        console.log(`⏳ Reintentando en ${this.options.retryDelayMs}ms...`);
        await this.delay(this.options.retryDelayMs);
      }
    }
  }

  /**
   * Resuelve variables de entorno en formato ${VAR_NAME}
   */
  private resolveEnvVar(value: string): string {
    if (!value) return value;
    
    return value.replace(/\$\{(\w+)\}/g, (_, varName) => {
      const envValue = process.env[varName];
      if (envValue === undefined) {
        throw new Error(
          `Environment variable ${varName} not set (referenced in SSH config for ${this.device.name})`
        );
      }
      return envValue;
    });
  }

  /**
   * Helper para delay con Promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Ejecuta un comando en el dispositivo
   */
  public async execCommand(command: string, options?: SSHExecCommandOptions): Promise<SSHExecCommandResponse> {
    if (!this.isConnected) {
      throw new Error('No hay conexión SSH activa');
    }

    return await this.ssh.execCommand(command, options);
  }

  /**
   * Ejecuta múltiples comandos (configuración) con cleanup garantizado
   */
  public async execCommands(commands: string[], timeout?: number): Promise<ConnectionResult> {
    if (!this.isConnected) {
      return { success: false, error: 'No hay conexión SSH activa' };
    }

    const actualTimeout = timeout ?? this.options.commandTimeoutMs;

    try {
      // Entrar en modo configuración
      await this.execCommand('configure terminal');

      try {
        // Ejecutar comandos
        const results: string[] = [];
        for (const command of commands) {
          const result = await this.ssh.execCommand(command, {
            execOptions: { timeout: actualTimeout },
          });

          if (result.code !== 0 || result.stderr.includes('% Invalid input')) {
            throw new SSHCommandError(
              `IOS rejected command: ${command}`,
              command,
              result.stderr || result.stdout
            );
          }

          if (result.stdout.includes('%')) {
            console.log(`⚠️  ${this.device.name}: ${result.stdout.trim()}`);
          }

          results.push(result.stdout);
        }

        return {
          success: true,
          output: results.join('\n')
        };
      } finally {
        // SIEMPRE salir de config mode, incluso si hubo error
        try {
          await this.ssh.execCommand('end');
        } catch {
          // Best effort — si "end" falla, no ocultar el error original
        }
      }
    } catch (error) {
      if (error instanceof SSHCommandError) {
        return {
          success: false,
          error: error.message
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Guarda la configuración en NVRAM
   */
  public async saveConfig(): Promise<ConnectionResult> {
    if (!this.isConnected) {
      return { success: false, error: 'No hay conexión SSH activa' };
    }

    try {
      console.log(`💾 Guardando configuración en ${this.device.name}...`);
      const result = await this.ssh.execCommand('write memory');

      if (result.code === 0 && result.stdout.includes('[OK]')) {
        console.log(`✅ Configuración guardada en ${this.device.name}`);
        return { success: true };
      } else {
        return {
          success: false,
          error: result.stderr || result.stdout
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Obtiene el estado de una interfaz
   */
  public async getInterfaceStatus(interfaceName: string): Promise<ConnectionResult> {
    const result = await this.execCommand(`show interfaces ${interfaceName}`);
    return {
      success: result.code === 0,
      output: result.stdout,
      error: result.stderr
    };
  }

  /**
   * Verifica la tabla de enrutamiento
   */
  public async getRoutingTable(): Promise<ConnectionResult> {
    const result = await this.execCommand('show ip route');
    return {
      success: result.code === 0,
      output: result.stdout,
      error: result.stderr
    };
  }

  /**
   * Verifica VLANs configuradas
   */
  public async getVLANs(): Promise<ConnectionResult> {
    const result = await this.execCommand('show vlan brief');
    return {
      success: result.code === 0,
      output: result.stdout,
      error: result.stderr
    };
  }

  /**
   * Verifica vecinos OSPF
   */
  public async getOSPFNeighbors(): Promise<ConnectionResult> {
    const result = await this.execCommand('show ip ospf neighbor');
    return {
      success: result.code === 0,
      output: result.stdout,
      error: result.stderr
    };
  }

  /**
   * Cierra la conexión SSH
   */
  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        this.ssh.dispose();
      } catch {
        // Best effort cleanup
      }
      this.isConnected = false;
      console.log(`🔌 Desconectado de ${this.device.name}`);
    }
  }

  /**
   * Verifica si hay conexión activa
   */
  public isConnectedToDevice(): boolean {
    return this.isConnected;
  }

  /**
   * Ejecuta una función con la conexión SSH, garantizando cleanup
   * Pattern: "using" / "try-with-resources"
   */
  static async withConnection<T>(
    device: Device,
    fn: (connector: SSHConnector) => Promise<T>,
    options?: SSHConnectorOptions
  ): Promise<T> {
    const connector = new SSHConnector(device, options);
    await connector.connect();

    try {
      return await fn(connector);
    } finally {
      await connector.disconnect();
    }
  }
}

/**
 * Ejecuta una función en múltiples dispositivos en paralelo
 */
export async function executeInParallel<T>(
  devices: Device[],
  operation: (connector: SSHConnector) => Promise<T>,
  maxConcurrency: number = 5
): Promise<Map<string, T | Error>> {
  const results = new Map<string, T | Error>();

  // Procesar en lotes para controlar la concurrencia
  for (let i = 0; i < devices.length; i += maxConcurrency) {
    const batch = devices.slice(i, i + maxConcurrency);
    const batchPromises = batch.map(async (device) => {
      const connector = new SSHConnector(device);
      try {
        await connector.connect();
        const result = await operation(connector);
        results.set(device.name, result);
      } catch (error) {
        results.set(device.name, error instanceof Error ? error : new Error(String(error)));
      } finally {
        await connector.disconnect();
      }
    });

    await Promise.all(batchPromises);
  }

  return results;
}