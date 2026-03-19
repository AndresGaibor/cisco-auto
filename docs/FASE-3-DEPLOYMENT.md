# Fase 3: Motor de Despliegue

> **Estado:** ✅ COMPLETADO  
> **Tests:** 10 tests (executor)  
> **Dependencias:** Fase 0, Fase 1 y Fase 2 completadas

## Objetivo

Implementar despliegue real de configuraciones a dispositivos Cisco via SSH/Telnet, con validación de conectividad, manejo de errores y ejecución paralela.

---

## Estado Actual

```typescript
// src/cli/commands/deploy.ts (actual)
export function createDeployCommand(): Command {
  return new Command('deploy')
    .description('Deploy configurations to devices')
    .option('-f, --file <path>', 'Lab YAML file', 'lab.yaml')
    .option('--dry-run', 'Show commands without executing', false)
    .action(async (options) => {
      if (options.dryRun) {
        // Solo muestra las configuraciones generadas
        // ...
        return;
      }
      
      // ❌ NO IMPLEMENTADO
      console.error('Esta funcion requiere implementacion del modulo SSH');
      process.exit(1);
    });
}
```

---

## Arquitectura Objetivo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Deploy Command                                  │
│                           /src/cli/commands/deploy.ts                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Deploy Orchestrator                               │
│                    /src/core/executor/deploy.orchestrator.ts                 │
│                                                                              │
│  - Parse lab file                                                            │
│  - Generate configs                                                          │
│  - Plan deployment order (topology-aware)                                    │
│  - Execute deployment                                                        │
│  - Validate results                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│    SSH Executor      │   │   Telnet Executor    │   │ Validation Executor  │
│  /src/core/executor/ │   │  /src/core/executor/ │   │  /src/core/executor/ │
│    ssh.executor.ts   │   │  telnet.executor.ts  │   │ validation.executor  │
│                      │   │                      │   │         .ts          │
│  - Connect           │   │  - Connect           │   │  - Ping test         │
│  - Send commands     │   │  - Send commands     │   │  - Interface status  │
│  - Parse output      │   │  - Parse output      │   │  - Route validation  │
│  - Handle errors     │   │  - Handle errors     │   │  - Protocol check    │
└──────────────────────┘   └──────────────────────┘   └──────────────────────┘
              │                       │                       │
              └───────────────────────┼───────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Batch Executor                                   │
│                    /src/core/executor/batch.executor.ts                      │
│                                                                              │
│  - Parallel execution (configurable concurrency)                             │
│  - Progress tracking                                                         │
│  - Error aggregation                                                         │
│  - Rollback support                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Estructura de Directorios

```
src/core/executor/
├── index.ts
├── types.ts                        # Tipos compartidos
├── connection.interface.ts         # Interface para executors
├── ssh.executor.ts                 # Executor SSH
├── telnet.executor.ts              # Executor Telnet
├── validation.executor.ts          # Validación de despliegue
├── batch.executor.ts               # Ejecución paralela
├── rollback.executor.ts            # Rollback de cambios
└── deploy.orchestrator.ts          # Orquestador principal
```

---

## Tareas Detalladas

### Tarea 3.1: Tipos y Interfaces Base

**Archivo:** `src/core/executor/types.ts`

