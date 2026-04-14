// ============================================================================
// Catálogo de Procesos de Packet Tracer
// Fuente única de verdad para nombres e interfaces de procesos PT
// ============================================================================

import type { PTDevice, PTPort } from "./pt-api-registry.js";

// ============================================================================
// Nombres de Procesos - Catálogo de nombres válidos por categoría
// ============================================================================

export const PT_PROCESS_NAMES = {
  server: {
    dhcp: ["DhcpServerMainProcess", "DHCPServerMainProcess", "DhcpServerMain"] as const,
    dns: ["DnsServerProcess"] as const,
    tftp: ["TftpServer"] as const,
    ntp: ["NtpServerProcess"] as const,
    ssh: ["SshServerProcess"] as const,
    radius: ["RadiusServerProcess"] as const,
    tacacs: ["TacacsServerProcess"] as const,
    syslog: ["SyslogServer"] as const,
    aaa: ["AcsServerProcess"] as const,
  },
  network: {
    vlan: ["VlanManager"] as const,
    routing: ["RoutingProcess"] as const,
    ospf: ["OspfProcess"] as const,
    stpMain: ["StpMainProcess"] as const,
    stp: ["StpProcess"] as const,
    acl: ["AclProcess"] as const,
    aclv6: ["Aclv6Process"] as const,
  },
  client: {
    radius: ["RadiusClientProcess"] as const,
    tacacs: ["TacacsClientProcess"] as const,
  },
} as const;

export type PTProcessCategory = keyof typeof PT_PROCESS_NAMES;
export type PTServerProcessName = keyof typeof PT_PROCESS_NAMES.server;
export type PTNetworkProcessName = keyof typeof PT_PROCESS_NAMES.network;
export type PTClientProcessName = keyof typeof PT_PROCESS_NAMES.client;

// ============================================================================
// Interfaces de Procesos
// ============================================================================

export interface PTDhcpLease {
  mac: string;
  ip: string;
  expires: string;
}

export interface PTDhcpPoolProcess {
  getPoolName(): string;
  getNetworkAddress(): string;
  getNetworkMask(): string;
  getDefaultRouter(): string;
  getDnsServerIp(): string;
  getStartIp(): string;
  getEndIp(): string;
  getMaxUsers(): number;
  setNetworkAddress(ip: string): void;
  setNetworkMask(mask: string): void;
  setDefaultRouter(router: string): void;
  setDnsServerIp(dns: string): void;
  setStartIp(ip: string): void;
  setEndIp(ip: string): void;
  setMaxUsers(count: number): void;
  getLeaseCount(): number;
  getLeaseAt(index: number): PTDhcpLease | null;
}

export interface PTDhcpServerProcess {
  setEnable(enabled: boolean): void;
  isEnabled(): boolean;
  addNewPool(name: string): PTDhcpPoolProcess | null;
  addPool(pool: PTDhcpPoolProcess): boolean;
  getPoolCount(): number;
  getPoolAt(index: number): PTDhcpPoolProcess | null;
  getPoolByName(name: string): PTDhcpPoolProcess | null;
  removePool(name: string): boolean;
  addExcludedAddress(start: string, end: string): void;
  getExcludedAddressCount(): number;
  getExcludedAddressAt(index: number): { start: string; end: string } | null;
}

export interface PTDhcpServerMainProcess {
  getDhcpServerProcessByPortName(portName: string): PTDhcpServerProcess | null;
  getDhcpServerProcessCount(): number;
}

export interface PTVlanInfo {
  id: number;
  name: string;
}

export interface PTVlanManager {
  addVlan(vlanId: number, name?: string): boolean;
  removeVlan(vlanId: number): boolean;
  getVlanCount(): number;
  getVlanAt(index: number): PTVlanInfo | null;
  addVlanInt(vlanId: number): boolean;
  getVlanInt(vlanId: number): PTPort | null;
}

export interface PTHostPort extends PTPort {
  isDhcpClientOn(): boolean;
  setDhcpClientFlag(enabled: boolean): void;
}

export interface PTDeviceWithProcesses extends PTDevice {
  getProcess<T = unknown>(name: string): T | null;
}

// ============================================================================
// Interfaces de Procesos - DNS / NTP / SSH / RADIUS / Syslog / OSPF / ACL / STP / Routing
// Status: verified-stubs — method signatures follow PT API conventions observed
// in DhcpServerProcess and VlanManager above. Expand as PT API surface is confirmed.
// ============================================================================

export interface PTDnsServerProcess {
  /** Retorna true si el servidor DNS está habilitado */
  isEnabled?(): boolean;
  /** Habilita o deshabilita el servidor DNS */
  setEnable?(enabled: boolean): void;
  /** Agrega una zona DNS */
  addZone?(name: string, zoneData: string): boolean;
  /** Elimina una zona DNS por nombre */
  removeZone?(name: string): boolean;
  /** Retorna el número de zonas configuradas */
  getZoneCount?(): number;
  /** Retorna la zona en el índice especificado */
  getZoneAt?(index: number): { name: string; data: string } | null;
}

