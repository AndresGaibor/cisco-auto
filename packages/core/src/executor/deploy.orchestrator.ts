/**
 * ORQUESTADOR DE DESPLIEGUE
 * Coordina el despliegue de configuraciones a múltiples dispositivos
 */

import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { DeviceSpec, LabSpec } from '../canonical';
import type {
  ConnectionCredentials,
  DeployOptions,
  DeployResult,
  DeviceDeployResult,
  DeployError,
  CommandResult,
  DeployPlan
} from './types';
import { DeployErrorCode } from './types';
import { SSHConnector } from '../connector/ssh-connector';
import type { Device } from '@cisco-auto/types';

/**
 * Convierte DeviceSpec a Device para compatibilidad con SSHConnector
 */
function deviceSpecToDevice(spec: DeviceSpec, credentials?: ConnectionCredentials): Device {
  return {
    name: spec.name,
    type: spec.type as any,
    management: spec.managementIp ? {
      ip: spec.managementIp,
      subnetMask: spec.managementMask || '255.255.255.0',
      vlan: 1,
      gateway: spec.defaultGateway
    } : undefined,
    credentials: credentials ? {
      username: credentials.username,
      password: credentials.password
    } : undefined,
    interfaces: spec.interfaces?.map(i => ({
      name: i.name,
      description: i.description,
      ip: i.ip,
      mode: i.switchportMode as any,
      vlan: i.vlan,
      shutdown: i.shutdown,
      enabled: !i.shutdown,
      duplex: 'auto' as const,
      speed: 'auto' as const,
      type: 'gigabitethernet' as const
    })) || []
  } as Device;
}

/**
 * Resultado de extracción de comandos
 */
interface GeneratedConfig {
  lines: string[];
  sections: Record<string, string[]>;
}

export class DeployOrchestrator {
  private options: DeployOptions;

  constructor(options: Partial<DeployOptions> = {}) {
    this.options = {
      dryRun: false,
      concurrency: 5,
      commandTimeout: 30000,
      connectionTimeout: 30000,
      validateAfter: true,
      autoRollback: false,
      saveBackup: true,
      continueOnError: true,
      verbose: false,
      ...options
    };
  }