```typescript
// src/core/executor/types.ts

import type { DeviceSpec } from '../canonical/device.spec';

/**
 * Credenciales de conexión
 */
export interface ConnectionCredentials {
  host: string;
  port?: number;
  username: string;
  password: string;
  enablePassword?: string;
  sshKey?: string;
  sshKeyPassphrase?: string;
}

/**
 * Resultado de conexión
 */
export interface ConnectionResult {
  success: boolean;
  error?: string;
  deviceName?: string;
  connectionTime?: number;
}

/**
 * Resultado de ejecución de comando
 */
export interface CommandResult {
  command: string;
  output: string;
  exitCode?: number;
  success: boolean;
  error?: string;
  duration: number;  // ms
}

/**
 * Resultado de despliegue de dispositivo
 */
export interface DeviceDeployResult {
  deviceName: string;
  deviceType: string;
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;  // ms
  
  /** Comandos ejecutados */
  commands: CommandResult[];
  
  /** Configuración generada */
  configGenerated: string;
  
  /** Errores encontrados */
  errors: DeployError[];
  
  /** Warnings */
  warnings: string[];
  
  /** Estado de validación post-deploy */
  validation?: ValidationResult;
}

/**
 * Error de despliegue
 */
export interface DeployError {
  code: DeployErrorCode;
  message: string;
  command?: string;
  output?: string;
  recoverable: boolean;
}

export enum DeployErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  COMMAND_FAILED = 'COMMAND_FAILED',
  TIMEOUT = 'TIMEOUT',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  ROLLBACK_FAILED = 'ROLLBACK_FAILED',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Resultado de validación
 */
export interface ValidationResult {
  passed: boolean;
  checks: ValidationCheck[];
}

export interface ValidationCheck {
  name: string;
  type: 'ping' | 'interface' | 'routing' | 'vlan' | 'acl';
  target: string;
  expected: string | boolean;
  actual: string | boolean;
  passed: boolean;
  message?: string;
}

/**
 * Resultado completo del despliegue
 */
export interface DeployResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;  // ms
  
  /** Resultados por dispositivo */
  devices: DeviceDeployResult[];
  
  /** Resumen */
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  
  /** Errores globales */
  globalErrors: DeployError[];
}

/**
 * Opciones de despliegue
 */
export interface DeployOptions {
  /** Ejecutar sin hacer cambios reales */
  dryRun: boolean;
  
  /** Concurrency máxima */
  concurrency: number;
  
  /** Timeout por comando (ms) */
  commandTimeout: number;
  
  /** Timeout de conexión (ms) */
  connectionTimeout: number;
  
  /** Validar después del despliegue */
  validateAfter: boolean;
  
  /** Rollback automático en error */
  autoRollback: boolean;
  
  /** Guardar backup antes de despliegue */
  saveBackup: boolean;
  
  /** Directorio de backups */
  backupDir?: string;
  
  /** Continuar con otros dispositivos si uno falla */
  continueOnError: boolean;
  
  /** Verbosity */
  verbose: boolean;
}

/**
 * Interface para executors
 */
export interface IExecutor {
  connect(credentials: ConnectionCredentials): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  sendCommand(command: string, timeout?: number): Promise<CommandResult>;
  sendCommands(commands: string[], timeout?: number): Promise<CommandResult[]>;
  configure(commands: string[]): Promise<CommandResult[]>;
  isConnected(): boolean;
}
```

---

### Tarea 3.2: SSH Executor

**Archivo:** `src/core/executor/ssh.executor.ts`