export interface PTNtpServerProcess {
  /** Retorna true si NTP está habilitado */
  isEnabled?(): boolean;
  /** Habilita o deshabilita NTP */
  setEnable?(enabled: boolean): void;
  /** Retorna true si el servidor opera como maestro */
  getMasterMode?(): boolean;
  /** Configura el modo maestro */
  setMasterMode?(enabled: boolean): void;
  /** Retorna el número de servidores NTP configurados */
  getServerCount?(): number;
}

export interface PTSshServerProcess {
  /** Retorna true si SSH está habilitado */
  isEnabled?(): boolean;
  /** Habilita o deshabilita SSH */
  setEnable?(enabled: boolean): void;
  /** Retorna los métodos de autenticación disponibles */
  getAuthMethods?(): string[];
  /** Configura los métodos de autenticación */
  setAuthMethods?(methods: string[]): void;
}

export interface PTRadiusServerProcess {
  /** Retorna true si RADIUS está habilitado */
  isEnabled?(): boolean;
  /** Habilita o deshabilita RADIUS */
  setEnable?(enabled: boolean): void;
  /** Retorna el secreto compartido configurado */
  getSharedSecret?(): string;
  /** Configura el secreto compartido */
  setSharedSecret?(secret: string): void;
  /** Retorna el puerto de accounting */
  getAcctPort?(): number;
}

export interface PTSyslogServer {
  /** Retorna true si syslog está habilitado */
  isEnabled?(): boolean;
  /** Habilita o deshabilita syslog */
  setEnable?(enabled: boolean): void;
  /** Retorna el estado actual del logging */
  getLoggingState?(): string;
  /** Configura el estado de logging */
  setLoggingState?(state: string): void;
}

export interface PTOspfProcess {
  /** Retorna true si OSPF está habilitado */
  isEnabled?(): boolean;
  /** Retorna el ID del proceso OSPF */
  getProcessId?(): number;
  /** Retorna el número de áreas configuradas */
  getAreaCount?(): number;
  /** Retorna el número de redes configuradas */
  getNetworkCount?(): number;
}

export interface PTAclProcess {
  /** Retorna true si la ACL está habilitada */
  isEnabled?(): boolean;
  /** Retorna el tipo de ACL (standard/extended) */
  getAclType?(): string;
  /** Retorna el número de reglas configuradas */
  getRuleCount?(): number;
  /** Retorna la regla en el índice especificado */
  getRuleAt?(index: number): { action: string; source: string; destination: string } | null;
}

export interface PTStpProcess {
  /** Retorna true si STP está habilitado */
  isEnabled?(): boolean;
  /** Retorna el modo STP activo (pvst/rapid-pvst/mstp) */
  getMode?(): string;
  /** Retorna true si este puente es el root bridge */
  getRootBridge?(): boolean;
  /** Retorna el estado de un puerto STP */
  getPortState?(portName: string): string | null;
}

export interface PTRoutingProcess {
  /** Retorna true si el proceso de routing está habilitado */
  isEnabled?(): boolean;
  /** Retorna el protocolo de routing activo */
  getRoutingProtocol?(): string;
  /** Retorna el número de rutas en la tabla */
  getRouteCount?(): number;
}

// ============================================================================
// Helpers para Obtener Procesos
// ============================================================================

export interface PTProcessResult<T> {
  process: T | null;
  foundName: string | null;
}

function tryGetProcess<T>(device: PTDeviceWithProcesses, name: string): T | null {
  try {
    const proc = device.getProcess(name);
    return proc as T | null;
  } catch {
    return null;
  }
}

export function getProcessByName<T>(
  device: PTDeviceWithProcesses,
  name: string,
): PTProcessResult<T> {
  const proc = tryGetProcess<T>(device, name);
  return {
    process: proc,
    foundName: proc ? name : null,
  };
}

export function getProcessByCandidates<T>(
  device: PTDeviceWithProcesses,
  candidateNames: readonly string[],
): PTProcessResult<T> {
  for (const name of candidateNames) {
    const proc = tryGetProcess<T>(device, name);
    if (proc) {
      return { process: proc, foundName: name };
    }
  }
  return { process: null, foundName: null };
}

export function getDhcpServerMainProcess(
  device: PTDeviceWithProcesses,
): PTProcessResult<PTDhcpServerMainProcess> {
  return getProcessByCandidates(device, PT_PROCESS_NAMES.server.dhcp);
}

export function getVlanManager(device: PTDeviceWithProcesses): PTProcessResult<PTVlanManager> {
  return getProcessByCandidates(device, PT_PROCESS_NAMES.network.vlan);
}

// ============================================================================
// Verificación Defensiva de Métodos
// ============================================================================

export function ptHasMethod(obj: unknown, method: string): boolean {
  return obj !== null && typeof (obj as any)[method] === "function";
}

export function ptCall<T>(obj: unknown, method: string, ...args: unknown[]): T | null {
  if (!ptHasMethod(obj, method)) {
    return null;
  }
  try {
    return (obj as any)[method](...args);
  } catch {
    return null;
  }
}

export function ptSafeGet<T>(obj: unknown, getter: (o: any) => T | null | undefined): T | null {
  try {
    const result = getter(obj as any);
    return result ?? null;
  } catch {
    return null;
  }
}