  /**
   * Despliega un laboratorio completo
   */
  async deployLab(
    lab: LabSpec,
    getCredentials: (device: DeviceSpec) => ConnectionCredentials | null
  ): Promise<DeployResult> {
    const startTime = new Date();
    const results: DeviceDeployResult[] = [];
    const globalErrors: DeployError[] = [];

    // Crear plan de despliegue
    const plan = this.createDeployPlan(lab);

    // Crear directorio de backups si es necesario
    if (this.options.saveBackup && this.options.backupDir) {
      if (!existsSync(this.options.backupDir)) {
        await mkdir(this.options.backupDir, { recursive: true });
      }
    }

    // Desplegar por lotes según el plan
    for (const batch of plan.order) {
      if (this.options.verbose) {
        console.log(`\n📦 Desplegando lote: ${batch.join(', ')}`);
      }

      const batchDevices = lab.devices.filter(d => batch.includes(d.name));
      
      // Procesar lote en paralelo
      const batchResults = await Promise.all(
        batchDevices.map(device => this.deployDevice(device, getCredentials(device)))
      );

      results.push(...batchResults);

      // Verificar si debemos continuar
      const failedInBatch = batchResults.filter(r => !r.success);
      if (failedInBatch.length > 0 && !this.options.continueOnError) {
        globalErrors.push({
          code: DeployErrorCode.CONFIGURATION_ERROR,
          message: `Deployment stopped due to failures in batch`,
          recoverable: false
        });
        break;
      }
    }

    const endTime = new Date();

    return {
      success: results.every(r => r.success),
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      devices: results,
      summary: {
        total: lab.devices.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success && r.errors.length > 0).length,
        skipped: results.filter(r => !r.success && r.errors.length === 0).length
      },
      globalErrors
    };
  }

  /**
   * Despliega un solo dispositivo
   */
  async deployDevice(
    device: DeviceSpec,
    credentials: ConnectionCredentials | null
  ): Promise<DeviceDeployResult> {
    const startTime = new Date();
    const commands: CommandResult[] = [];
    const errors: DeployError[] = [];
    const warnings: string[] = [];

    // Generar configuración
    const configGenerated = this.generateConfig(device);

    // Si no hay credenciales, saltar
    if (!credentials) {
      return {
        deviceName: device.name,
        deviceType: device.type,
        success: false,
        startTime,
        endTime: new Date(),
        duration: 0,
        commands: [],
        configGenerated: configGenerated.join('\n'),
        errors: [],
        warnings: ['No credentials provided - skipped']
      };
    }

    // Modo dry-run
    if (this.options.dryRun) {
      return {
        deviceName: device.name,
        deviceType: device.type,
        success: true,
        startTime,
        endTime: new Date(),
        duration: 0,
        commands: [],
        configGenerated: configGenerated.join('\n'),
        errors: [],
        warnings: ['Dry run - no changes made']
      };
    }

    // Despliegue real
    const deviceForConnector = deviceSpecToDevice(device, credentials);
    const connector = new SSHConnector(deviceForConnector);

    try {
      // Conectar
      if (this.options.verbose) {
        console.log(`🔌 Conectando a ${device.name}...`);
      }
      
      await connector.connect();

      // Backup
      if (this.options.saveBackup) {
        await this.saveBackup(connector, device.name);
      }

      // Extraer comandos de configuración
      const configCommands = this.extractConfigCommands(configGenerated);

      // Desplegar configuración
      const deployResult = await connector.execCommands(configCommands, this.options.commandTimeout);

      if (!deployResult.success) {
        errors.push({
          code: DeployErrorCode.COMMAND_FAILED,
          message: deployResult.error || 'Command execution failed',
          recoverable: true
        });
      }

      // Guardar configuración
      if (errors.length === 0) {
        const saveResult = await connector.saveConfig();
        if (!saveResult.success) {
          warnings.push(`Failed to save config: ${saveResult.error}`);
        }
      }

    } catch (error) {
      const err = error as Error;
      errors.push({
        code: DeployErrorCode.CONNECTION_FAILED,
        message: err.message ?? 'Connection failed',
        recoverable: false
      });

      // Rollback si está habilitado
      if (this.options.autoRollback && this.options.backupDir) {
        try {
          await this.rollback(connector, device.name);
          warnings.push('Rollback executed');
        } catch (rollbackError) {
          const rollbackErr = rollbackError as Error;
          errors.push({
            code: DeployErrorCode.ROLLBACK_FAILED,
            message: rollbackErr.message,
            recoverable: false
          });
        }
      }
    } finally {
      await connector.disconnect();
    }

    const endTime = new Date();

    return {
      deviceName: device.name,
      deviceType: device.type,
      success: errors.length === 0,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      commands,
      configGenerated: configGenerated.join('\n'),
      errors,
      warnings
    };
  }

  /**
   * Genera configuración para un dispositivo
   */
  private generateConfig(device: DeviceSpec): string[] {
    // Generar configuración básica directamente
    const lines: string[] = [];
    lines.push('!');
    lines.push(`! Configuration for ${device.name}`);
    lines.push('!');
    
    if (device.interfaces) {
      for (const iface of device.interfaces) {
        lines.push(`interface ${iface.name}`);
        if (iface.description) {
          lines.push(` description ${iface.description}`);
        }
        if (iface.ip) {
          const [ip, cidr] = iface.ip.split('/');
          lines.push(` ip address ${ip} 255.255.255.0`);
        }
        lines.push(' no shutdown');
        lines.push(' exit');
      }
    }
    
    lines.push('end');
    return lines;
  }

  /**
   * Extrae comandos de configuración de las líneas generadas
   */
  private extractConfigCommands(lines: string[]): string[] {
    return lines.filter(line =>
      !line.startsWith('!') &&
      line.trim() !== '' &&
      !line.startsWith('end') &&
      line !== 'configure terminal'
    );
  }

  /**
   * Guarda backup de la configuración actual
   */
  private async saveBackup(connector: SSHConnector, deviceName: string): Promise<void> {
    if (!this.options.backupDir) return;

    try {
      const result = await connector.execCommand('show running-config');
      
      if (result.code === 0) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = join(this.options.backupDir, `${deviceName}-${timestamp}.cfg`);
        await writeFile(backupFile, result.stdout, 'utf-8');
        
        if (this.options.verbose) {
          console.log(`💾 Backup guardado: ${backupFile}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ No se pudo guardar backup de ${deviceName}`);
    }
  }

  /**
   * Ejecuta rollback desde backup
   */
  private async rollback(connector: SSHConnector, deviceName: string): Promise<void> {
    // Buscar el backup más reciente
    const { readdir } = require('fs/promises');
    const backupDir = this.options.backupDir!;
    
    const files = await readdir(backupDir);
    const deviceBackups = files
      .filter((f: string) => f.startsWith(deviceName))
      .sort()
      .reverse();

    if (deviceBackups.length > 0) {
      const backupFile = join(backupDir, deviceBackups[0]);
      const { readFile } = require('fs/promises');
      const backupConfig = await readFile(backupFile, 'utf-8');
      
      // Aplicar configuración de backup
      const lines = backupConfig.split('\n').filter((l: string) => 
        !l.startsWith('!') && l.trim() !== '' && !l.startsWith('end')
      );
      
      await connector.execCommands(lines, this.options.commandTimeout);
      await connector.saveConfig();
    }
  }

  /**
   * Crea plan de despliegue basado en topología
   */
  createDeployPlan(lab: LabSpec): DeployPlan {
    const dependencies = new Map<string, string[]>();
    
    // Construir grafo de dependencias
    for (const conn of lab.connections) {
      const fromDevice = conn.from.deviceName;
      const toDevice = conn.to.deviceName;
      
      if (!dependencies.has(fromDevice)) {
        dependencies.set(fromDevice, []);
      }
      if (!dependencies.has(toDevice)) {
        dependencies.set(toDevice, []);
      }
      
      // El dispositivo que recibe conexión depende del que la envía
      // (ej: un PC depende de su switch)
      const toType = lab.devices.find(d => d.name === toDevice)?.type;
      const fromType = lab.devices.find(d => d.name === fromDevice)?.type;
      
      // Los end devices dependen de los switches/routers
      if (toType === 'pc' || toType === 'laptop' || toType === 'server' || toType === 'printer') {
        dependencies.get(toDevice)!.push(fromDevice);
      } else if (fromType === 'pc' || fromType === 'laptop' || fromType === 'server' || fromType === 'printer') {
        dependencies.get(fromDevice)!.push(toDevice);
      }
    }

    // Ordenamiento topológico para encontrar orden de despliegue
    const order: string[][] = [];
    const deployed = new Set<string>();
    const remaining = new Set(lab.devices.map(d => d.name));

    while (remaining.size > 0) {
      const batch: string[] = [];
      
      for (const deviceName of remaining) {
        const deps = dependencies.get(deviceName) || [];
        const allDepsDeployed = deps.every(d => deployed.has(d));
        
        if (allDepsDeployed) {
          batch.push(deviceName);
        }
      }

      if (batch.length === 0) {
        // Si no hay progreso, añadir los restantes (posible ciclo)
        batch.push(...remaining);
      }

      order.push(batch);
      
      for (const deviceName of batch) {
        deployed.add(deviceName);
        remaining.delete(deviceName);
      }
    }

    return {
      order,
      parallel: true,
      dependencies
    };
  }
}

/**
 * Despliega a un solo dispositivo
 */
export async function deployToDevice(
  device: DeviceSpec,
  credentials: ConnectionCredentials,
  options: Partial<DeployOptions> = {}
): Promise<DeviceDeployResult> {
  const orchestrator = new DeployOrchestrator(options);
  return orchestrator.deployDevice(device, credentials);
}