```typescript
// src/core/executor/ssh.executor.ts

import { NodeSSH } from 'node-ssh';
import type { 
  IExecutor, 
  ConnectionCredentials, 
  ConnectionResult, 
  CommandResult 
} from './types';

export class SSHExecutor implements IExecutor {
  private ssh: NodeSSH;
  private connected: boolean = false;
  private inConfigMode: boolean = false;
  private devicePrompt: string = '#';
  
  constructor() {
    this.ssh = new NodeSSH();
  }
  
  async connect(credentials: ConnectionCredentials): Promise<ConnectionResult> {
    const startTime = Date.now();
    
    try {
      // Configuración de conexión
      const config: any = {
        host: credentials.host,
        port: credentials.port || 22,
        username: credentials.username
      };
      
      if (credentials.sshKey) {
        config.privateKey = credentials.sshKey;
        if (credentials.sshKeyPassphrase) {
          config.passphrase = credentials.sshKeyPassphrase;
        }
      } else {
        config.password = credentials.password;
      }
      
      await this.ssh.connect(config);
      this.connected = true;
      
      // Detectar el prompt del dispositivo
      await this.detectPrompt();
      
      // Entrar en modo enable si es necesario
      if (credentials.enablePassword) {
        await this.enterEnableMode(credentials.enablePassword);
      }
      
      return {
        success: true,
        connectionTime: Date.now() - startTime
      };
    } catch (error: any) {
      this.connected = false;
      return {
        success: false,
        error: error.message || 'Connection failed'
      };
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.connected) {
      try {
        await this.ssh.dispose();
      } finally {
        this.connected = false;
        this.inConfigMode = false;
      }
    }
  }
  
  async sendCommand(command: string, timeout: number = 30000): Promise<CommandResult> {
    if (!this.connected) {
      return {
        command,
        output: '',
        success: false,
        error: 'Not connected',
        duration: 0
      };
    }
    
    const startTime = Date.now();
    
    try {
      // Enviar comando y esperar el prompt
      const result = await this.ssh.execCommand(command, {
        execOptions: {
          timeout
        }
      });
      
      const duration = Date.now() - startTime;
      
      // Determinar si fue exitoso
      const success = result.stderr === '' || this.isSuccessOutput(result.stdout);
      
      return {
        command,
        output: result.stdout,
        exitCode: result.code || 0,
        success,
        duration
      };
    } catch (error: any) {
      return {
        command,
        output: '',
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }
  
  async sendCommands(commands: string[], timeout: number = 30000): Promise<CommandResult[]> {
    const results: CommandResult[] = [];
    
    for (const command of commands) {
      const result = await this.sendCommand(command, timeout);
      results.push(result);
      
      // Si un comando falla y no es recuperable, detener
      if (!result.success && this.isCriticalError(result.output)) {
        break;
      }
    }
    
    return results;
  }
  
  async configure(commands: string[]): Promise<CommandResult[]> {
    const results: CommandResult[] = [];
    
    try {
      // Entrar en modo configuración
      await this.enterConfigMode();
      
      // Enviar comandos de configuración
      for (const command of commands) {
        const result = await this.sendCommand(command);
        results.push(result);
      }
      
      // Salir del modo configuración
      await this.exitConfigMode();
      
    } catch (error: any) {
      // Intentar salir del modo config si hay error
      try {
        await this.exitConfigMode();
      } catch {}
      
      throw error;
    }
    
    return results;
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  private async detectPrompt(): Promise<void> {
    // Enviar enter y detectar el prompt
    const result = await this.ssh.execCommand('\n');
    const output = result.stdout;
    
    // Detectar tipo de prompt (# para enable, > para user)
    if (output.includes('#')) {
      this.devicePrompt = '#';
    } else if (output.includes('>')) {
      this.devicePrompt = '>';
    }
  }
  
  private async enterEnableMode(enablePassword: string): Promise<void> {
    const result = await this.sendCommand('enable');
    
    if (result.output.includes('Password:')) {
      await this.sendCommand(enablePassword);
    }
    
    this.devicePrompt = '#';
  }
  
  private async enterConfigMode(): Promise<void> {
    if (!this.inConfigMode) {
      await this.sendCommand('configure terminal');
      this.inConfigMode = true;
    }
  }
  
  private async exitConfigMode(): Promise<void> {
    if (this.inConfigMode) {
      await this.sendCommand('end');
      this.inConfigMode = false;
    }
  }
  
  private isSuccessOutput(output: string): boolean {
    // Indicadores de error en IOS
    const errorPatterns = [
      /Invalid input/i,
      /Incomplete command/i,
      /Ambiguous command/i,
      /Error:/i,
      /%/
    ];
    
    return !errorPatterns.some(pattern => pattern.test(output));
  }
  
  private isCriticalError(output: string): boolean {
    const criticalPatterns = [
      /Invalid input/i,
      /Incomplete command/i
    ];
    
    return criticalPatterns.some(pattern => pattern.test(output));
  }
}
```

---

### Tarea 3.3: Validation Executor

**Archivo:** `src/core/executor/validation.executor.ts`

