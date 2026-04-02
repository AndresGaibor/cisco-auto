/**
 * TIPOS PARA EL MOTOR DE DESPLIEGUE
 */
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
    duration: number;
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
    duration: number;
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
export declare enum DeployErrorCode {
    CONNECTION_FAILED = "CONNECTION_FAILED",
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
    COMMAND_FAILED = "COMMAND_FAILED",
    TIMEOUT = "TIMEOUT",
    CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
    VALIDATION_FAILED = "VALIDATION_FAILED",
    ROLLBACK_FAILED = "ROLLBACK_FAILED",
    UNKNOWN = "UNKNOWN"
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
    duration: number;
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
/**
 * Especificación de validación
 */
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
/**
 * Plan de despliegue
 */
export interface DeployPlan {
    /** Orden de despliegue por dependencias */
    order: string[][];
    /** Dispositivos que pueden desplegarse en paralelo */
    parallel: boolean;
    /** Dependencias entre dispositivos */
    dependencies: Map<string, string[]>;
}
//# sourceMappingURL=types.d.ts.map