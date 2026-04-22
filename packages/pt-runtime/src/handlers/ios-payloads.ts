// ============================================================================
// IOS Payloads - Interfaces type-safe para comandos IOS
// ============================================================================
// Usados por ios-execution.ts para ejecutar comandos en dispositivos PT.

/**
 * Payload para configurar un host (PC/Server) - IP estática o DHCP.
 */
export interface ConfigHostPayload {
  type: "configHost";
  device: string;
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  dhcp?: boolean;
}

/**
 * Payload para ejecutar múltiples comandos IOS de configuración.
 * Cada comando se ejecuta en secuencia en el dispositivo.
 * 
 * @example
 * {
 *   type: "configIos",
 *   device: "Router1",
 *   commands: [
 *     "interface GigabitEthernet0/0",
 *     "ip address 192.168.1.1 255.255.255.0",
 *     "no shutdown"
 *   ],
 *   save: true
 * }
 */
export interface ConfigIosPayload {
  type: "configIos";
  device: string;
  commands: string[];
  save?: boolean;
  stopOnError?: boolean;
  ensurePrivileged?: boolean;
  dismissInitialDialog?: boolean;
  commandTimeoutMs?: number;
  stallTimeoutMs?: number;
}

/**
 * Payload para ejecutar un comando IOS único.
 * El resultado se sanitiza y retorna como PtResult.
 */
export interface ExecIosPayload {
  type: "execIos";
  device: string;
  command: string;
  parse?: boolean;
  ensurePrivileged?: boolean;
  targetMode?: string;
  allowPager?: boolean;
  allowConfirm?: boolean;
  dismissInitialDialog?: boolean;
  commandTimeoutMs?: number;
  stallTimeoutMs?: number;
}

/**
 * Payload para hacer polling de un job IOS diferido.
 * Retorna el estado actual del job: done, deferred, o output.
 */
export interface PollDeferredPayload {
  type: "__pollDeferred";
  ticket: string;
}

/**
 * Payload para ejecutar un comando en un host (PC/Server).
 * A diferencia de IOS, los hosts tienen CLI más simple.
 */
export interface ExecPcPayload {
  type: "execPc";
  device: string;
  command: string;
  timeoutMs?: number;
}