```typescript
// src/core/executor/validation.executor.ts

import type { IExecutor, ValidationResult, ValidationCheck, ConnectionCredentials } from './types';
import { SSHExecutor } from './ssh.executor';

export interface ValidationSpec {
  /** Ping tests */
  ping?: {
    source: string;
    destination: string;
    expected: boolean;
  }[];
  
  /** Interface status checks */
  interfaces?: {
    device: string;
    interface: string;
    expectedStatus: 'up' | 'down';
  }[];
  
  /** VLAN checks */
  vlans?: {
    device: string;
    vlanId: number;
    expectedName?: string;
    expectedInterfaces?: string[];
  }[];
  
  /** Routing checks */
  routing?: {
    device: string;
    destination: string;
    expectedNextHop?: string;
    expectedInterface?: string;
  }[];
}

export class ValidationExecutor {
  private executor: IExecutor;
  
  constructor(executor?: IExecutor) {
    this.executor = executor || new SSHExecutor();
  }
  
  /**
   * Ejecuta validación completa
   */
  async validate(
    credentials: ConnectionCredentials,
    spec: ValidationSpec
  ): Promise<ValidationResult> {
    const checks: ValidationCheck[] = [];
    
    // Conectar
    const connectResult = await this.executor.connect(credentials);
    if (!connectResult.success) {
      return {
        passed: false,
        checks: [{
          name: 'Connection',
          type: 'interface',
          target: credentials.host,
          expected: true,
          actual: false,
          passed: false,
          message: connectResult.error
        }]
      };
    }
    
    try {
      // Ejecutar checks
      if (spec.ping) {
        checks.push(...await this.runPingChecks(spec.ping));
      }
      
      if (spec.interfaces) {
        checks.push(...await this.runInterfaceChecks(spec.interfaces));
      }
      
      if (spec.vlans) {
        checks.push(...await this.runVlanChecks(spec.vlans));
      }
      
      if (spec.routing) {
        checks.push(...await this.runRoutingChecks(spec.routing));
      }
      
      return {
        passed: checks.every(c => c.passed),
        checks
      };
    } finally {
      await this.executor.disconnect();
    }
  }
  
  private async runPingChecks(
    pings: ValidationSpec['ping']
  ): Promise<ValidationCheck[]> {
    const checks: ValidationCheck[] = [];
    
    for (const ping of pings || []) {
      const result = await this.executor.sendCommand(`ping ${ping.destination}`);
      
      const passed = ping.expected 
        ? result.output.includes('!!!!') || result.output.includes('Success')
        : !result.output.includes('!!!!') && !result.output.includes('Success');
      
      checks.push({
        name: `Ping ${ping.source} -> ${ping.destination}`,
        type: 'ping',
        target: ping.destination,
        expected: ping.expected ? 'Success' : 'Failure',
        actual: result.output.includes('!!!!') ? 'Success' : 'Failure',
        passed
      });
    }
    
    return checks;
  }
  
  private async runInterfaceChecks(
    interfaces: ValidationSpec['interfaces']
  ): Promise<ValidationCheck[]> {
    const checks: ValidationCheck[] = [];
    
    for (const iface of interfaces || []) {
      const result = await this.executor.sendCommand(
        `show interface ${iface.interface}`
      );
      
      const isUp = result.output.includes(`${iface.interface} is up`) ||
                   result.output.includes('line protocol is up');
      
      const passed = iface.expectedStatus === 'up' ? isUp : !isUp;
      
      checks.push({
        name: `Interface ${iface.interface} status`,
        type: 'interface',
        target: iface.interface,
        expected: iface.expectedStatus,
        actual: isUp ? 'up' : 'down',
        passed
      });
    }
    
    return checks;
  }
  
  private async runVlanChecks(
    vlans: ValidationSpec['vlans']
  ): Promise<ValidationCheck[]> {
    const checks: ValidationCheck[] = [];
    
    for (const vlan of vlans || []) {
      const result = await this.executor.sendCommand(
        `show vlan brief | include ${vlan.vlanId}`
      );
      
      let passed = result.output.includes(String(vlan.vlanId));
      
      if (passed && vlan.expectedName) {
        passed = result.output.includes(vlan.expectedName);
      }
      
      checks.push({
        name: `VLAN ${vlan.vlanId}`,
        type: 'vlan',
        target: String(vlan.vlanId),
        expected: vlan.expectedName || `VLAN ${vlan.vlanId} exists`,
        actual: result.output.trim() || 'Not found',
        passed
      });
    }
    
    return checks;
  }
  
  private async runRoutingChecks(
    routes: ValidationSpec['routing']
  ): Promise<ValidationCheck[]> {
    const checks: ValidationCheck[] = [];
    
    for (const route of routes || []) {
      const result = await this.executor.sendCommand(
        `show ip route ${route.destination}`
      );
      
      let passed = result.output.includes(route.destination);
      
      if (passed && route.expectedNextHop) {
        passed = result.output.includes(route.expectedNextHop);
      }
      
      if (passed && route.expectedInterface) {
        passed = result.output.includes(route.expectedInterface);
      }
      
      checks.push({
        name: `Route to ${route.destination}`,
        type: 'routing',
        target: route.destination,
        expected: route.expectedNextHop || route.expectedInterface || 'Route exists',
        actual: result.output.trim() || 'No route',
        passed
      });
    }
    
    return checks;
  }
}
```

---

### Tarea 3.4: Batch Executor (Paralelismo)

**Archivo:** `src/core/executor/batch.executor.ts`

