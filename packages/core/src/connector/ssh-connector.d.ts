/**
 * Módulo de conexión SSH para dispositivos Cisco
 * Usa node-ssh (wrapper de ssh2)
 */
import type { SSHExecCommandOptions, SSHExecCommandResponse } from 'node-ssh';
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
export declare class SSHConnectionError extends Error {
    readonly host: string;
    readonly attempt: number;
    constructor(message: string, host: string, attempt: number);
}
export declare class SSHCommandError extends Error {
    readonly command: string;
    readonly output: string;
    constructor(message: string, command: string, output: string);
}
export declare class SSHTimeoutError extends Error {
    readonly command: string;
    readonly timeoutMs: number;
    constructor(message: string, command: string, timeoutMs: number);
}
export declare class SSHConnector {
    private ssh;
    private device;
    private isConnected;
    private options;
    constructor(device: Device, options?: SSHConnectorOptions);
    /**
     * Conecta al dispositivo via SSH con retry logic
     */
    connect(): Promise<void>;
    /**
     * Resuelve variables de entorno en formato ${VAR_NAME}
     */
    private resolveEnvVar;
    /**
     * Helper para delay con Promise
     */
    private delay;
    /**
     * Ejecuta un comando en el dispositivo
     */
    execCommand(command: string, options?: SSHExecCommandOptions): Promise<SSHExecCommandResponse>;
    /**
     * Ejecuta múltiples comandos (configuración) con cleanup garantizado
     */
    execCommands(commands: string[], timeout?: number): Promise<ConnectionResult>;
    /**
     * Guarda la configuración en NVRAM
     */
    saveConfig(): Promise<ConnectionResult>;
    /**
     * Obtiene el estado de una interfaz
     */
    getInterfaceStatus(interfaceName: string): Promise<ConnectionResult>;
    /**
     * Verifica la tabla de enrutamiento
     */
    getRoutingTable(): Promise<ConnectionResult>;
    /**
     * Verifica VLANs configuradas
     */
    getVLANs(): Promise<ConnectionResult>;
    /**
     * Verifica vecinos OSPF
     */
    getOSPFNeighbors(): Promise<ConnectionResult>;
    /**
     * Cierra la conexión SSH
     */
    disconnect(): Promise<void>;
    /**
     * Verifica si hay conexión activa
     */
    isConnectedToDevice(): boolean;
    /**
     * Ejecuta una función con la conexión SSH, garantizando cleanup
     * Pattern: "using" / "try-with-resources"
     */
    static withConnection<T>(device: Device, fn: (connector: SSHConnector) => Promise<T>, options?: SSHConnectorOptions): Promise<T>;
}
/**
 * Ejecuta una función en múltiples dispositivos en paralelo
 */
export declare function executeInParallel<T>(devices: Device[], operation: (connector: SSHConnector) => Promise<T>, maxConcurrency?: number): Promise<Map<string, T | Error>>;
//# sourceMappingURL=ssh-connector.d.ts.map