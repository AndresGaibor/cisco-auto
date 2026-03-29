/**
 * Módulo de conexión SSH para dispositivos Cisco
 * Usa node-ssh (wrapper de ssh2)
 */

import { NodeSSH } from 'node-ssh';
import type { Config as SSHConfig, SSHExecCommandOptions, SSHExecCommandResponse } from 'node-ssh';
import type { Device } from '../types/index.ts';

export interface ConnectionResult {
  success: boolean;
  output?: string;
  error?: string;
}

export class SSHConnector {
  private ssh: NodeSSH;
  private device: Device;
  private isConnected: boolean = false;

  constructor(device: Device) {
    this.ssh = new NodeSSH();
    this.device = device;
  }

  /**
   * Conecta al dispositivo via SSH
   */
  public async connect(): Promise<void> {
    if (!this.device.management?.ip) {
      throw new Error(`Dispositivo ${this.device.name} no tiene IP de management configurada`);
    }

    const config: SSHConfig = {
      host: this.device.management.ip,
      username: this.device.credentials?.username || 'admin',
      port: this.device.ssh?.port || 22,
    };

    // Obtener password (soporta variables de entorno)
    const password = this.device.credentials?.password || '';
    if (password.startsWith('${') && password.endsWith('}')) {
      const envVar = password.slice(2, -1);
      config.password = process.env[envVar];
      if (!config.password) {
        throw new Error(`Variable de entorno ${envVar} no definida`);
      }
    } else {
      config.password = password;
    }

    // Intentar conexión con retry
    const maxRetries = 3;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔌 Conectando a ${this.device.name} (${config.host}) - Intento ${attempt}/${maxRetries}...`);
        await this.ssh.connect(config);
        this.isConnected = true;
        console.log(`✅ Conectado a ${this.device.name}`);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries) {
          console.log(`⏳ Reintentando en 2 segundos...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    throw new Error(`No se pudo conectar a ${this.device.name}: ${lastError?.message}`);
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
   * Ejecuta múltiples comandos (configuración)
   */
  public async execCommands(commands: string[], timeout: number = 30000): Promise<ConnectionResult> {
    if (!this.isConnected) {
      return { success: false, error: 'No hay conexión SSH activa' };
    }

    try {
      // Entrar en modo configuración
      const configCommands = ['configure terminal', ...commands, 'end'];
      const fullCommand = configCommands.join('\n');

      const result = await this.ssh.execCommand(fullCommand, {
        execOptions: { timeout },
        onStdout: (chunk) => {
          const output = chunk.toString('utf8');
          if (output.includes('%')) {
            console.log(`⚠️  ${this.device.name}: ${output.trim()}`);
          }
        },
        onStderr: (chunk) => {
          console.error(`❌ ${this.device.name} (stderr): ${chunk.toString('utf8').trim()}`);
        }
      });

      if (result.code !== 0) {
        return {
          success: false,
          error: result.stderr || `Código de salida: ${result.code}`
        };
      }

      return {
        success: true,
        output: result.stdout
      };
    } catch (error) {
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
      this.ssh.dispose();
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