```typescript
// src/core/executor/batch.executor.ts

import pMap from 'p-map';
import type { 
  DeviceSpec 
} from '../canonical/device.spec';
import type {
  ConnectionCredentials,
  DeviceDeployResult,
  DeployOptions,
  DeployResult,
  DeployError,
  DeployErrorCode
} from './types';
import { SSHExecutor } from './ssh.executor';
import { IOSGenerator } from '../generators/ios/ios-generator';
import { ValidationExecutor } from './validation.executor';

export class BatchExecutor {
  private options: DeployOptions;
  
  constructor(options: Partial<DeployOptions> = {}) {
    this.options = {
      dryRun: false,
      concurrency: 5,
      commandTimeout: 30000,
      connectionTimeout: 30000,
      validateAfter: true,
      autoRollback: true,
      saveBackup: true,
      continueOnError: true,
      verbose: false,
      ...options
    };
  }
  
  /**
   * Ejecuta despliegue en paralelo
   */
  async deployAll(
    devices: DeviceSpec[],
    getCredentials: (device: DeviceSpec) => ConnectionCredentials | null
  ): Promise<DeployResult> {
    const startTime = new Date();
    const results: DeviceDeployResult[] = [];
    const globalErrors: DeployError[] = [];
    
    // Filtrar dispositivos con credenciales
    const devicesWithCreds = devices.filter(d => {
      const creds = getCredentials(d);
      if (!creds) {
        results.push(this.createSkippedResult(d, 'No credentials provided'));
        return false;
      }
      return true;
    });
    
    if (this.options.dryRun) {
      // Solo generar configuraciones
      for (const device of devicesWithCreds) {
        results.push(this.generateDryRunResult(device));
      }
    } else {
      // Desplegar en paralelo
      const deployResults = await pMap(
        devicesWithCreds,
        device => this.deployDevice(device, getCredentials(device)!),
        { 
          concurrency: this.options.concurrency,
          stopOnError: !this.options.continueOnError
        }
      );
      
      results.push(...deployResults);
    }
    
    const endTime = new Date();
    
    return {
      success: results.every(r => r.success),
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      devices: results,
      summary: {
        total: devices.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success && r.errors.length > 0).length,
        skipped: results.filter(r => !r.success && r.errors.length === 0).length
      },
      globalErrors
    };
  }
  
  private async deployDevice(
    device: DeviceSpec,
    credentials: ConnectionCredentials
  ): Promise<DeviceDeployResult> {
    const startTime = new Date();
    const executor = new SSHExecutor();
    const commands: CommandResult[] = [];
    const errors: DeployError[] = [];
    const warnings: string[] = [];
    
    // Generar configuración
    const generated = IOSGenerator.generate(device);
    const configLines = generated.lines;
    
    try {
      // Conectar
      const connectResult = await executor.connect(credentials);
      if (!connectResult.success) {
        errors.push({
          code: DeployErrorCode.CONNECTION_FAILED,
          message: connectResult.error || 'Connection failed',
          recoverable: false
        });
        
        return this.createFailedResult(device, startTime, commands, errors, warnings, configLines.join('\n'));
      }
      
      // Backup (si está habilitado)
      if (this.options.saveBackup) {
        await this.saveBackup(executor, device.name);
      }
      
      // Desplegar configuración
      const configCommands = this.extractConfigCommands(configLines);
      const configResults = await executor.configure(configCommands);
      commands.push(...configResults);
      
      // Verificar errores
      for (const result of configResults) {
        if (!result.success) {
          errors.push({
            code: DeployErrorCode.COMMAND_FAILED,
            message: result.error || 'Command failed',
            command: result.command,
            output: result.output,
            recoverable: true
          });
        }
      }
      
      // Validación post-deploy
      if (this.options.validateAfter && errors.length === 0) {
        const validator = new ValidationExecutor(executor);
        const validationResult = await validator.validate(credentials, {
          interfaces: device.interfaces.map(i => ({
            device: device.name,
            interface: i.name,
            expectedStatus: i.shutdown ? 'down' : 'up'
          }))
        });
        
        if (!validationResult.passed) {
          warnings.push(...validationResult.checks
            .filter(c => !c.passed)
            .map(c => c.message || `${c.name}: expected ${c.expected}, got ${c.actual}`));
        }
      }
      
    } catch (error: any) {
      errors.push({
        code: DeployErrorCode.UNKNOWN,
        message: error.message,
        recoverable: false
      });
      
      // Rollback si está habilitado
      if (this.options.autoRollback) {
        try {
          await this.rollback(executor, device.name);
        } catch (rollbackError: any) {
          errors.push({
            code: DeployErrorCode.ROLLBACK_FAILED,
            message: rollbackError.message,
            recoverable: false
          });
        }
      }
    } finally {
      await executor.disconnect();
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
      configGenerated: configLines.join('\n'),
      errors,
      warnings
    };
  }
  
  private extractConfigCommands(lines: string[]): string[] {
    return lines
      .filter(line => 
        !line.startsWith('!') && 
        line.trim() !== '' &&
        !line.startsWith('end')
      );
  }
  
  private async saveBackup(executor: SSHExecutor, deviceName: string): Promise<void> {
    const result = await executor.sendCommand('show running-config');
    
    if (result.success && this.options.backupDir) {
      const fs = await import('fs');
      const path = await import('path');
      
      const backupFile = path.join(
        this.options.backupDir,
        `${deviceName}-${new Date().toISOString().replace(/[:.]/g, '-')}.cfg`
      );
      
      await fs.promises.writeFile(backupFile, result.output, 'utf-8');
    }
  }
  
  private async rollback(executor: SSHExecutor, deviceName: string): Promise<void> {
    // Implementar rollback desde backup
    // Por ahora, solo reload config anterior
    await executor.sendCommand('configure replace flash:backup.cfg');
  }
  
  private createSkippedResult(device: DeviceSpec, reason: string): DeviceDeployResult {
    return {
      deviceName: device.name,
      deviceType: device.type,
      success: false,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      commands: [],
      configGenerated: '',
      errors: [],
      warnings: [reason]
    };
  }
  
  private createFailedResult(
    device: DeviceSpec,
    startTime: Date,
    commands: CommandResult[],
    errors: DeployError[],
    warnings: string[],
    configGenerated: string
  ): DeviceDeployResult {
    return {
      deviceName: device.name,
      deviceType: device.type,
      success: false,
      startTime,
      endTime: new Date(),
      duration: Date.now() - startTime.getTime(),
      commands,
      configGenerated,
      errors,
      warnings
    };
  }
  
  private generateDryRunResult(device: DeviceSpec): DeviceDeployResult {
    const generated = IOSGenerator.generate(device);
    
    return {
      deviceName: device.name,
      deviceType: device.type,
      success: true,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      commands: [],
      configGenerated: generated.lines.join('\n'),
      errors: [],
      warnings: ['Dry run - no changes made']
    };
  }
}
```

---

### Tarea 3.5: Deploy Orchestrator

**Archivo:** `src/core/executor/deploy.orchestrator.ts`

```typescript
// src/core/executor/deploy.orchestrator.ts

import type { LabSpec, DeviceSpec } from '../canonical';
import type { ConnectionCredentials, DeployOptions, DeployResult } from './types';
import { BatchExecutor } from './batch.executor';

export interface DeployPlan {
  /** Orden de despliegue por dependencias */
  order: string[][];
  
  /** Dispositivos que pueden desplegarse en paralelo */
  parallel: boolean;
  
  /** Dependencias entre dispositivos */
  dependencies: Map<string, string[]>;
}

export class DeployOrchestrator {
  private batchExecutor: BatchExecutor;
  private options: DeployOptions;
  
  constructor(options: Partial<DeployOptions> = {}) {
    this.options = {
      dryRun: false,
      concurrency: 5,
      commandTimeout: 30000,
      connectionTimeout: 30000,
      validateAfter: true,
      autoRollback: true,
      saveBackup: true,
      continueOnError: true,
      verbose: false,
      ...options
    };
    
    this.batchExecutor = new BatchExecutor(this.options);
  }
  
  /**
   * Despliega un laboratorio completo
   */
  async deployLab(
    lab: LabSpec,
    getCredentials: (device: DeviceSpec) => ConnectionCredentials | null
  ): Promise<DeployResult> {
    // 1. Crear plan de despliegue
    const plan = this.createDeployPlan(lab);
    
    // 2. Desplegar en orden
    const allResults: DeployResult[] = [];
    
    for (const batch of plan.order) {
      if (this.options.verbose) {
        console.log(`Deploying batch: ${batch.join(', ')}`);
      }
      
      const batchDevices = lab.devices.filter(d => batch.includes(d.name));
      const result = await this.batchExecutor.deployAll(batchDevices, getCredentials);
      allResults.push(result);
      
      // Si un batch falla y no debemos continuar
      if (!result.success && !this.options.continueOnError) {
        break;
      }
    }
    
    // 3. Agregar resultados
    return this.aggregateResults(allResults);
  }
  
  /**
   * Crea plan de despliegue basado en topología
   */
  private createDeployPlan(lab: LabSpec): DeployPlan {
    // Construir grafo de dependencias
    const dependencies = new Map<string, string[]>();
    
    // Inicializar
    for (const device of lab.devices) {
      dependencies.set(device.name, []);
    }
    
    // Añadir dependencias basadas en conexiones
    for (const conn of lab.connections) {
      // Los dispositivos downstream dependen de los upstream
      const from = conn.from.deviceName;
      const to = conn.to.deviceName;
      
      // Si es un router conectado a switch, el switch depende del router
      const fromDevice = lab.devices.find(d => d.name === from);
      const toDevice = lab.devices.find(d => d.name === to);
      
      if (fromDevice?.type === 'router' && toDevice?.type === 'switch') {
        dependencies.get(to)?.push(from);
      }
      
      if (toDevice?.type === 'router' && fromDevice?.type === 'switch') {
        dependencies.get(from)?.push(to);
      }
    }
    
    // Orden topológico
    const order = this.topologicalSort(dependencies);
    
    // Agrupar en batches paralelos
    const batches = this.groupByLevel(dependencies, order);
    
    return {
      order: batches,
      parallel: true,
      dependencies
    };
  }
  
  /**
   * Orden topológico
   */
  private topologicalSort(dependencies: Map<string, string[]>): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    
    const visit = (node: string) => {
      if (visited.has(node)) return;
      visited.add(node);
      
      for (const dep of dependencies.get(node) || []) {
        visit(dep);
      }
      
      result.push(node);
    };
    
    for (const node of dependencies.keys()) {
      visit(node);
    }
    
    return result;
  }
  
  /**
   * Agrupa nodos por nivel (para ejecución paralela)
   */
  private groupByLevel(
    dependencies: Map<string, string[]>,
    order: string[]
  ): string[][] {
    const levels = new Map<string, number>();
    
    // Calcular nivel de cada nodo
    for (const node of order) {
      const deps = dependencies.get(node) || [];
      const maxDepLevel = deps.length > 0 
        ? Math.max(...deps.map(d => levels.get(d) || 0))
        : -1;
      levels.set(node, maxDepLevel + 1);
    }
    
    // Agrupar por nivel
    const maxLevel = Math.max(...levels.values());
    const batches: string[][] = [];
    
    for (let level = 0; level <= maxLevel; level++) {
      const batch = Array.from(levels.entries())
        .filter(([, l]) => l === level)
        .map(([node]) => node);
      
      if (batch.length > 0) {
        batches.push(batch);
      }
    }
    
    return batches;
  }
  
  private aggregateResults(results: DeployResult[]): DeployResult {
    if (results.length === 1) {
      return results[0];
    }
    
    const startTime = results.reduce(
      (min, r) => r.startTime < min ? r.startTime : min,
      results[0].startTime
    );
    
    const endTime = results.reduce(
      (max, r) => r.endTime > max ? r.endTime : max,
      results[0].endTime
    );
    
    return {
      success: results.every(r => r.success),
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      devices: results.flatMap(r => r.devices),
      summary: {
        total: results.reduce((sum, r) => sum + r.summary.total, 0),
        successful: results.reduce((sum, r) => sum + r.summary.successful, 0),
        failed: results.reduce((sum, r) => sum + r.summary.failed, 0),
        skipped: results.reduce((sum, r) => sum + r.summary.skipped, 0)
      },
      globalErrors: results.flatMap(r => r.globalErrors)
    };
  }
}
```

---

### Tarea 3.6: Actualizar Comando Deploy

**Archivo:** `src/cli/commands/deploy.ts` (actualizar)

```typescript
// Actualizar src/cli/commands/deploy.ts

import { Command } from 'commander';
import { YamlAdapter } from '../../core/adapters/yaml.adapter';
import { DeployOrchestrator } from '../../core/executor/deploy.orchestrator';
import type { ConnectionCredentials } from '../../core/executor/types';
import type { DeviceSpec } from '../../core/canonical';

export function createDeployCommand(): Command {
  return new Command('deploy')
    .description('Deploy configurations to devices via SSH')
    .option('-f, --file <path>', 'Lab YAML file', 'lab.yaml')
    .option('--dry-run', 'Show commands without executing', false)
    .option('-c, --concurrency <n>', 'Max parallel connections', '5')
    .option('-t, --timeout <ms>', 'Command timeout in ms', '30000')
    .option('--validate', 'Validate after deployment', true)
    .option('--no-validate', 'Skip validation')
    .option('--no-rollback', 'Disable auto-rollback on error')
    .option('--backup-dir <dir>', 'Directory for config backups', './backups')
    .option('-v, --verbose', 'Verbose output', false)
    .option('--credentials <file>', 'JSON file with device credentials')
    .action(async (options) => {
      try {
        // Cargar lab
        const lab = YamlAdapter.loadFile(options.file);
        
        console.log(`Lab: ${lab.metadata.name}`);
        console.log(`Devices: ${lab.devices.length}`);
        
        // Cargar credenciales
        const credentialsMap = await loadCredentials(options.credentials);
        
        // Crear orchestrator
        const orchestrator = new DeployOrchestrator({
          dryRun: options.dryRun,
          concurrency: parseInt(options.concurrency),
          commandTimeout: parseInt(options.timeout),
          validateAfter: options.validate,
          autoRollback: options.rollback,
          saveBackup: !options.dryRun,
          backupDir: options.backupDir,
          continueOnError: true,
          verbose: options.verbose
        });
        
        // Función para obtener credenciales
        const getCredentials = (device: DeviceSpec): ConnectionCredentials | null => {
          const creds = credentialsMap.get(device.name);
          if (!creds) {
            console.warn(`No credentials found for ${device.name}`);
            return null;
          }
          
          return {
            host: device.management?.ip || creds.host,
            port: creds.port || 22,
            username: creds.username,
            password: creds.password,
            enablePassword: creds.enablePassword
          };
        };
        
        // Ejecutar despliegue
        console.log('\nStarting deployment...\n');
        const result = await orchestrator.deployLab(lab, getCredentials);
        
        // Mostrar resultados
        printResults(result);
        
        // Exit code
        process.exit(result.success ? 0 : 1);
        
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });
}

async function loadCredentials(filepath?: string): Promise<Map<string, any>> {
  const map = new Map();
  
  if (!filepath) {
    // Intentar leer de variables de entorno o archivo default
    return map;
  }
  
  const fs = await import('fs');
  const content = await fs.promises.readFile(filepath, 'utf-8');
  const creds = JSON.parse(content);
  
  for (const [device, config] of Object.entries(creds)) {
    map.set(device, config);
  }
  
  return map;
}

function printResults(result: DeployResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('DEPLOYMENT RESULTS');
  console.log('='.repeat(60));
  
  console.log(`\nDuration: ${(result.duration / 1000).toFixed(2)}s`);
  console.log(`Total: ${result.summary.total}`);
  console.log(`Successful: ${result.summary.successful}`);
  console.log(`Failed: ${result.summary.failed}`);
  console.log(`Skipped: ${result.summary.skipped}`);
  
  if (result.devices.length > 0) {
    console.log('\n--- Device Details ---\n');
    
    for (const device of result.devices) {
      const status = device.success ? '✅' : '❌';
      console.log(`${status} ${device.deviceName} (${device.deviceType})`);
      
      if (device.errors.length > 0) {
        for (const error of device.errors) {
          console.log(`   Error: ${error.message}`);
        }
      }
      
      if (device.warnings.length > 0) {
        for (const warning of device.warnings) {
          console.log(`   Warning: ${warning}`);
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
}
```

---

## Checklist de Completitud

### Executors
- [ ] SSH Executor funcional
- [ ] Telnet Executor funcional
- [ ] Validation Executor completo
- [ ] Batch Executor con paralelismo
- [ ] Rollback Executor

### Orchestrator
- [ ] Plan de despliegue topológico
- [ ] Ordenamiento por dependencias
- [ ] Ejecución por batches
- [ ] Agregación de resultados

### CLI
- [ ] Comando deploy actualizado
- [ ] Carga de credenciales
- [ ] Output formateado
- [ ] Exit codes correctos

### Tests
- [ ] Unit tests para SSH executor
- [ ] Unit tests para Validation
- [ ] Integration tests con mocks
- [ ] Tests de error handling

---

## Siguiente Fase

Una vez completada la Fase 3, proceder a [FASE-4-PKA-PKT.md](./FASE-4-PKA-PKT.md) para implementar import/export completo de archivos PKA/PKT.
